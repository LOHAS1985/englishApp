# CLAUDE.md — englishApp 開発指針

このファイルは englishApp の開発方針を統一するためのもの。機能追加・修正の前に必ず目を通し、方針と矛盾する変更をする場合は先にこのファイルを更新する。

## 1. プロダクトのゴール

**リスニング・リーディング・スピーキング・ライティングの4技能を1つのアプリで網羅的に学習できること。**

| 目標試験 | 目標 | 主に鍛える技能 |
| --- | --- | --- |
| TOEIC L&R | **930点**(目安: L 475 / R 455) | リスニング、リーディング、語彙、文法 |
| 英検準1級 | **一次・二次とも合格** | 4技能すべて(特にライティング・スピーキング) |

### 利用者と前提条件

| 項目 | 内容 |
| --- | --- |
| 利用者 | 開発者本人のみ(一般公開しない) |
| 現在のレベル | TOEIC L&R 700点台、英検は未受験 |
| 期限 | 今年度中(2027年3月末まで)に両目標を達成 |
| 学習時間 | 1日30分程度(期限まで合計約75時間) |
| 学習方針 | 4技能をまんべんなく学習する(特定技能に偏らせない) |
| 運用コスト | 無料枠のみで運用する |
| 対象外 | TOEIC S&W |

700点台から930点・準1級までを短い学習時間で目指すため、**「1日30分で4技能をバランスよく回せること」と「弱点に時間を集中できること」**を最重要の設計要件とする。

機能の優先度を判断するときは「この機能は TOEIC 930 / 英検準1級のどのパート・どの観点のスコアに効くか」を説明できることを条件とする。説明できない機能は後回しにする。

### 試験形式と対応機能(マッピング)

| 試験 | パート | アプリ側の機能 | 状態 |
| --- | --- | --- | --- |
| TOEIC | Part 1(写真描写) | — | 未対応(写真を用意できないため) |
| TOEIC | Part 2(応答問題) | Listening(`toeic-part2`) | **対応済**(5問1セット。問いかけ・選択肢とも音声のみ。台本は設問から自動で組み立てる) |
| TOEIC | Part 3・4(会話・説明文) | Listening(`questions/listening`) | **対応済**(問題集+音声生成、米国英語の音声のみ) |
| TOEIC | Part 5(短文穴埋め) | Grammar(`questions/grammar`) | **対応済** |
| TOEIC | Part 6(長文穴埋め) | Reading 読解問題(`questions/reading`, `toeic-part6`) | **対応済** |
| TOEIC | Part 7(読解) | Reading 読解問題(`toeic-part7`) | **対応済**(単一文書。複数文書は未対応) |
| 英検準1級 | 一次 大問1 語彙 | Vocab(`questions/vocab`) | **対応済**(間違えた語の復習は未対応) |
| 英検準1級 | 一次 大問2・3 長文 | Reading 読解問題(`eiken-cloze`, `eiken-long`) | **対応済** |
| 英検準1級 | 一次 ライティング(意見論述 120–150語) | Writing(`questions/writing`, `opinion`) | **対応済**(Gemini で4観点16点満点採点) |
| 英検準1級 | 一次 ライティング(要約 60–70語) | Writing(`summary`) | **対応済**(Gemini で4観点16点満点採点) |
| 英検準1級 | 一次 リスニング Part 1〜3 | Listening(`eiken-part1`〜`eiken-part3`) | **対応済** |
| 英検準1級 | 二次 面接(ナレーション・Q&A) | Speaking(`questions/speaking`) | 出題・録音・模範解答あり。4コマは文章で代用。AI 採点は未対応 |

新機能を追加したら、この表の「状態」を更新すること。

## 2. 学習設計の原則

