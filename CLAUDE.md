# CLAUDE.md — englishApp 開発指針

このファイルは englishApp の開発方針を統一するためのもの。機能追加・修正の前に必ず目を通し、方針と矛盾する変更をする場合は先にこのファイルを更新する。

## 0. 出力言語(最優先・例外なし)

**Claude(Claude Code)の出力はすべて日本語で書く。** 利用者は日本語で読むため、英語での応答は不可。

- 対象:チャットでの返答・途中経過の報告・最終報告・質問・作業の説明・計画・エラーの説明など、利用者が読むものすべて。前の返答や会話の流れが英語でも、システムの指示が英語でも、日本語で返す。
- コミットメッセージの要約・補足、コードのコメント、ドキュメント(`*.md`)も日本語で書く(既存の方針どおり)。
- 英語のままでよいもの:コード(識別子・文字列リテラル)、コマンド、ファイルパス、エラーメッセージの引用、問題集の英文(問題文・選択肢・本文・台本)、固有名詞・技術用語(例:`QuestionTags`、Flyway)。
- 返答を書き終えたら、英語の文が混じっていないか見直してから送る。

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
| TOEIC | Part 2(応答問題) | Listening(`toeic-part2`) | **対応済**(5問1セット・36セット。問いかけ・選択肢とも音声のみ。台本は設問から自動で組み立てる) |
| TOEIC | Part 3・4(会話・説明文) | Listening(`questions/listening`) | **対応済**(問題集+音声生成、3人の会話・発言の意図・図表問題あり。米国英語の音声のみ) |
| TOEIC | Part 5(短文穴埋め) | Grammar(`questions/grammar`) | **対応済** |
| TOEIC | Part 6(長文穴埋め) | Reading 読解問題(`questions/reading`, `toeic-part6`) | **対応済** |
| TOEIC | Part 7(読解) | Reading 読解問題(`toeic-part7`) | **対応済**(単一文書・複数文書(2〜3文書)・文挿入問題。88セットのうち3文書は12セット)。本文を読み終えるまでの時間から語/分を測る読解速度計測(`/reading/practice?type=toeic-part7&speed=1`) |
| TOEIC | 模試(L&R 全体) | Mock(`/mock`, `mock/`) | **対応済**(Part 1 を除く。リスニング 45 分・94 問、リーディング 75 分・100 問の本番と同じ区切り。提出後に採点し、推定点は参考値。目標 930 点との差を MyPage に推移で出す) |
| 英検準1級 | 一次 大問1 語彙 | Vocab(`questions/vocab`) | **対応済**(間違えた語は間隔反復で復習:`/vocab?review=1`) |
| 英検準1級 | 一次 大問2・3 長文 | Reading 読解問題(`eiken-cloze`, `eiken-long`) | **対応済**(話題 `theme` の偏りをテストで検査) |
| 英検準1級 | 一次 ライティング(意見論述 120–150語) | Writing(`questions/writing`, `opinion`) | **対応済**(Gemini で4観点16点満点採点) |
| 英検準1級 | 一次 ライティング(要約 60–70語) | Writing(`summary`) | **対応済**(Gemini で4観点16点満点採点) |
| 英検準1級 | 一次 リスニング Part 1〜3 | Listening(`eiken-part1`〜`eiken-part3`) | **対応済** |
| 英検準1級 | 二次 面接(ナレーション・Q&A) | Speaking(`questions/speaking`) | 出題・模範解答あり(録音はブラウザ内だけで扱い、保存しない)。4コマは文章で代用。AI 採点は未対応 |

新機能を追加したら、この表の「状態」を更新すること。

## 2. 学習設計の原則

