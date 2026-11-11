# リスニング問題の毎日の作業(定期実行用の手順)

定期実行の Claude はこの手順に従う。利用者への報告・コミットメッセージ・解説はすべて日本語で書く(CLAUDE.md の 0)。
問題の書き方・難易度の基準・品質チェックは [docs/question-authoring.md](../../docs/question-authoring.md) に従う(必ず 1.1・3・4・5 を読んでから作る)。

## 0. 準備

```bash
git checkout main && git pull --ff-only origin main
./backend/mvnw -v | grep "Java version"   # Maven が使う JDK を確認。25 でなければ JAVA_HOME を JDK 25 に向ける(push.sh は JDK 25 を自動で探す)
node -v && python3 --version
(cd frontend && npm ci)   # node_modules が無いときだけ
```

- 作業ツリーに未コミットの変更があったら、何もせずに中断して報告する(利用者の作業を壊さないため)。
- JDK 25 が無い環境では backend のテストが走らないので、push せずに中断して報告する。

## 1. 今日の作業を確認する

```bash
node scripts/questions/plan.js today 8
```

- 「完了」と出たら何もしないで終わる(報告だけする)。
- 「【書き直し】」なら 2 へ、「【追加】」なら 3 へ。

## 2. 書き直し

表示された古い ID ごとに、**新しい ID で**指定のレベルのセットを1つ作る。

1. 新しい ID は、`backend/src/main/resources/questions/listening/*.json` の最大の ID の次から振る。ファイルは最後の `listening-NNN.json` の次の番号で新しく作る(形式ごとに1ファイルにしてよい)。
2. 古いセットは場面の参考にしてよいが、題名・台本・設問・解説・和訳はすべて新しく書く。
3. 各セットに `"difficulty"` を必ず書く。正解は必ず最初の選択肢(A)に書く。
4. 見本は同じ形式・同じレベルの既存セット(`node -e` などで difficulty が 4・5 のセットを探す)。
5. 作り終えたら、古いセットを外す:
   ```bash
   node scripts/questions/plan.js retire <古い ID ...>
   ```
   (新しいセットを作る前に外さない。外すと書き直し済みと判定される)

## 3. 追加

表示された「形式 レベルN ×k」のとおりに新しいセットを作る(ID・ファイルの振り方、difficulty、正解を A に書くことは 2 と同じ)。

- レベル1・2 も作る。基準は docs/question-authoring.md の 4.2「レベル1・2 の作り方」に従う。特に、**レベル1 は正解を本文と同じ語で書く(言い換えない)**、**TOEIC Part 2 のレベル1・2 は問いかけに直接答える応答を正解にする**。
- TOEIC Part 4・英検 Part 2・Part 3 の話し手(`Narrator`)は男性の声なので、男性として書く(3 の「リスニングの `script`」)。

## 4. 仕上げと確認

```bash
python3 scripts/questions/check.py backend/src/main/resources/questions/listening/<新しいファイル>.json
python3 scripts/questions/balance.py backend/src/main/resources/questions/listening set "<新しいファイルだけに一致する glob>"
node scripts/questions/overlap.js backend/src/main/resources/questions/listening/<新しいファイル>.json
node scripts/questions/plan.js
```

- balance.py の3つ目の引数は、**今日作ったファイルだけ**に一致させる(既存のファイルの記号を並べ替えると解答履歴とずれる)。glob の `{a,b}` は使えず、`listening-0[67][0-9].json` のような範囲は既存のファイルまで含んでしまう。ファイルが2つ以上なら1つずつ指定して複数回実行し、実行後に `git status` で既存のファイルが変わっていないことを確かめる。
- docs/question-authoring.md の「5. 品質チェック」の表に沿って、全セットを読み直す(正解が2つ取れる・計算させる・根拠が本文にない・正解だけ長い、など)。
- docs/question-authoring.md の「1. 現在の問題数と目標」の表のリスニングの行を、`node scripts/questions/plan.js` の結果に合わせて更新する。

## 5. push

```bash
./scripts/push.sh "feat(listening): リスニング問題を書き直し・追加(<今日の内容>)"
```

- push.sh が問題集の書き出し・lint・build・テストを実行し、失敗したら中断する。テストが失敗したら原因を直して再実行する(`DuplicateSetTests` で落ちたら、似ている既存セットと話題・語句を変える)。
- 直せないときは push しない。`--no-verify`・force push・テストの無効化はしない。
- main への push は本番(GitHub Pages / Render)に反映される。

## 6. 報告

作ったセットの ID・形式・レベル・題名、外した古い ID、`node scripts/questions/plan.js` の結果(書き直しの残り・総数)を短く報告する。
