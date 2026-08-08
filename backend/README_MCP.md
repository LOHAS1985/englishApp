# Backend — MCP 接続とテスト

このファイルは `McpClient` / `McpController` を使ってローカルモックまたは外部MCPに接続するための最小手順です。

1. 設定
- `backend/src/main/resources/application.properties` の `mcp.base-url` を設定（例: `http://localhost:3333/`）
- 必要なら `mcp.api-key` に外部MCP の API キーを設定

2. バックエンド起動（Maven）

```powershell
cd backend
mvn spring-boot:run
```

3. 動作確認（ローカルバックエンド経由で mock-server を叩く）

- ツール一覧取得:
```powershell
Invoke-RestMethod -Uri 'http://localhost:8080/api/mcp/list' -Method Get
```

- ツール実行 (echo):
```powershell
Invoke-RestMethod -Uri 'http://localhost:8080/api/mcp/call' -Method Post -Headers @{ 'Content-Type' = 'application/json' } -Body '{"name":"echo","arguments":{"text":"Hello from backend"}}'
```

4. セキュリティ
- `McpController` は現状認証処理を行いません。本番では `SecurityConfig` に `/api/mcp/**` の保護を追加してください（JWT や API キーによる検証を推奨）。

5. APIキーによる保護（簡易）
- `application.properties` に `mcp.backend-api-key` を設定すると、`/api/mcp/**` へのリクエストは `X-API-KEY` ヘッダに同じ値が含まれている必要があります。
- フロントエンドでは `VITE_MCP_API_KEY` を `.env` に設定し、`frontend` の `callMcpTool` / `listMcpTools` を使うと自動でヘッダを付けます。

