# English App - ファイル構成

## フロントエンド(frontend/src)

```
src/
│  App.tsx
│  index.css
│  main.tsx
│
├─api
│      client.ts
│
├─assets
│      hero.png / react.svg / vite.svg
│
├─context
│      AuthContext.tsx
│      AuthContextValue.ts
│      useAuth.ts
│
└─pages
        History.tsx
        Home.tsx
        Login.tsx
        Register.tsx
        Writing.tsx
```

| ファイル | 役割 |
|---|---|
| `App.tsx` | ルーティング定義(React Router)。`AuthProvider`で全体をラップし、各画面へのパスを割り当てる |
| `index.css` | Tailwind CSSの読み込み、グローバルなベーススタイル |
| `main.tsx` | Reactアプリのエントリーポイント。`App`をDOMにマウントする |
| `api/client.ts` | バックエンドAPIへのHTTPリクエストをまとめた関数群(出題・採点・履歴取得・認証など) |
| `context/AuthContextValue.ts` | 認証状態(`AuthContext`)の型定義とcontext本体の定義のみを持つファイル |
| `context/AuthContext.tsx` | `AuthProvider`コンポーネント。ログイン状態(トークン・ユーザー名)をlocalStorageと同期しつつ全体に供給する |
| `context/useAuth.ts` | `AuthContext`を簡単に呼び出すためのカスタムフック |
| `pages/Home.tsx` | ホーム画面。各機能画面への遷移メニュー |
| `pages/Login.tsx` | ログイン画面。認証成功時にトークンを`AuthContext`に保存し遷移 |
| `pages/Register.tsx` | 新規登録画面。登録成功時に自動ログイン状態にして遷移 |
| `pages/Writing.tsx` | ライティング問題画面。出題・回答入力・語数カウント・AI採点・結果表示 |
| `pages/History.tsx` | ログイン中ユーザーのライティング履歴一覧・詳細表示 |

## バックエンド(backend/src)

```
src/main/java/com/example/backend/
│  BackendApplication.java
│
├─config
│      CurrentUserProvider.java
│      JwtAuthenticationFilter.java
│      SecurityConfig.java
│
├─controller
│      AuthController.java
│      WritingController.java
│
├─dto
│      AuthResponse.java
│      LoginRequest.java
│      RegisterRequest.java
│      ScoreRequest.java
│      ScoreResult.java
│      WritingHistoryItem.java
│      WritingQuestion.java
│
├─entity
│      User.java
│      WritingRecord.java
│
├─repository
│      UserRepository.java
│      WritingRecordRepository.java
│
└─service
        AuthService.java
        GeminiService.java
        JwtService.java

src/main/resources/
│  application.properties
│
└─db/migration
        V1__create_users_table.sql
        V2__create_writing_records_table.sql
```

| ファイル | 役割 |
|---|---|
| `BackendApplication.java` | Spring Bootのエントリーポイント(mainメソッド) |
| `config/SecurityConfig.java` | Spring Securityの設定。CORS、CSRF無効化、ステートレスセッション、エンドポイントごとの認可ルール、JWTフィルタの組み込み |
| `config/JwtAuthenticationFilter.java` | リクエストの`Authorization`ヘッダーからJWTを検証し、ログイン中ユーザーとしてSecurityContextに設定するフィルタ |
| `config/CurrentUserProvider.java` | SecurityContextから現在ログイン中の`User`エンティティを取得するヘルパー |
| `controller/AuthController.java` | 認証API。`/api/auth/register`, `/api/auth/login` |
| `controller/WritingController.java` | ライティング機能API。`/api/writing/question`(出題), `/api/writing/score`(採点), `/api/writing/history`(履歴取得) |
| `dto/RegisterRequest.java` | 新規登録リクエストの受け取り用(username, password) |
| `dto/LoginRequest.java` | ログインリクエストの受け取り用(username, password) |
| `dto/AuthResponse.java` | 認証成功時のレスポンス(token, username) |
| `dto/WritingQuestion.java` | Geminiが生成した問題(prompt, topic, points)をフロントに返す形 |
| `dto/ScoreRequest.java` | 採点リクエストの受け取り用(topic, prompt, points, answer) |
| `dto/ScoreResult.java` | 採点結果(内容・構成・語彙・文法の4観点のスコア/フィードバックと合計点) |
| `dto/WritingHistoryItem.java` | 履歴一覧に返すデータ形。`WritingRecord`エンティティから変換して生成 |
| `entity/User.java` | `users`テーブルに対応。username、ハッシュ化済みパスワードを保持 |
| `entity/WritingRecord.java` | `writing_records`テーブルに対応。出題内容・回答・採点結果を1件ずつ保持 |
| `repository/UserRepository.java` | `User`のCRUD、username検索用のJPAリポジトリ |
| `repository/WritingRecordRepository.java` | `WritingRecord`のCRUD、ユーザーごとの履歴取得用のJPAリポジトリ |
| `service/AuthService.java` | 登録・ログインの実処理。パスワードのハッシュ化・照合、JWT発行 |
| `service/JwtService.java` | JWTの発行・検証・ユーザー名抽出を行うユーティリティ |
| `service/GeminiService.java` | Gemini APIへの問題生成・採点リクエスト、レスポンスのパース、採点結果のDB保存 |
| `application.properties` | DB接続情報、JPA/Flyway設定、Gemini APIキー、JWT設定などの環境設定 |
| `db/migration/V1__create_users_table.sql` | `users`テーブル作成用Flywayマイグレーション |
| `db/migration/V2__create_writing_records_table.sql` | `writing_records`テーブル作成用Flywayマイグレーション |

## データの流れ(認証込み)

```
[未ログイン]
Home → Writing(出題のみ可) → 採点ボタン押下 → 未ログインなら /login へ誘導

[ログインフロー]
Register/Login → AuthController → AuthService
  → User検索/作成、パスワード照合、JwtService でトークン発行
  → フロントの AuthContext(localStorage)にトークン保存

[採点フロー(ログイン後)]
Writing → api/client.ts(Authorizationヘッダー付き)
  → WritingController → GeminiService
    → Gemini APIで採点 → WritingRecord として保存(CurrentUserProviderでuser_id紐付け)
  → 結果をフロントに返却

[履歴フロー]
History → api/client.ts(Authorizationヘッダー付き)
  → WritingController.getHistory → WritingRecordRepository
  → ログイン中ユーザーの履歴一覧を返却
```
