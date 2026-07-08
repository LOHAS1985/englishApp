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

- ホーム画面:各機能への遷移メニュー
- ライティング問題画面:出題 → 回答入力(語数カウント付き)→ AI採点(4観点・16点満点)

## バックエンド

| 項目             | 使用技術                             |
| ---------------- | ------------------------------------ |
| 言語             | Java 21                              |
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

## インフラ / デプロイ

| 項目                        | 使用技術                      |
| --------------------------- | ----------------------------- |
| フロントエンド ホスティング | GitHub Pages                  |
| バックエンド ホスティング   | Render (Web Service)          |
| バックエンドの実行方式      | Docker (マルチステージビルド) |
| ソースコード管理            | GitHub                        |

**Dockerfileの構成(マルチステージビルド)**

- ビルドステージ: `eclipse-temurin:21-jdk` でMavenビルドを実行し、jarファイルを生成
- 実行ステージ: `eclipse-temurin:21-jre` に生成済みjarのみをコピーし、軽量なイメージで実行

## CI/CD (GitHub Actions)

| 項目     | 内容                                                |
| -------- | --------------------------------------------------- |
| トリガー | `main`ブランチへのpush (frontend配下の変更時)       |
| CI内容   | 依存関係インストール → Lint → Build                 |
| CD内容   | ビルド成果物をGitHub Pagesに自動デプロイ            |
| 権限設定 | `actions/deploy-pages` によるGitHub公式デプロイ方式 |

バックエンドはRenderのGitHub連携によるpush検知で自動ビルド・デプロイ(Render側のCI/CD機能を利用)。

## 環境変数

| 変数名              | 用途                                      | 設定場所       |
| ------------------- | ----------------------------------------- | -------------- |
| `VITE_API_BASE_URL` | フロントエンドが呼び出すバックエンドのURL | frontend/.env  |
| `GEMINI_API_KEY`    | Gemini API認証キー                        | Render環境変数 |

## 学習を通じて扱った主なトラブルシューティング

- Node.jsバージョン不整合(非LTSバージョンによるエラー)
- nvmとシステムインストールJavaの競合
- Windows環境でのGitリポジトリ初期化・リモート接続
- Vite + GitHub Pagesのサブパス(`base`)設定
- Spring BootのBean注入エラー(環境変数未設定)
- Docker実行権限エラー(`chmod +x mvnw`)
- CORS設定によるローカル/本番環境の切り分け
- Gemini APIのモデル名変更・レート制限・APIキー制限
