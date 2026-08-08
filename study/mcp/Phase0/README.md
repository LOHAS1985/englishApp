# Phase 0 - MCP基礎: 進め方

目的
- MCPの目的（Model Context Protocol）を理解する
- JSON-RPCメッセージ構造と主要メソッド（`tools/list`, `tools/call`）を把握する
- stdio/HTTP/SSE の違いと実装上の注意を説明できるようにする

所要時間の目安: 60〜90分

手順（順序・時間・成果物）

1) 準備（5分）
- ワークスペースで `study/mcp/Phase0` フォルダを開く
- 成果物: このフォルダにファイルを置く

2) 公式概要とJSON-RPC速読（15〜20分）
- 読む: MCP概要（公式）と JSON-RPC 2.0 スペックの要点
- 成果物: `notes.md` に要点2〜4行を記載

3) 主要メソッドの理解（10〜15分）
- `tools/list` と `tools/call` のリクエスト/レスポンス例を作る
- 成果物: `examples/tools-list.json`, `examples/tools-call.json` を作成

4) 通信モード比較（10分）
- stdio / HTTP / SSE の長所短所を短くまとめる
- 成果物: `notes.md` に短い箇条書き

5) セキュリティ・設計注意点（10分）
- 認証、入力検証、監査ログの方針を1段落でまとめる
- 成果物: `notes.md` に短文

6) ミニ演習: レスポンス例作成（10〜15分）
- `examples/tools-call-response.json` を作成（期待レスポンス）

7) 自己チェック（5〜10分）
- 次の問いに答えられるか確認する: MCPの目的、JSON-RPC必須フィールド、`tools/list` と `tools/call` の違い、stdioとHTTPの差

ファイル構成（Phase0内に作る推奨ファイル）
- `c:/Users/ichik/Documents/code/englishApp/study/mcp/Phase0/notes.md` — 要点・チェックリスト
- `c:/Users/ichik/Documents/code/englishApp/study/mcp/Phase0/examples/tools-list.json` — サンプル request
- `c:/Users/ichik/Documents/code/englishApp/study/mcp/Phase0/examples/tools-call.json` — サンプル request
- `c:/Users/ichik/Documents/code/englishApp/study/mcp/Phase0/examples/tools-call-response.json` — 期待レスポンス

スニペット（コマンド例）
PowerShell (workspaceルートで実行):
```powershell
New-Item -ItemType Directory -Force -Path study\mcp\Phase0\examples
@'\
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":null}
'@ > study\mcp\Phase0\examples\tools-list.json
@'\
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echo","arguments":{"text":"Hello MCP"}}}
'@ > study\mcp\Phase0\examples\tools-call.json
@'\
{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"Hello MCP"}]}}
'@ > study\mcp\Phase0\examples\tools-call-response.json
```

検証基準（このフェーズ完了の判断）
- MCPの目的を1文で説明できる
- JSON-RPC主要フィールドを説明できる
- `tools/list` と `tools/call` のサンプルを作成済み
- stdio/HTTP/SSE の違いを3点挙げられる

次のステップ
- Phase1（ローカルMCPサーバの起動）へ進む。準備ができたら指示してください。
