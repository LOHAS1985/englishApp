# English App - 技術スタック概要

英検準1級のライティング練習アプリ。問題出題とAI採点をGemini APIで行う。

## 構成

モノレポ構成(1リポジトリに frontend / backend を格納)。

```
english-app/
├── frontend/   TypeScript + React
├── backend/    Java + Spring Boot
└── .github/workflows/
```

## フロントエンド

| 項目              | 使用技術     |
| ----------------- | ------------ |
| 言語              | TypeScript   |
| フレームワーク    | React 19     |
| ビルドツール      | Vite         |
| ルーティング      | React Router |
| スタイリング      | Tailwind CSS |
| Node.jsバージョン | 24 (LTS)     |

**主な画面**

- ホーム画面:各機能への遷移メニューと、今日の30分メニュー(`pages/TodayMenuSection.tsx`。`GET /api/stats/summary` の学習ログから画面側の純粋関数 `shared/todayMenu.ts` が組み立てる。新しい API は無い。スピーキングなしのメニューも同時に出す)
- ライティング問題画面:出題 → 回答入力(語数カウント付き)→ AI採点(4観点・16点満点)
- スピーキング問題画面:出題 → 録音(`features/speaking/Recorder.tsx`)と同時に、ブラウザの音声認識(Web Speech API。無料。Chrome / Edge / Safari)で文字起こし → 文字起こしを直して AI 採点(`PartPractice.tsx`。4観点・16点満点)。音声はブラウザの外に送らず、採点に送るのは文字起こしだけ。音声認識に対応していないブラウザでは文字起こしを手入力する

## バックエンド

| 項目             | 使用技術                             |
| ---------------- | ------------------------------------ |
| 言語             | Java 25                              |
| フレームワーク   | Spring Boot                          |
| ビルドツール     | Maven (Maven Wrapper)                |
| HTTPクライアント | Spring WebFlux (WebClient)           |
| JSON処理         | Jackson                              |
| 外部AI連携       | Google Gemini API (gemini-2.5-flash) |

**主なAPI**

| メソッド | パス                    | 役割                                                          |
| -------- | ----------------------- | ------------------------------------------------------------- |
| GET      | `/api/writing/question` | Geminiに英検準1級形式の問題を生成させる                       |
| POST     | `/api/writing/score`    | 回答をGeminiに送り、内容・構成・語彙・文法の4観点で採点させる |
| POST     | `/api/speaking/score`   | 面接の1パート(ナレーションまたは Q&A の1問)の文字起こしを Gemini に送り、内容・構成・語彙・文法の4観点で採点させる(`speaking_records` に保存) |
| GET      | `/api/speaking/history` | スピーキングの AI 採点の履歴(新しい順に最大30件。MyPage) |
| GET      | `/api/stats/summary`    | 学習ログ(`study_logs`)を技能別・形式別・日別に集計する(MyPage) |
| GET      | `/api/stats/history`    | 全技能の最近の学習50件                                         |
| GET      | `/api/practice/history?feature=` | 文法・語彙・読解・リスニングの解答履歴(画面側で出題するため。画面がブラウザに保存する) |
| POST     | `/api/devices/register` | 合言葉でこの端末を登録し、端末専用の鍵を発行する(最大3台) |
| GET / DELETE | `/api/devices`(`/{id}`) | 登録済み端末の一覧・削除(管理画面) |
| GET      | `/api/level`            | 学習ログから経験値・レベル・期限(2027年3月末に Lv.100)までのペースを計算する |
| GET      | `/api/review/summary`   | 間違えた語彙・文法問題のうち今日復習する数                     |
| GET      | `/api/reading/practice/speed` | 読解速度(語/分)の直近の計測(Part 7 などの速度計測モード)    |
| POST     | `/api/mock/start`       | TOEIC 模試の問題一式を組む(リスニング 94 問・45分、リーディング 100 問・75分) |
| POST     | `/api/mock/submit`      | 模試の解答を区切りごとに採点し、推定点(参考値)を返して保存する |
| GET      | `/api/mock/history`     | 過去の模試の結果(新しい順。MyPage の推定点の推移に使う)         |
| GET      | `/api/vocab/question?review=true`(文法も同様) | 復習日になった問題を出題する(1→3→7→14日の間隔反復) |
| GET      | `/api/wordbook/summary` | 単語帳の語数・色ごとの数・訳の調査が残っている数                 |
| GET / POST | `/api/wordbook/words` | 単語の一覧(`?color=`・`?q=`)・登録(読解からは `exampleEn` と `exampleAnswer` を付ける。同じ語・変化形があれば追加しない) |
| PUT / DELETE | `/api/wordbook/words/{id}`(`/color`) | 訳の修正・色の変更(手動)・削除                       |
| GET      | `/api/wordbook/quiz/choice`(`/fill`) | 単語帳の4択(英単語→日本語)・穴埋め(日本語訳を見て英単語を入力)の出題。`exclude` に直近の語の ID を渡す |
| POST     | `/api/wordbook/quiz/choice/answer`(`/fill/answer`) | 解答を採点し、練習記録と学習ログを保存する                  |
| GET      | `/api/wordbook/history` | 単語帳の直近の解答                                             |