- **1回の学習は5〜10分で完結させる**: どの機能も1セット5〜10分で終わる単位で出題し、30分で複数技能を回せるようにする。途中でやめても記録が残るようにする。
- **4技能を均等に回す**: 技能ごとの学習時間・回数を記録し、少ない技能を優先して出す。
- **アウトプットには必ずフィードバックを返す**: ライティング・スピーキングは AI 採点+改善点+模範解答をセットで返す。採点観点は試験の公式観点に合わせる(英検ライティング: 内容・構成・語彙・文法 各4点)。
- **学習記録はすべて保存する**: 解答は `*Record` エンティティとして保存し、MyPage で振り返れるようにする。正誤・スコア・所要時間・日時を最低限持つ。あわせて採点時に `StudyLogService.log(...)` で学習ログ(`study_logs`:技能・形式・正解数・所要秒数)を1行残し、MyPage の技能別集計に使う。新しい機能を足したら学習ログも必ず書く(画面側は出題から解答までの秒数を `durationSeconds` で送る)。
- **模試と推定点**: 模試(`/mock`)は本番と同じ区切り・制限時間で通して解き、提出後にまとめて採点する(途中で閉じると結果は残らない)。リスニングは1セットずつ・音声は1回だけ・戻れない、リーディングは1画面でまとめて解き時間切れで自動提出する。問題はサーバーの問題集から組み(`MockSelection`、Part 1 は画像が無いので省く)、採点・記録・学習ログはサーバーで行う。学習ログは区切りごとに1行(`itemType` は `toeic-mock`)。模試の時間は時間の経験値に含まれるが、模試の解答では経験値を稼げない(`XpRules` の `toeic-mock` は 0)。推定点は正答率から `ToeicEstimate` の折れ線で決める仮の換算で、公式の換算表ではない。画面と MyPage では必ず「推定・参考値」と書く。換算を変えても過去の結果は変わらないよう、保存時の推定点を `mock_exams` に残す。
- **読解速度**: 速度計測(`?speed=1`)では本文だけを先に出し、「本文を読み終えた」までの秒数と本文の語数から語/分を出す(設問に答える時間は含めない)。10秒未満・30分超は記録しない。記録は `reading_speeds`(`ReadingSpeedService`)。語数と式は `ReadingSpeedService` と `shared/readingSpeed.ts` で揃える。Guardian 記事の多読の WPM(`reading_records`)とは別に持つ。
- **弱点の可視化と復習**: 間違えた語彙・文法問題は `ReviewService` が `review_items` に登録し、1→3→7→14日の間隔で出し直す(14日後の復習に正解したら外す)。復習日より前の通常出題で正解しても間隔は進めない。
- **レベル(学習ペースの管理)**: 解答・学習時間・継続で経験値を貯め、**1日30分(約600XP)を続けると 2027年3月31日にちょうど Lv.100** になるように設計している(`level/XpRules`)。経験値は保存せず `study_logs` からその都度計算する(規則を変えると過去にもさかのぼって反映される)。正解は形式ごとに1問の所要時間に比例し、難易度で 0.8〜1.3倍、不正解は3割、同じ日の解き直しは0、前に間違えた問題を後日克服すると1.5倍。時間は1分1XP(1日60まで)、30分達成+50、技能1つにつき+10、10分以上の日の連続で最大1.3倍。ヘッダーにレベル、マイページに予定ペース(`GET /api/level`)を出す。新しい形式を足したら `XpRules.BASE_XP` に1問あたりの経験値を追加する
- **弱点分析**: MyPage に、文法の分野(時制・関係詞など)・語彙の品詞・読解/リスニングの設問タイプ(推測・NOT問題・発言の意図・Part 2 の問いかけの形など)別の正答率を出す(`GET /api/stats/weakness`)。分類は解答記録に保存せず、問題集の `point` や設問文から `QuestionTags` がその都度決める。新しい書き方の `point` や設問を足したら `QuestionTagsTests` で分類漏れを確認する。
- **問題の表示はサーバーを待たない**: 文法・語彙・読解・リスニングの問題集は画面に同梱し(`frontend/src/generated/questions/*.json`)、出題と採点は画面で行う(`api/localQuestions.ts`、`api/picker.ts` は `QuestionPicker` の移植)。解答記録は送信待ちの列(`api/outbox.ts`、ブラウザに保存)から従来の解答 API に裏で送り、送れなければ次回に再送する。解答履歴は `GET /api/practice/history` で裏で取得してブラウザに保存し、出題に使う。同梱の問題集は `QuestionExportTests` が書き出す(難易度・Part 2 の台本は Java 側が正)。リスニングの台本と和訳は同梱しない(解答後は `reveal`、音声が使えないときの読み上げは `script` から API で取る)。問題集を変えたら `./scripts/export-questions.sh`(`push.sh` が自動実行。書き出し忘れは CI で失敗)。出題規則を変えるときは `QuestionPicker` と `picker.ts` の両方を揃える。復習モード(`?review=1`)・ライティング・スピーキングはサーバーで出題する
- **出題順**: `QuestionSelector` / `QuestionPicker` が解答記録から選ぶ。一巡するまで重複なし、最後に間違えた問題を約3割の確率で出し直す、直近5問と表示中の問題(`exclude`)は出さない。選択肢の並びは画面側で毎回シャッフルし、採点には元の記号を送る。
- **難易度**: 問題は 1=基礎 / 2=標準 / 3=発展 / 4=難関 / 5=最難関 の難易度を持つ(`Difficulty`)。各レベルの基準(目安の得点・正解の根拠の置き方・禁止事項)は [docs/question-authoring.md](docs/question-authoring.md) の「4. 難易度の定義」に従う。どのレベルでも、頭の中で計算させる設問と、正解の根拠が本文にない設問は作らない。JSON の `difficulty` があればそれを使い(語彙は語ごとに判定済み)、無ければ文の長さ・文法分野・設問タイプから形式ごとに 1〜3 の3等分で推定する(4・5 は JSON に書いたものだけ)。出題は「自動」なら、直近30設問で解いた問題の平均の難易度を基準に、正答率が85%以上なら1つ上・60%未満なら1つ下・その間なら同じ難易度(1〜5)を目標にし、未出題の候補の中から目標に最も近い難易度を優先する(正答率が高いまま続ければ難関・最難関まで上がる)。画面で難易度を固定することもできる(`?level=1〜5`)。経験値の倍率は 3〜5 とも 1.3倍。
- **試験と同じ制約で練習できる**: 語数カウント、制限時間、音声の再生回数制限など、本番と同じ条件を選べるようにする。
- **ホームは試験→パートの2段階**: まず TOEIC / 英検準1級を選び、次にパートを選ぶ(`shared/exams.ts` の `EXAM_MENUS`)。難易度(自動・基礎・標準・発展・難関・最難関)も、問題を解く前にこの画面で一度だけ選ぶ(端末に保存。問題画面へは `?level=` で渡す)。
- **問題画面は最低限の表示にする**: 問題文・本文・選択肢・解答後の結果だけを出す。見出し、形式の切り替え、難易度の選択やバッジ、話題のバッジは出さない(形式は `?type=`、難易度は `?level=` で受け取る)。リスニングはセットの題名も出さない(内容が分かってしまうため)。
- **途中でやめても記録は残す**: 文法・語彙は1問ごと、読解・リスニングは1セットの「解答する」ごとに、記録をブラウザの送信待ちの列に保存してから送る。画面を閉じても次に開いたときに再送する。ライティングは採点時、スピーキングは模範解答を見たときにサーバーへ保存する。
- **ログインは設けない**: 利用者は本人1人だけなので、全 API をログインなしで使える。記録はすべて `CurrentUserProvider` が返す owner ユーザーに保存する(初回アクセス時に自動作成)。
- **端末登録(使える端末を限定)**: 利用者は本人の端末(PC 2台・スマホ1台)だけなので、`/api/**` は登録済みの端末だけが使える(`device/DeviceFilter`)。初回に合言葉(環境変数 `APP_ACCESS_KEY`)で登録すると端末専用の鍵が発行され、ブラウザに保存して `X-Device-Token` で送る(`features/device/DeviceGate`)。登録は最大 `MAX_DEVICES`(既定3)台で、上限に達すると合言葉が正しくても登録できない。鍵は SHA-256 のハッシュだけを `devices` テーブルに保存する。マイページで端末ごとに削除できる。端末をすべて失くしたら `MAX_DEVICES` を一時的に増やして登録し直す。`/health`・生成音声・`/api/access-logs`(独自キー)・`/api/devices/register` は対象外。`APP_ACCESS_KEY` が未設定なら保護しない(ローカル開発用)。画面(GitHub Pages)と同梱の問題集は誰でも取得できるが、未登録の端末では登録画面が重なり、記録・採点・レベルなどは一切使えない。
- **PWA**: 本番ビルドでは `public/sw.js` を登録し、画面の骨組み・ハッシュ付きアセット・問題集 JSON をキャッシュして、通信がなくても画面を開けるようにする。`/api/` と別オリジンはキャッシュしない(記録・採点は常にサーバーへ。送信待ちの列は outbox が担当)。キャッシュの世代は `sw.js` の `CACHE_NAME` で管理し、`sw.js` の処理を変えたら上げる。`skipWaiting` は使わない(開いている画面が読み込む chunk を消さないため)。
- **アクセスログ**: `/api/**` へのアクセスを `access_logs` に保存し(IP・端末・ip-api.com で推定した地域、90日で削除)、マイページで確認する。IP を含むので閲覧 API は `ACCESS_LOG_KEY` と一致するヘッダー `X-Access-Log-Key` が必須。週1回 `weekly-access-report.yml` が Gmail で自分宛てに送る。**IP を含むログを公開リポジトリにコミットしない**(Actions の実行ログにも出さない)。

