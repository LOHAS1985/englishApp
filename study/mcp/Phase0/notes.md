# MCP Phase0 ノート

## 目的
- MCP（Model Context Protocol）の目的を短く説明できる
- JSON-RPC 2.0 のリクエスト／レスポンス構造を理解する
- `tools/list` と `tools/call` の役割と典型的なデータ構造を説明できる

## 要点
- MCPアーキテクチャ  
　1. MCPホスト：AIアプリケーション(Claude, Github Copilot等)で複数のMCPクライアントを管理  
　2. MCPクライアント：各MCPサーバーと専用接続を維持し、リクエスト/レスポンスを送受信するコンポーネント  
　3. MCPサーバー：ツール・リソース・プロンプト等の提供するプログラム  
　　3-1. ツール：実行可能な関数（ファイル操作、DBクエリ）  
　　3-2. リソース：参照可能なデータ（ファイル、DBレコード）  
　　3-3. プロンプト：再利用可能なプロンプトテンプレート  
- JSON-RPC 主要フィールド: `jsonrpc`（常に "2.0"）, `id`, `method`, `params`, `result`, `error`  
※JSON-RPC：リモートの関数やメソッドを呼び出すためのプロトコル  
　1. jsonprc：仕様バージョン  
　2. id：リクエストとレスポンスを対応付ける識別子  
　　※レスポンス不要の場合は省略可  
　3. method：呼び出す関数名  
　4. params：引数  
　5. result：正常応答時に返る値  
　6. error：失敗時に返すオブジェクト  
　　6-1. code：数値
　　6-2. message：文字列
　　6-3. data：追加情報  

JSON-RPC サンプル（名前付きパラメータ）

リクエスト（tools/call — ファイル読み取り）
```json
{
	"jsonrpc": "2.0",
	"id": 1,
	"method": "tools/call",
	"params": {
		"name": "read-file",
		"arguments": {
			"path": "migrations/V1__create_users_table.sql"
		}
	}
}
```

成功レスポンス
```json
{
	"jsonrpc": "2.0",
	"id": 1,
	"result": {
		"content": "CREATE TABLE ..."
	}
}
```

エラーレスポンス
```json
{
	"jsonrpc": "2.0",
	"id": 1,
	"error": {
		"code": -32602,
		"message": "Invalid params",
		"data": "missing field 'path'"
	}
}
```

通知（レスポンス不要）
```json
{
	"jsonrpc": "2.0",
	"method": "notifications/tools/list_changed",
	"params": {
		"...": "..."
	}
}
```

　HTTPリクエスト時のリクエストボディの形式
- `tools/list`: 利用可能なツールの一覧と定義（`name`, `description`, `inputSchema` など）を返す
- `tools/call`: 指定したツール名と引数でツールを実行する（`params` に `name` と `arguments`）
- ツール定義は JSON Schema を用いて入力検証ができると安全

通信モード短評
- stdio: 同一ホスト内のプロセス間通信。ローカルPoCで簡単、デバッグしやすい
- HTTP: ネットワーク経由の呼び出し。認証と暗号化が容易で運用向き
- SSE: 長時間処理やストリーミング返却に便利（逐次更新が必要な場合）  
※中身はHTTPだが、セッション開始時のHTTPリクエストに対する初回以降のレスポンスをストリームデータにすることで、常時接続している形になる。

セキュリティと運用上の注意（簡潔）
- 認証: MCPエンドポイント（やそれを叩くAPI）はJWTやAPIキーで保護する
- 入力検証: `inputSchema` をサーバー側でも厳格に検証する
- 監査: どのユーザーがどのツールをいつ使ったかログに残す
- レート制限とCircuit Breakerを用意して可用性を守る

Phase0 チェックリスト
- [ ] MCP の目的を1文で説明できる
- [ ] JSON-RPC の主要フィールドを説明できる
- [ ] `tools/list` と `tools/call` のサンプルを作成した
- [ ] stdio/HTTP/SSE の違いを3点言える

次の小タスク
- `examples` にあるサンプルJSONを使って手で request/response の流れを追う
- 準備ができたら Phase1（ローカルサーバ起動）へ進む

