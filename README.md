# 流星掃射 -ARENA- (Socket.io リアルタイム対戦版)

Node.js + Express + Socket.io によるサーバー権威型のオンライン対戦シューティングです。
位置同期は約30Hz、射撃判定はサーバー側で即時に行うため、ほぼ遅延なく撃ち合いできます。

## フォルダ構成
```
socketio-arena/
├── server.js       ← サーバー本体(Express + Socket.io)
├── package.json
└── public/
    └── index.html  ← ゲーム本体(ブラウザで動くクライアント)
```

## デプロイ方法(どれか1つでOK・すべて無料枠あり)

### 方法A: Glitch(一番簡単・ブラウザだけで完結)
1. https://glitch.com にアクセスしてログイン(GitHubアカウント等でOK)
2. 「New Project」→「Import from GitHub」を使わない場合は「glitch-hello-node」などNodeテンプレートを新規作成
3. 左側のファイル一覧で `server.js` `package.json` を作成し、このプロジェクトの中身をそれぞれ貼り付け
4. `public` フォルダを作成し、その中に `index.html` を作成してこのプロジェクトの `public/index.html` の中身を貼り付け
5. 自動的にビルド&起動されます。画面上部の「Share」→表示されるURL(例: `https://xxxx.glitch.me`)が対戦URLです
6. そのURLを友達に共有すればOK

### 方法B: Render(無料のWeb Service)
1. https://render.com でアカウント作成
2. このフォルダをGitHubリポジトリにpush(またはRenderのダッシュボードから直接zipをアップロード)
3. 「New +」→「Web Service」→リポジトリを選択
4. Build Command: `npm install`
5. Start Command: `npm start`
6. デプロイ完了後に発行されるURL(例: `https://xxxx.onrender.com`)が対戦URLです
   ※無料プランは一定時間アクセスがないとスリープするので、久しぶりに開くと初回接続に10〜30秒ほどかかることがあります

### 方法C: Railway
1. https://railway.app でアカウント作成
2. 「New Project」→「Deploy from GitHub repo」でこのフォルダをpushしたリポジトリを選択
3. 自動でNode.jsと認識され、`npm install` → `npm start` が実行されます
4. 発行されたURLが対戦URLです

## ローカルで動作確認したい場合
Node.jsがインストールされた環境で:
```bash
cd socketio-arena
npm install
npm start
```
`http://localhost:3000` にブラウザでアクセスすると起動します。同じWi-Fi内の友達のスマホからは、
自分のPCのローカルIP(例: `http://192.168.1.10:3000`)でアクセスすると一緒に遊べます。

## 遊び方
- 起動したURLを開き、名前・機体カラー・ルームコードを入力して「ENTER ARENA」
- 同じルームコードを入力した人同士が同じ戦場に入ります(空欄なら"default"部屋)
- PC: WASD移動・マウス照準・クリックまたはスペースで射撃
- スマホ: 画面左半分ドラッグ=移動、右半分ドラッグ=照準+射撃
- HP0で撃破→3秒後に自動リスポーン。🏆SCOREボタンでキル/デス確認

## サーバー側の仕組み(カスタマイズしたい場合)
- `server.js` 内の `OBSTACLES` / `WORLD` を変更すればマップの広さや障害物を調整できます
- ダメージ量は `target.hp -= 20;` の数値、射程は `const range = 620;` で調整できます
- リスポーン時間は `setTimeout(..., 3000)` の3000(ミリ秒)を変更してください
- ルーム機能があるので、同じサーバーを複数の友達グループで同時に使い回せます(ルームコードを変えるだけ)