## 3. 技術スタック

詳細は [techStack.md](techStack.md)。要点のみ:

- **モノレポ**: `frontend/`(React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router 7)、`backend/`(Java 25 + Spring Boot 4 + Maven Wrapper)
- **DB**: プロファイルで切り替える。`dev`(既定): H2 インメモリ + `ddl-auto=update` + Flyway 無効 / `prod`: `SPRING_DATASOURCE_URL` の DB + Flyway でスキーマ管理(`ddl-auto=none`)
- **認証**: なし(Spring Security は CORS 設定のためだけに使い、全リクエストを許可)
- **AI**: Google Gemini(Spring AI `spring-ai-starter-model-google-genai`、モデル `gemini-2.5-flash`)
- **外部API**: Guardian(記事)、DeepL(翻訳)、Wordnik(辞書)
- **TTS**: `backend/tts/generate_tts.py`(edge-tts)+ ffmpeg。失敗時はブラウザの `speechSynthesis` にフォールバック
- **デプロイ**: frontend → GitHub Pages(GitHub Actions)、backend → Render(Docker、push で自動デプロイ)。Render 無料プラン(CPU 0.1)での起動を速くするため、Dockerfile で Java 25 の AOT キャッシュを作り、本番は遅延初期化(`spring.main.lazy-initialization=true`)で起動する(CPU 0.1 の実測で約4分→約1分)。停止を防ぐ ping は cron-job.org(日本時間 6:00〜23:00、10分ごと)で行い、`keep-alive.yml` は予備。push したコードが反映されたかは `/info` の `commit`(Render が実行時に渡す `RENDER_GIT_COMMIT`)が push したコミットと一致するかで確かめる。自動デプロイには GitHub に Render の GitHub App が入っている必要がある(外れていると push を検知できず、手動デプロイしか起きない。2026-11-02 に入れ直した)

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
npm test           # Vitest(純粋関数と送信待ちの列のテスト)

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
| Reading | TOEIC Part 7 形式(メール・広告・複数文書)の生成、時間制限モード(速度計測は対応済み) |
| Speaking | 英検二次面接(4コマナレーション+Q&A)の出題 → 録音 → 文字起こし → AI 採点・フィードバック |
| Writing | 英検準1級の要約問題(60–70語)を追加 |
| Vocab / Grammar | 英検準1級・TOEIC 900点レベル単語の出題、間違えた単語の間隔反復、TOEIC Part 5–6 形式 |

