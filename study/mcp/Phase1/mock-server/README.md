# Mock MCP Server (ローカル動作確認用)

場所: [study/mcp/Phase1/mock-server](study/mcp/Phase1/mock-server)

手順（PowerShell）

```powershell
cd study\mcp\Phase1\mock-server
npm install
npm start
```

デフォルトポート: `3333`

動作確認: `tools/list`

```powershell
curl -X POST http://localhost:3333/ -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":null}"
```

動作確認: `tools/call` (echo)

```powershell
curl -X POST http://localhost:3333/ -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"echo\",\"arguments\":{\"text\":\"Hello MCP\"}}}"
```

備考
- 本モックは学習/PoC目的での最小実装です。本番には向きません。
- 実際のMCP実装ではSSEやstdioフレーミングが必要な場合があります。本モックはHTTP JSON-RPC のみを扱います。
