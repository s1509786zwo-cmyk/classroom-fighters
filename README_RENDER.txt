教室ファイターズ オンライン対戦 - Render公開用

このフォルダはRenderのWeb Serviceで公開するための完成済みファイルです。
Node.jsはあなたのPC側で起動し続ける必要はありません。

Render設定:
- Runtime: Node
- Build Command: npm install
- Start Command: npm start
- Health Check Path: /health
- FreeプランでOK（テスト・友達との対戦向け）

公開後は https://xxxxx.onrender.com のURLを友達に送ります。

注意:
Freeプランでは15分間アクセスがないとサービスが停止し、次のアクセス時に起動に時間がかかる場合があります。
また、このゲームの対戦室はメモリ上に保持する試作方式なので、サーバー再起動時には部屋が消えます。
