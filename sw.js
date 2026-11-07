// Service Worker：オフライン表示とプッシュ通知の受信
const CACHE = "denken-room-v1";
const ASSETS = ["./", "index.html", "toc.js", "cloud.js", "firebase-config.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/favicon-64.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 自分のファイルはネット優先（更新をすぐ反映）、つながらないときはキャッシュ
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});

// プッシュ通知（サーバーは data だけを送り、表示はここで行う）
try {
  importScripts("firebase-config.js");
  const cfg = self.FIREBASE_CONFIG;
  if (cfg && cfg.apiKey && !String(cfg.apiKey).startsWith("YOUR_")) {
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
                  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
    firebase.initializeApp(cfg);
    firebase.messaging().onBackgroundMessage(p => {
      const d = p.data || {};
      return self.registration.showNotification(d.title || "ボルコ", {
        body: d.body || "", icon: "icons/icon-192.png", badge: "icons/favicon-64.png",
        tag: "denken-daily", renotify: true, data: { link: d.link || "./" },
      });
    });
  }
} catch (e) { /* 通知なしでも動く */ }

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow(link);
  }));
});