### 仕上げ(受験前)
- **模試モード**: 対応済み(20261108)。英検準1級の模試は未対応

## 11. 要対応事項(使うために必要な修正・設定)

コードの確認で見つかった、使用前に直すべき点・設定すべき点の一覧。対応したらチェックを付け、不要になった項目は消す。

### 本人の作業が必要(コード外の設定)
- [ ] **Render の環境変数を確認する**: `SPRING_PROFILES_ACTIVE=prod`、`SPRING_DATASOURCE_URL`(`jdbc:postgresql://...` 形式)/ `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`。DB 未設定だと起動ログに「本番プロファイルでインメモリH2を使用中です」と出て、再起動のたびに記録が消える。無料の PostgreSQL は Render Postgres(無料版は期限あり)や Neon / Supabase など
- [ ] **Render の環境変数 `JWT_SECRET` / `ADMIN_REGISTRATION_SECRET` を削除してよい**: ログイン機能を廃止したため不要
- [ ] **cron-job.org で起動維持の ping を設定する**: 日本時間 6:00〜23:00 に10分ごと、`<バックエンドのURL>/health` に GET。GitHub Actions の定期実行は数時間遅れることがあり、停止を防げていなかった(実測で5〜8時間おき)
- [ ] **Render に `APP_ACCESS_KEY`(端末登録の合言葉)を設定し、3台を登録する**: 未設定だと URL を知っていれば誰でも API を使える(記録の混入・Gemini 枠の消費・管理画面の操作。2026-11-01 時点で未設定を確認)。設定後、各端末でアプリを開くと登録画面が出るので合言葉を入れる(端末ごとに1回)。3台登録したら、マイページの「登録済みの端末」で心当たりのない端末がないか確認する
- [ ] **アクセスログの設定**: Render に `ACCESS_LOG_KEY`(推測されにくい長い文字列)を設定。GitHub の Actions secrets に `ACCESS_LOG_KEY`(同じ値)・`GMAIL_ADDRESS`・`GMAIL_APP_PASSWORD`(Google アカウントの2段階認証を有効にして発行するアプリパスワード)を登録し、Actions の「Weekly access report」を手動実行して届くか確認する

