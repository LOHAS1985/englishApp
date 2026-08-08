# Phase1 — ローカルで公式MCPサーバーを立てる

目的: ローカル環境で MCP 公式サンプル（または互換サーバ）を起動し、`tools/list` と `tools/call` を手動で実行して挙動を確認する。

前提
- Node.js 18+ がインストールされていること
- `git` が使えること

ざっくり手順
1. 公式サンプルをクローンする（以下はプレースホルダ）

```powershell
git clone <MCP_SAMPLE_REPO_URL> mcp-sample
cd mcp-sample
npm install
npm start
```

2. サーバが立ち上がったら `tools/list` を叩いて利用可能なツール一覧を取得する

（例）curl での確認:

```powershell
curl -X POST http://localhost:PORT/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":null}'
```

3. `tools/call` で簡単なツールを実行してレスポンスを確認する

（例: echo ツール）
```powershell
curl -X POST http://localhost:PORT/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echo","arguments":{"text":"Hello MCP"}}}'
```

例：リクエスト/レスポンス（参考）

リクエスト（tools/call）
```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echo","arguments":{"text":"Hello MCP"}}}
```

成功レスポンス（例）
```json
{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"Hello MCP"}]}}
```

トラブルシュート（簡易）
- サーバが起動しない: Node.js のバージョン確認 `node -v`
- ポートが違う: サンプルの README や環境変数を確認
- CORS や認証がある場合: curl に適切なヘッダを追加

次の作業候補
- 公式サンプルの具体的なリポジトリURLを指定して実際にクローンする（ユーザーの環境で実行）
- `backend` に `McpClient` / `McpController` の雛形を追加して、HTTP 経由でこのローカルサーバにプロキシする
