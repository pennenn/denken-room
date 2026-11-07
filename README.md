# ボルコの電験ルーム

TAC 電験三種Webコースの予定・進捗・学習時間を、ドット絵のボルコと一緒に管理する学習アプリです。
スマホのホーム画面にボルコのアイコンで追加でき、PCとスマホで同期し、毎日決まった時刻に「今日の節」を通知します。

| ファイル | 役割 |
|---|---|
| `index.html` | アプリ本体 |
| `toc.js` | 教科書&問題集 第3版の目次（アプリと通知の両方で使う） |
| `cloud.js` / `firebase-config.js` | Firebase（ログイン・同期・通知の登録） |
| `sw.js` / `manifest.webmanifest` / `icons/` | ホーム画面アイコン・オフライン・通知の受信 |
| `scripts/notify.mjs` / `.github/workflows/notify.yml` | 毎日の通知を送る（GitHub Actions が30分ごとに実行） |
| `firestore.rules` | 自分のデータだけ読み書きできるようにするルール |

費用はすべて無料枠の範囲です（GitHub Pages・GitHub Actions・Firebase Spark プラン）。

---

## 設定手順

### 0. 今までのデータを書き出す
claude.ai の旧アプリ →「設定」→ いちばん下の「データを書き出す（JSON）」で `denken-data-日付.json` を保存しておきます。

### 1. GitHub に置いて公開する
1. github.com で新しいリポジトリを作る（名前の例：`denken-room`、**Public**、README などは追加しない）
2. PC で次を実行（`<ユーザー名>` は自分の GitHub ユーザー名）
   ```bash
   cd C:/Users/penen/Documents/denken-room
   git init -b main
   git add .
   git commit -m "ボルコの電験ルーム"
   git remote add origin https://github.com/<ユーザー名>/denken-room.git
   git push -u origin main
   ```
   初回はブラウザで GitHub へのログインを求められます。
3. リポジトリの **Settings → Pages** で「Source: Deploy from a branch」「Branch: main / (root)」にして Save
4. 数分後に `https://<ユーザー名>.github.io/denken-room/` で開けます（この時点では端末だけに保存するモード）

### 2. Firebase を用意する
[Firebase コンソール](https://console.firebase.google.com/) で：
1. **プロジェクトを追加**（名前の例：`denken-room`。Google アナリティクスはオフで可）
2. **プロジェクトの設定 → マイアプリ →「</>（ウェブ）」** でアプリを登録 → 表示された `firebaseConfig` の中身を `firebase-config.js` の `self.FIREBASE_CONFIG` に貼り付け
3. **Authentication → 始める → Sign-in method → Google** を有効にする
   - 同じ画面の **設定 → 承認済みドメイン** に `<ユーザー名>.github.io` を追加
4. **Firestore Database → データベースの作成**（本番環境モード、ロケーション `asia-northeast1（東京）`）
   - **ルール** タブに `firestore.rules` の中身を貼り付けて「公開」
5. **プロジェクトの設定 → Cloud Messaging → ウェブプッシュ証明書 →「鍵ペアを生成」** → 表示された鍵を `firebase-config.js` の `self.FCM_VAPID_KEY` に貼り付け
6. `firebase-config.js` を保存して、もう一度 push
   ```bash
   git add firebase-config.js
   git commit -m "Firebase の設定"
   git push
   ```

### 3. 通知を送るための鍵を GitHub に登録する
1. Firebase の **プロジェクトの設定 → サービス アカウント →「新しい秘密鍵の生成」** で JSON ファイルをダウンロード
2. GitHub のリポジトリ **Settings → Secrets and variables → Actions → New repository secret**
   - Name：`FIREBASE_SERVICE_ACCOUNT`
   - Secret：ダウンロードした JSON ファイルの中身を全部貼り付け
3. ダウンロードした JSON ファイルは**リポジトリに入れず**、登録が済んだら PC から削除してください（この鍵があるとデータベースを操作できます）

### 4. 使い始める
1. PC で `https://<ユーザー名>.github.io/denken-room/` を開き、**設定 →「Googleでログイン」**
2. **設定 → データを読み込む（JSON）** で手順0のファイルを選ぶ
3. Android の Chrome で同じURLを開き、同じ Google アカウントでログイン
4. Chrome のメニュー（︙）→ **「アプリをインストール」**（または「ホーム画面に追加」）→ ホーム画面にボルコのアイコン
5. ホーム画面のアプリを開き、**設定 →「この端末で通知を受け取る」** → 通知を許可 → 通知の時刻を選ぶ
6. 「テスト通知」でその場で通知が出るか確認

### 5. 通知の送信をテストする
GitHub のリポジトリ **Actions →「毎日の通知」→ Run workflow →「時刻に関係なく今すぐ送る」にチェック → Run**。
数十秒でスマホに通知が届けば完了です。以後は毎日、設定した時刻ごろ（GitHub の混雑で最大30分ほど遅れることがあります）に届きます。

---

## 注意
- **公開リポジトリ**なので、コードは誰でも見られます。個人のデータ（予定・記録・TACのURL）はコードには含まれず、Firestore に保存され、ログインした本人しか読めません。`firebase-config.js` の値は公開して問題ない情報です。
- GitHub は、リポジトリに **60日間更新がないと定期実行（通知）を止めます**。止まったときはメールが届くので、Actions 画面の「Enable workflow」を押してください。
- 予定を作り直すと、通知の内容も自動で新しい予定になります。
- 目次は『みんなが欲しかった！電験三種 ○○の教科書&問題集 第3版』（TAC出版）のものです。アプリ内の「節・ページを編集」で変更できます。