- **1回の学習は5〜10分で完結させる**: どの機能も1セット5〜10分で終わる単位で出題し、30分で複数技能を回せるようにする。途中でやめても記録が残るようにする。
- **4技能を均等に回す**: 技能ごとの学習時間・回数を記録し、少ない技能を優先して出す。
- **アウトプットには必ずフィードバックを返す**: ライティング・スピーキングは AI 採点+改善点+模範解答をセットで返す。採点観点は試験の公式観点に合わせる(英検ライティング: 内容・構成・語彙・文法 各4点)。
- **学習記録はすべて保存する**: 解答は `*Record` エンティティとして保存し、MyPage で振り返れるようにする。正誤・スコア・所要時間・日時を最低限持つ。
- **弱点の可視化と復習**: 間違えた問題・知らなかった単語は後から復習できる形で残す(将来的に間隔反復)。
- **出題順**: `QuestionSelector` / `QuestionPicker` が解答記録から選ぶ。一巡するまで重複なし、最後に間違えた問題を約3割の確率で出し直す、直近5問と表示中の問題(`exclude`)は出さない。選択肢の並びは画面側で毎回シャッフルし、採点には元の記号を送る。
- **試験と同じ制約で練習できる**: 語数カウント、制限時間、音声の再生回数制限など、本番と同じ条件を選べるようにする。
- **ホームは試験→パートの2段階**: まず TOEIC / 英検準1級を選び、次にパートを選ぶ(`shared/exams.ts` の `EXAM_MENUS`)。問題画面は `?type=` で形式を受け取り、同じ試験の形式だけを切り替え候補に出す。
- **ログインは設けない**: 利用者は本人1人だけなので、全 API をログインなしで使える。記録はすべて `CurrentUserProvider` が返す owner ユーザーに保存する(初回アクセス時に自動作成)。
- **アクセスログ**: `/api/**` へのアクセスを `access_logs` に保存し(IP・端末・ip-api.com で推定した地域、90日で削除)、マイページで確認する。IP を含むので閲覧 API は `ACCESS_LOG_KEY` と一致するヘッダー `X-Access-Log-Key` が必須。週1回 `weekly-access-report.yml` が Gmail で自分宛てに送る。**IP を含むログを公開リポジトリにコミットしない**(Actions の実行ログにも出さない)。

## 3. 技術スタック

詳細は [techStack.md](techStack.md)。要点のみ:

- **モノレポ**: `frontend/`(React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router 7)、`backend/`(Java 25 + Spring Boot 4 + Maven Wrapper)
- **DB**: プロファイルで切り替える。`dev`(既定): H2 インメモリ + `ddl-auto=update` + Flyway 無効 / `prod`: `SPRING_DATASOURCE_URL` の DB + Flyway でスキーマ管理(`ddl-auto=none`)
- **認証**: なし(Spring Security は CORS 設定のためだけに使い、全リクエストを許可)
- **AI**: Google Gemini(Spring AI `spring-ai-starter-model-google-genai`、モデル `gemini-2.5-flash`)
- **外部API**: Guardian(記事)、DeepL(翻訳)、Wordnik(辞書)
- **TTS**: `backend/tts/generate_tts.py`(edge-tts)+ ffmpeg。失敗時はブラウザの `speechSynthesis` にフォールバック
- **デプロイ**: frontend → GitHub Pages(GitHub Actions)、backend → Render(Docker、push で自動デプロイ)

**運用は無料枠のみ。** 新しいライブラリ・外部サービスを導入する場合は、無料で使えることを確認し、techStack.md に追記する。有料プランが必要なサービスは導入しない(音声認識はブラウザの Web Speech API など、無料の手段を先に検討する)。

利用者は本人のみなので、マルチユーザー向けの作り込み(利用規約、細かい権限管理、スケーリング)はしない。ただしアプリは公開 URL で動くため、認証と秘密情報の管理は手を抜かない。

## 4. ディレクトリ構成と配置ルール

**機能(技能)単位でパッケージ/フォルダを切る(package-by-feature)。** レイヤー単位(controller/ service/ ...)のトップレベルフォルダは作らない。