## インフラ / デプロイ

| 項目                        | 使用技術                      |
| --------------------------- | ----------------------------- |
| フロントエンド ホスティング | GitHub Pages                  |
| バックエンド ホスティング   | Render (Web Service)          |
| バックエンドの実行方式      | Docker (マルチステージビルド) |
| ソースコード管理            | GitHub                        |

**Dockerfileの構成(マルチステージビルド)**

- ビルドステージ: `eclipse-temurin:25-jdk` でMavenビルドを実行し、jarファイルを生成
- 実行ステージ: `eclipse-temurin:25-jre` に生成済みjarのみをコピーし、軽量なイメージで実行

## CI/CD (GitHub Actions)

| 項目     | 内容                                                |
| -------- | --------------------------------------------------- |
| トリガー | `main`ブランチへのpush (frontend配下の変更時)       |
| CI内容   | 依存関係インストール → Lint → Build                 |
| CD内容   | ビルド成果物をGitHub Pagesに自動デプロイ            |
| 権限設定 | `actions/deploy-pages` によるGitHub公式デプロイ方式 |

バックエンドはRenderのGitHub連携によるpush検知で自動ビルド・デプロイ(Render側のCI/CD機能を利用)。

**単語帳の日本語訳の調査(スケジュール)**: 毎日 7:00(日本時間)に、訳が揃っていない単語だけを DeepL(無料版)で訳す。`@Scheduled` で動き、起動時に当日分が未実行なら実行する(Render が眠っていた場合の補充)。実行日は `app_state` に残す。失敗した語は翌日に取り直す。

## 環境変数

| 変数名              | 用途                                      | 設定場所       |
| ------------------- | ----------------------------------------- | -------------- |
| `VITE_API_BASE_URL` | フロントエンドが呼び出すバックエンドのURL | frontend/.env  |
| `GEMINI_API_KEY`    | Gemini API認証キー                        | Render環境変数 |
| `APP_ACCESS_KEY`    | 端末登録の合言葉。設定すると `/api/**` は登録済みの端末(ヘッダー `X-Device-Token`)だけが使える。各端末で初回に一度入力して登録する | Render環境変数 |
| `MAX_DEVICES`       | 登録できる端末の台数(既定3)。端末をすべて失くしたときに一時的に増やして登録し直す | Render環境変数(通常は未設定) |
| `ACCESS_LOG_KEY`    | アクセス履歴の閲覧キー                    | Render環境変数・GitHub Actions secrets |

## 学習を通じて扱った主なトラブルシューティング

- Node.jsバージョン不整合(非LTSバージョンによるエラー)
- nvmとシステムインストールJavaの競合
- Windows環境でのGitリポジトリ初期化・リモート接続
- Vite + GitHub Pagesのサブパス(`base`)設定
- Spring BootのBean注入エラー(環境変数未設定)
- Docker実行権限エラー(`chmod +x mvnw`)
- CORS設定によるローカル/本番環境の切り分け
- Gemini APIのモデル名変更・レート制限・APIキー制限

## テスト・PWA(2026-11-08 追加)