### 対応済み(20261026)
- [x] dev / prod の DB 設定を分離。prod は Flyway でスキーマ管理(V5: roles 列・words・recordings、V6: 出題中の問題・リスニング記録)
- [x] 文法・リスニングの正解を DB に保存(再起動しても採点できる)。リスニングの解答も記録するように
- [x] CORS を GitHub Pages とローカルのみに制限、`/env` エンドポイントの公開を停止
- [x] `ListeningController` を `ListeningService` / `TtsService` に分割し、未使用の `/generate`・`/auto-generate` を削除
- [x] 文法問題の出題が遅い: Gemini 生成をやめ、問題集(`questions/grammar/*.json`、現在100問)から出題。画面側で次の問題を先読み。日本時間 6:00〜翌1:00 は GitHub Actions(`keep-alive.yml`)で Render の停止を防止

### 未対応(コード修正が必要)
- [ ] **生成音声が Render のディスクに保存されている**: 再デプロイで消える(音声は台本から再生成できる)。無料のオブジェクトストレージ(Cloudflare R2 / Supabase Storage など)か DB への保存を検討
- [ ] **Speaking の AI 採点が無い**(出題・録音・模範解答は実装済み。文字起こし+Gemini 採点が次の候補)
- [x] 出題順の改善(一巡するまで重複なし・選択肢のシャッフル・間違えた問題の優先)とログイン廃止(20261026)
- [x] MyPage に全技能の学習ログ(技能別の時間・正答率、日別グラフ、苦手な形式、最近の履歴)を表示(20261031)
- [x] 間違えた語彙・文法問題の間隔反復(20261031)
- [x] リスニングの台本・和訳を問題集に同梱しない(公開サイトの配信ファイルから読めないように)。解答後は `/api/listening/practice/{id}/reveal` から取る(20261103)
- [x] 録音アップロードの API を削除(録音はブラウザ内だけで扱う)。CI の `JWT_SECRET` を削除(20261103)
- [x] Gemini 呼び出しを `common/GeminiApiClient` に共通化(失敗時は 502 とメッセージを返す)。外部APIを `XxxApiClient` に分離し、Reading の処理を `ReadingService` に移動(20261028)
- [x] 採点ロジックのテスト(`WritingServiceTests`)と端末認可のテスト(`DeviceTests`)を追加(20261103)
- [x] 模試(TOEIC L&R)・推定点・読解速度計測・PWA・フロントエンドのテスト(Vitest)を追加(20261108)。模試の推定点は仮の換算なので、公式の換算が分かったら `ToeicEstimate` を差し替える
- [ ] **テストが不足**: 読解・リスニング・スピーキングの Controller のテストがない。フロントエンドのテストは純粋関数と送信待ちの列だけで、画面(模試・速度計測)のテストはない