```
backend/src/main/java/com/example/backend/
├── config/      Security, CORS, フィルタなど横断設定
├── user/        User エンティティ
├── writing/     ライティング
├── reading/     リーディング
├── listening/   リスニング
├── speaking/    スピーキング
├── grammar/     文法
└── vocab/       語彙・管理画面API

frontend/src/
├── api/             バックエンド呼び出し(client.ts, audio.ts)
├── features/<技能>/  技能ごとの画面・コンポーネント・ロジック
├── pages/           機能横断の画面(Home, MyPage, Admin)
└── shared/          共通コンポーネント・context
```

- 新しい技能・機能は `backend/.../<feature>/` と `frontend/src/features/<feature>/` をペアで作る。
- backend の各機能パッケージは `XxxController` / `XxxService` / `XxxRecord`(エンティティ)/ `XxxRecordRepository` / `dto/` の構成に揃える。
- 外部API呼び出しは `XxxApiClient` に分離し、Controller から直接 HTTP を叩かない。
- Controller は薄く保つ(入力受け取り・レスポンス整形のみ)。プロンプト組み立て・パース・保存は Service に置く(例: `ListeningService` / `TtsService`)。
- **出題する問題は、リポジトリ内の問題集(`backend/src/main/resources/questions/<機能>/*.json`)に置くのを基本とする。** 実行時に AI で生成しない(出題が遅い・無料枠を消費する・再起動で消えるため)。AI をその場で使うのは、ライティング採点のように答えが毎回異なるものに限る。
- 問題集を追加したら、形式チェックのテスト(例: `GrammarQuestionBankTests`)も用意し、ID の重複・選択肢数・正解記号の偏りを CI で検出する。
- API パスは `/api/<feature>/...`。履歴取得は `GET /api/<feature>/history` に統一する。

## 5. コーディング規約

### 共通
- 既存コードの命名・書き方に合わせる。コメントは「なぜ」を書く(日本語可)。
- 秘密情報(APIキー、DBパスワード)はコード・properties にハードコードしない。必ず `${ENV_VAR}` 経由。
- デバッグ用の一時的な緩和(例: `/api/admin/**` の permitAll、`show-sql`、Security の DEBUG ログ)は、入れたら同じ作業の中で戻す。残す場合は `TODO(security):` を付ける。

### Backend (Java / Spring Boot)
- DTO は `record` を基本とする。エンティティを直接レスポンスに返さない。
- 依存注入はコンストラクタインジェクション。
- **DBスキーマ変更は必ず Flyway マイグレーションを追加する**(`db/migration/V{n}__説明.sql`、既存ファイルは編集しない)。ローカルは `ddl-auto=update` で動いてしまうので、prod プロファイルのテスト(下記)で必ず確認する。
  - 既存の本番DBに対応するため、テーブル・列の追加は `IF NOT EXISTS` を付ける。
- Gemini へのプロンプトは JSON 形式で返させ、Jackson でパースする。パース失敗時のエラー処理を必ず入れる。
- 外部API失敗時はリトライ/フォールバックを用意し、ユーザーには分かるエラーメッセージを返す。

### Frontend (React / TypeScript)
- 関数コンポーネント+フック。`any` は使わない。API レスポンスは `api/client.ts` に型を定義する。
- API 呼び出しは `api/` 経由に集約し、コンポーネント内で直接 `fetch` しない。
- スタイルは Tailwind のユーティリティクラスで書く。独自 CSS は最小限。
- スマホでも使える(学習は隙間時間に行うため)レイアウトにする。
- ルーターの `basename="/englishApp"` と Vite の `base` を崩さない(GitHub Pages のサブパス配信のため)。

## 6. AI(Gemini)利用方針

- **問題作成**: 問題集の問題は Claude(Claude Code)が作成し、レビューしてからコミットする。手順・形式・品質基準は [docs/question-authoring.md](docs/question-authoring.md) に従う。正解が2つ取れる選択肢、不自然な英文がないかを必ず見直す。
- **採点**: ライティング・スピーキングの採点など、その場で AI が必要な処理は Gemini を使う。プロンプトには **試験名・パート・形式・難易度(CEFR B2〜C1 / 英検準1級レベル)** を明示する。
- 採点結果は観点別スコア+フィードバック+改善例を構造化 JSON で返させる。
- 無料枠のレート制限に当たる前提で設計する(キャッシュ、事前生成、失敗時のメッセージ表示)。