- **フロントエンドのテスト**: Vitest 5.1.0(devDependency、無料)。`npm test`(`vitest run`)。対象は純粋関数(出題の選び方 `picker.ts`、レベル計算、語彙ハイライト、読解速度、模試の表示用関数、今日の30分メニュー `todayMenu.ts`)と送信待ちの列(`outbox.ts`、fetch と localStorage をモック)。CI の build ジョブで Lint と Build の間に実行する。
- **画面の部品のテスト**: jsdom 31.0.1 + @testing-library/react 16.3.3 + @testing-library/user-event 14.6.10(いずれも devDependency、無料)。`src/**/*.test.tsx` の先頭に `// @vitest-environment jsdom` を書き、Vitest で動かす(`ChoiceQuiz`、`DisplaySettingsControl` など)。
- **画面の通しテスト(e2e)**: @playwright/test 1.65.1(devDependency、無料)。`npm run test:e2e`。`e2e/*.spec.ts`。ブラウザは端末の Chrome(`channel: "chrome"`)を使うので、ブラウザのダウンロードは不要。バックエンドは動かさず、`e2e/mockApi.ts` が `/api/**` を固定データで返す。開発サーバーは Playwright が起動する(起動済みなら使い回す)。CI には入れていない。
- **PWA**: `public/manifest.webmanifest` と `public/sw.js`。本番のみ登録する(`main.tsx`)。navigate は network-first(失敗時はキャッシュの index.html)、同一オリジンの `assets/`・問題集・favicon・manifest は cache-first、`/api/` と別オリジンはキャッシュしない。`CACHE_NAME` で世代を管理し、`skipWaiting` は使わない。アイコンは SVG のみ(Chrome のインストール条件を満たさない可能性があり、192px・512px の PNG は未作成)。
- **DB マイグレーション**: `V13__reading_speeds_and_mock_exams.sql`(`reading_speeds`、`mock_exams`)。

## 応答の速さ(2026-11-18 追加)

- **今日の30分メニューの即表示**: 保存済みのメニューと最後に取得した学習時間を、サーバーの応答を待たずに出す(`pages/TodayMenuSection.tsx`)。応答が返ったら済みの印と学習時間を更新する。画面のテストは `TodayMenuSection.test.tsx`(jsdom)。
- **CORS のプリフライトのキャッシュ**: `SecurityConfig` で `Access-Control-Max-Age` を1時間にする(`CorsConfigTests`)。
- **起動後のウォームアップ**: `config/WarmUp`。本番プロファイルの `app.warmup=${APP_WARMUP:true}` で有効。遅延初期化(`spring.main.lazy-initialization=true`)のため最初の API 呼び出しが部品の読み込みで遅くなるのを、ホーム画面が呼ぶ API を別スレッドで先に呼んで済ませる(`WarmUpTests`)。
- **問題集の形式別の分割**: 読解・リスニングの同梱問題集を形式ごとの別チャンクにした(`QuestionExportTests` が `reading/<type>.json`・`listening/<type>.json`・`index.json` を書き出す。形式が減ったときの古いファイルも検出する)。`api/localQuestions.ts` が開いた形式だけを読み込む(`localQuestions.test.ts`)。gzip 後の転送量は、リスニング Part 3 で 432KB→106KB、読解 Part 7 で 484KB→215KB。まだ開いていない形式はオフラインでは開けない(開いた形式は PWA のキャッシュに残る)。
- **レベル・弱点分析のキャッシュ**: `common/SignatureCache`。記録の件数と最大 ID(`TableSignature`。`StudyLogRepository` など各リポジトリの `signature`)が前回と同じなら、前回の計算結果を返す(`SummaryCacheTests`)。印を先に読んでから全件を読むので、読む間に記録が増えても古い結果が残らない。今日の日付で決まる部分(連続日数・予定ペース・直近14日)は毎回組み立てる。メモリだけに置くので、再起動で消え、1台構成が前提。
- **測定の目安(このPC。Render は CPU 0.1 で約10倍遅いと推定)**: 再起動直後の最初の `/api/level` は、ウォームアップ前 422ms、後 14ms。本番への往復は最低 0.17〜0.47 秒、プリフライトは 0.17〜0.39 秒。
