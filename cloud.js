// Firebase との接続（ログイン・同期・プッシュ通知の登録）
// firebase-config.js が未設定のときは null を返し、アプリは端末だけで動く
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

const cfg = self.FIREBASE_CONFIG;
const configured = cfg && cfg.apiKey && !String(cfg.apiKey).startsWith("YOUR_");

if (!configured) {
  window.__cloudResolve(null);
} else {
  try {
    const app = initializeApp(cfg);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();
    let messaging = null;
    const pushOk = (async () => {
      try { if (await isSupported()) { messaging = getMessaging(app); return true; } } catch (e) {}
      return false;
    })();

    pushOk.then(ok => {
      if (!ok) return;
      // アプリを開いている間に届いた通知も表示する
      onMessage(messaging, async p => {
        const d = p.data || {};
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(d.title || "ボルコ", { body: d.body || "", icon: "icons/icon-192.png", badge: "icons/favicon-64.png", data: { link: d.link || "./" } });
      });
    });

    const api = {
      onUser(cb) {
        return onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, name: u.displayName || "", email: u.email || "" } : null));
      },
      async signIn() {
        try { await signInWithPopup(auth, provider); }
        catch (e) {
          if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) await signInWithRedirect(auth, provider);
          else throw e;
        }
      },
      signOut() { return signOut(auth); },
      subscribe(uid, next, error) {
        return onSnapshot(doc(db, "users", uid), { includeMetadataChanges: true }, s => {
          const data = s.data() || {};
          next({ exists: s.exists() && !!data.state, state: data.state || null, fromCache: s.metadata.fromCache, pending: s.metadata.hasPendingWrites });
        }, error);
      },
      async save(uid, state) {
        const ref = doc(db, "users", uid);
        const data = { state, rev: state.rev || 0, updatedAt: serverTimestamp() };
        try { await updateDoc(ref, data); }
        catch (e) { if (e && e.code === "not-found") await setDoc(ref, data, { merge: true }); else throw e; }
      },
      pushSupported() { return pushOk; },
      async enablePush(uid) {
        if (!(await pushOk)) throw { code: "unsupported" };
        const perm = await Notification.requestPermission();
        if (perm !== "granted") throw { code: "denied" };
        const reg = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, { vapidKey: self.FCM_VAPID_KEY, serviceWorkerRegistration: reg });
        if (!token) throw { code: "no-token" };
        await setDoc(doc(db, "users", uid, "tokens", token), { token, ua: navigator.userAgent.slice(0, 200), at: serverTimestamp() });
        return token;
      },
      async disablePush(uid, token) {
        if (token) await deleteDoc(doc(db, "users", uid, "tokens", token));
      },
    };
    window.__cloudResolve(api);
  } catch (e) {
    console.error(e);
    window.__cloudResolve(null);
  }
}