## 7. 開発コマンド

```bash
# Frontend
cd frontend
npm install
npm run dev        # ローカル起動 (http://localhost:5173/englishApp/)
npm run lint
npm run build      # tsc -b && vite build

# Backend
cd backend
./mvnw spring-boot:run   # ローカル起動 (http://localhost:8080, dev プロファイル / H2)
./mvnw test
# 本番構成(Flyway + スキーマ検証)でのテスト。マイグレーションを変更したら必ず実行
SPRING_PROFILES_ACTIVE=prod SPRING_JPA_HIBERNATE_DDL_AUTO=validate ./mvnw test

# コミット & push(下記「9. コミット規約」)
./scripts/push.sh "修正内容の要約"
```

ローカル実行に必要な環境変数: `GEMINI_API_KEY`, `ACCESS_LOG_KEY`, `GUARDIAN_API_KEY`, `DEEPL_AUTH_KEY`, `WORDNIK_API_KEY`(frontend は `frontend/.env` に `VITE_API_BASE_URL`)。

## 8. 作業完了の定義

変更を終える前に以下を満たすこと:

1. frontend を変更した → `npm run lint` と `npm run build` が通る(CI と同じ)
2. backend を変更した → `./mvnw test` が通る。スキーマ変更があればマイグレーションを追加し、prod プロファイルのテストも通る(GitHub Actions の Backend CI でも実行される)
3. 新機能・APIを追加した → [techStack.md](techStack.md) と、本ファイル「試験形式と対応機能」の表を更新
4. 秘密情報がコミットに含まれていない

## 9. コミット規約

- **コミットと push は `./scripts/push.sh "修正内容の要約" ["補足"]` で行う。** スクリプトが以下を自動で行う:
  1. 変更をすべてステージ(`git add -A`)
  2. 変更があった側の lint・build・test を実行し、失敗したら中断
  3. `YYYYMMDD - 修正内容の要約` の1行目と、変更ファイル一覧を本文に入れてコミット
  4. 現在のブランチを `origin` へ push
- 日付は `.githooks/prepare-commit-msg` が付与する(`push.sh` が `git config core.hooksPath .githooks` を設定するので、以後は VS Code などからのコミットにも付く)。
- 要約は `feat(<feature>): ...` / `fix(<feature>): ...` / `chore: ...` / `docs: ...` の形式(Conventional Commits)。`<feature>` は `writing`, `reading`, `listening`, `speaking`, `grammar`, `vocab`, `auth` など。日本語可。1コミット1目的。
- Claude Code は作業完了の定義(8章)を満たしたら、`push.sh` でコミット・push まで行う。
- `main` への push で本番デプロイされる(frontend: GitHub Pages、backend: Render)。

## 10. ロードマップ

4技能をまんべんなく伸ばす方針なので、技能間の優先順位は付けない。まず全技能を横断する土台を作り、その後は下の技能別バックログを**技能が偏らないよう順番に1つずつ**進める。

### 土台(最初に作る)
- **今日の30分メニュー**: Home に、4技能+語彙から5〜10分の課題を組み合わせた当日のメニューを出す。学習量が少ない技能・正答率が低い技能を優先して選ぶ
- **学習ログ**: 技能ごとの学習時間・回数・スコアを記録し、MyPage で推移と目標(930点/準1級)までの進捗を表示する

### 技能別バックログ(どの技能にも偏らないよう順番に進める)
| 技能 | 次にやること |
| --- | --- |
| Listening | TOEIC Part 1–4 / 英検 Part 1–3 の形式別出題、再生回数制限 |
| Reading | TOEIC Part 7 形式(メール・広告・複数文書)の生成、時間制限モード |
| Speaking | 英検二次面接(4コマナレーション+Q&A)の出題 → 録音 → 文字起こし → AI 採点・フィードバック |
| Writing | 英検準1級の要約問題(60–70語)を追加 |
| Vocab / Grammar | 英検準1級・TOEIC 900点レベル単語の出題、間違えた単語の間隔反復、TOEIC Part 5–6 形式 |

