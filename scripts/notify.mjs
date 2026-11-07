// 毎日の通知を送る（GitHub Actions から30分ごとに実行）
// 各ユーザーの設定時刻（日本時間）を過ぎていて、今日まだ送っていなければ、その日までの節をプッシュ通知する
import { createRequire } from "node:module";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const require = createRequire(import.meta.url);
const TOC = require("../toc.js");
const FORCE = process.env.FORCE === "true";
const WINDOW_MIN = 180; // 設定時刻から3時間以内なら送る（Actions の遅れ対策）

const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!sa) { console.error("FIREBASE_SERVICE_ACCOUNT が設定されていません"); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(sa)) });
const db = getFirestore();
const messaging = getMessaging();

const [owner, repo] = (process.env.GITHUB_REPOSITORY || "/").split("/");
const APP_URL = process.env.APP_URL || `https://${owner.toLowerCase()}.github.io/${repo}/`;

// 日本時間の今日の日付と分
const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
  .formatToParts(new Date()).map(p => [p.type, p.value]));
const today = `${parts.year}-${parts.month}-${parts.day}`;
const nowMin = (+parts.hour) * 60 + (+parts.minute);

const pad2 = n => String(n).padStart(2, "0");
const chCode = i => "CH" + pad2(i + 1);
const secCode = j => pad2(j + 1);

function dueItems(state) {
  const out = [];
  for (const s of TOC) {
    const p = state.progress?.[s.key]; if (!p) continue;
    s.ch.forEach(([name, secs], i) => {
      const c = p.ch?.[chCode(i)]; if (!c || c.done) return;
      const ov = state.toc?.[s.key]?.[chCode(i)];
      const list = Array.isArray(ov) && ov.length ? ov.map(x => x.t) : secs;
      let allSec = true;
      list.forEach((t, j) => {
        const sp = c.sec?.[secCode(j)] || {};
        if (sp.b && sp.q) return; allSec = false;
        if (sp.plan && sp.plan <= today) out.push(`${s.name} ${chCode(i)}-${secCode(j)} ${t}`);
      });
      if (allSec && c.plan && c.plan <= today) out.push(`${s.name} ${chCode(i)} しあげ（ミニテスト・総まとめ動画）`);
    });
    if (!p.test?.done && p.test?.plan && p.test.plan <= today) out.push(`${s.name} 実力テスト`);
  }
  return out;
}
function message(state) {
  const d = dueItems(state);
  const ex = state.settings?.examDate;
  const days = ex ? Math.round((Date.parse(ex) - Date.parse(today)) / 86400000) : null;
  const tail = days !== null && days >= 0 ? `（試験まであと${days}日）` : "";
  return d.length
    ? { title: "ボルコ「今日の電験だよ！」", body: `今日までの予定 ${d.length}件：${d[0]}${d.length > 1 ? ` ほか${d.length - 1}件` : ""}${tail}` }
    : { title: "ボルコ「今日もちょっとだけやろ？」", body: `今日までの予定はクリア済み！15分だけ復習しよう。${tail}` };
}

const users = await db.collection("users").get();
let sent = 0;
for (const doc of users.docs) {
  const data = doc.data(); const state = data.state; if (!state) continue;
  const n = state.settings?.notify;
  if (!n?.on && !FORCE) continue;
  if (data.lastSent === today && !FORCE) continue;
  const [hh, mm] = String(n?.time || "20:00").split(":").map(Number);
  const target = hh * 60 + mm;
  if (!FORCE && !(nowMin >= target && nowMin < target + WINDOW_MIN)) continue;

  const tokSnap = await doc.ref.collection("tokens").get();
  const tokens = tokSnap.docs.map(t => t.id);
  if (!tokens.length) { console.log(doc.id, "端末の登録がありません"); continue; }
  const m = message(state);
  const res = await messaging.sendEachForMulticast({
    tokens,
    data: { title: m.title, body: m.body, link: APP_URL },
    webpush: { headers: { Urgency: "high", TTL: "43200" }, fcmOptions: { link: APP_URL } },
  });
  // 使えなくなった端末の登録を消す
  await Promise.all(res.responses.map((r, i) => {
    const code = r.error?.code || "";
    if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token") || code.includes("invalid-argument"))
      return doc.ref.collection("tokens").doc(tokens[i]).delete();
  }));
  console.log(doc.id, `送信 ${res.successCount}/${tokens.length}`, m.body);
  if (res.successCount) { await doc.ref.update({ lastSent: today }); sent++; }
}
console.log(`完了：${sent}人に送信（日本時間 ${today} ${pad2(parts.hour)}:${pad2(parts.minute)}）`);
