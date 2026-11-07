// Firebase コンソール →「プロジェクトの設定」→「マイアプリ（ウェブアプリ）」の firebaseConfig をここに貼り付けます。
// この値は公開しても問題ない情報です（データはログインした本人しか読めないようにルールで守ります）。
self.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
// Firebase コンソール →「プロジェクトの設定」→「Cloud Messaging」→「ウェブプッシュ証明書」の鍵ペア
self.FCM_VAPID_KEY = "YOUR_VAPID_KEY";