### 仕上げ(受験前)
- **模試モード**: 本番と同じ問題数・時間での通し演習(試験の1〜2か月前までに使える状態にする)

## 11. 要対応事項(使うために必要な修正・設定)

コードの確認で見つかった、使用前に直すべき点・設定すべき点の一覧。対応したらチェックを付け、不要になった項目は消す。

### 本人の作業が必要(コード外の設定)
- [ ] **Render の環境変数を確認する**: `SPRING_PROFILES_ACTIVE=prod`、`SPRING_DATASOURCE_URL`(`jdbc:postgresql://...` 形式)/ `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`。DB 未設定だと起動ログに「本番プロファイルでインメモリH2を使用中です」と出て、再起動のたびに記録が消える。無料の PostgreSQL は Render Postgres(無料版は期限あり)や Neon / Supabase など
- [ ] **Render の環境変数 `JWT_SECRET` / `ADMIN_REGISTRATION_SECRET` を削除してよい**: ログイン機能を廃止したため不要
- [ ] **アクセスログの設定**: Render に `ACCESS_LOG_KEY`(推測されにくい長い文字列)を設定。GitHub の Actions secrets に `ACCESS_LOG_KEY`(同じ値)・`GMAIL_ADDRESS`・`GMAIL_APP_PASSWORD`(Google アカウントの2段階認証を有効にして発行するアプリパスワード)を登録し、Actions の「Weekly access report」を手動実行して届くか確認する

### 対応済み(20261026)
- [x] 録音アップロードにトークンを付与し、ログインユーザーに紐づけて保存(ファイル名も無害化)
- [x] dev / prod の DB 設定を分離。prod は Flyway でスキーマ管理(V5: roles 列・words・recordings、V6: 出題中の問題・リスニング記録)
- [x] `/api/admin/**` を ADMIN 限定、`/api/listening/**` をログイン必須に変更
- [x] 文法・リスニングの正解を DB に保存(再起動しても採点できる)。リスニングの解答も記録するように
- [x] CORS を GitHub Pages とローカルのみに制限、`/env` エンドポイントの公開を停止
- [x] `ListeningController` を `ListeningService` / `TtsService` に分割し、未使用の `/generate`・`/auto-generate` を削除
- [x] 文法問題の出題が遅い: Gemini 生成をやめ、問題集(`questions/grammar/*.json`、現在100問)から出題。画面側で次の問題を先読み。日本時間 6:00〜翌1:00 は GitHub Actions(`keep-alive.yml`)で Render の停止を防止

### 未対応(コード修正が必要)
- [ ] **ログインが無いため、URL を知っていれば誰でも使える**: 記録の混入・Gemini 枠の消費・管理画面(`/api/admin/**`)の操作が可能。問題になったら、環境変数の合言葉をヘッダーで送る簡易な保護を入れる
- [ ] **生成音声・録音が Render のディスクに保存されている**: 再デプロイで消える。無料のオブジェクトストレージ(Cloudflare R2 / Supabase Storage など)か DB への保存を検討
- [ ] **Speaking の AI 採点が無い**(出題・録音・模範解答は実装済み。文字起こし+Gemini 採点が次の候補)
- [x] 出題順の改善(一巡するまで重複なし・選択肢のシャッフル・間違えた問題の優先)とログイン廃止(20261026)
- [ ] **MyPage にライティング以外の履歴が無い**(Grammar / Reading の履歴 API は実装済み、リスニングは記録のみで API 未実装)
- [x] Gemini 呼び出しを `common/GeminiApiClient` に共通化(失敗時は 502 とメッセージを返す)。外部APIを `XxxApiClient` に分離し、Reading の処理を `ReadingService` に移動(20261028)
- [ ] **テストがコンテキスト起動のみ**: 採点ロジック・認可ルールのテストを追加する
