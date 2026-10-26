# 問題集の作り方

アプリの問題はすべて `backend/src/main/resources/questions/<機能>/*.json` に置き、起動時に読み込んで出題する(実行時に AI で生成しない)。このドキュメントは、問題を追加するときの手順・形式・品質基準をまとめたもの。

## 1. 現在の問題数と目標

| 機能 | フォルダ | ID | 現在 | 当面の目標 | 最終目標 |
|---|---|---|---|---|---|
| 文法(TOEIC Part 5) | `grammar` | `g0001`〜 | 500問 | 500 | 1000 |
| 語彙(英検準1級 大問1・TOEIC) | `vocab` | `v0001`〜 | 500問 | 500 | 1000 |
| 読解 TOEIC Part 6 | `reading`(`toeic-part6`) | `r0001`〜 | 50セット | 50 | 100 |
| 読解 TOEIC Part 7 | `reading`(`toeic-part7`) | 〃 | 50セット | 50 | 100 |
| 読解 英検 大問2(空所補充) | `reading`(`eiken-cloze`) | 〃 | 25セット | 25 | 50 |
| 読解 英検 大問3(内容一致) | `reading`(`eiken-long`) | 〃 | 25セット | 25 | 50 |
| リスニング | `listening` | `l0001`〜 | 2セット | 150 | 300 |
| ライティング | `writing` | `w0001`〜 | 2題 | 75 | 150 |
| スピーキング(英検二次) | `speaking` | `s0001`〜 | 1セット | 25 | 50 |

問題を追加したらこの表を更新する。ID は機能ごとの通し番号で、既存の最大値の次から振る(重複すると起動時にエラーになる)。

## 2. 作業手順

1. **次の ID とファイル名を確認する**:各フォルダの最後のファイルを見て、続きの番号を使う。1ファイルの目安は、4択問題25問、セット問題10セット。
2. **問題を書く**:下の「3. 形式」に従う。**正解は必ず最初の選択肢(A)に書く**(書き間違いを防ぐため。記号は手順4で並べ替える)。
3. **構文チェック**:
   ```bash
   # リポジトリのルートで実行
   python scripts/questions/check.py backend/src/main/resources/questions/vocab/vocab-021.json
   ```
   値の後ろの余分なカンマ(`"…","}`)を自動修正し、JSON として読めるか・ID の範囲を表示する。
4. **正解記号を A〜D に均等にならす**:
   ```bash
   python scripts/questions/balance.py backend/src/main/resources/questions/vocab choice
   python scripts/questions/balance.py backend/src/main/resources/questions/reading set
   ```
   - `choice`:文法・語彙(4択の短文問題)、`set`:読解・リスニング(セット問題)
   - 正解以外の選択肢の並び順は保たれる。1問1行の JSON に整形される。
   - 解説に「A」「B」などの記号が書かれていると警告が出る。**解説では選択肢を記号ではなく語句で指す**(並べ替えると記号がずれるため)。「A を B に」のような構文説明の A・B は無視してよい。
5. **見直す**(「5. 品質チェック」)。問題が見つかった選択肢は、記号ではなく**語句を指定して差し替える**(並べ替え後は位置が変わるため)。
6. **テストして push**:`./scripts/push.sh "feat(vocab): 語彙問題を追加"`。形式チェックのテスト(`QuestionBanksTests` / `GrammarQuestionBankTests`)が CI でも実行される。

## 3. 形式

### 4択短文問題(文法・語彙)

```json
{"id":"v0001","point":"動詞","sentence":"The government decided to ------- the old law ...","choices":[{"label":"A","text":"repeal"},{"label":"B","text":"repel"},{"label":"C","text":"reveal"},{"label":"D","text":"revive"}],"answer":"A","explanation":"repeal は「(法律を)廃止する」。... repel は「追い払う」...","translation":"その法律は...廃止を決めた。"}
```

- `sentence`:空所は必ず `-------`(ハイフン7個)
- `point`:文法項目・品詞(例:`前置詞と接続詞`、`仮定法過去完了`、`形容詞(ビジネス)`)
- `explanation`:なぜ正解か+他の選択肢がなぜ誤りかを日本語で
- `translation`:正解を入れた文の和訳

### セット問題(読解・リスニング)

```json
{"id":"r0001","type":"toeic-part6","title":"Email: Office relocation","passage":"...[1]...[2]...","script":null,"situation":null,"translation":"本文の和訳","questions":[
  {"question":"[1]","choices":["by","until","within","since"],"answer":"A","explanation":"..."}]}
```

| type | 内容 | 必須 | 設問 |
|---|---|---|---|
| `toeic-part6` | メール・告知など100〜150語。空所 `[1]`〜`[4]` | `passage` | 4問(うち1問は文挿入) |
| `toeic-part7` | 単一文書(メール・広告・記事・チャット等)120〜250語 | `passage` | 2〜4問 |
| `eiken-cloze` | 英検 大問2。説明文250語前後、空所 `[1]`〜`[3]` | `passage` | 3問(選択肢は語句) |
| `eiken-long` | 英検 大問3。説明文400〜500語 | `passage` | 3〜4問 |
| `toeic-part3` | 2人の会話 | `script` | 3問 |
| `toeic-part4` | 1人のアナウンス・説明 | `script` | 3問 |
| `eiken-part1` | 会話 | `script` | 1問 |
| `eiken-part2` | 説明文 | `script` | 2問 |
| `eiken-part3` | Real-Life(状況+放送) | `script`・`situation` | 1問 |

- 選択肢は文字列の配列で4つ(記号は付けない)。`answer` は `A`〜`D`。
- `passage` の空所番号は設問の数だけ必要(テストで検査)。
- **リスニングの `script`**:全行を `Man: ` / `Woman: ` / `Narrator: ` のいずれかで始める。TTS が話者名で声を選ぶため、`Woman 2` のような名前は男性の声になるので使わない(テストで検査)。台本は解答後にだけ画面に表示される。

### ライティング

```json
{"id":"w0001","type":"opinion","topic":"Agree or disagree: ...","points":["Community","Costs","Elderly people","Mental health"],"passage":null}
{"id":"w0002","type":"summary","topic":"記事のタイトル","points":null,"passage":"200語前後の英文(3段落:現状・利点・問題点 が典型)"}
```

- `opinion`:英検準1級の意見論述。賛否両論ある社会問題。`points` は1〜2語で重複しない4つ。
- `summary`:要約問題。`passage` は160〜300語(テストで検査)。意見を含まない説明文。

### スピーキング(英検二次)

```json
{"id":"s0001","title":"A Community Garden","instruction":"You have one minute to prepare. ...","firstSentence":"One day, ...","scenes":["コマ1:...","コマ2:「That Saturday」...","コマ3:...","コマ4:..."],"narrationSample":"...","questions":[{"no":2,"question":"Please look at the fourth picture. If you were ..., what would you be thinking?","sampleAnswer":"..."},{"no":3,"question":"...","sampleAnswer":"..."},{"no":4,"question":"...","sampleAnswer":"..."}]}
```

- イラストの代わりに `scenes` で4コマの場面を日本語で説明する。2〜4コマ目には時間表現(「That evening」など)を入れる。
- `questions` は No.2(4コマ目の人物の気持ち)、No.3・No.4(社会的な話題への意見)の3つ。

## 4. 難易度の目安

- 目標は TOEIC 930点・英検準1級。学習者は現在 TOEIC 700点台。
- 文法:TOEIC 600〜800点レベルを土台に、900点レベル(倒置、仮定法の倒置、群前置詞、`economic / economical` のような紛らわしい語形)を3〜4割入れる。
- 語彙:英検準1級の大問1に近い語(`exacerbate`、`relinquish` など)を中心に、句動詞と TOEIC のビジネス語彙を混ぜる。易しすぎる語ばかりにしない。
- 読解・リスニング:話題はビジネス(TOEIC)と社会問題・科学(英検)を偏りなく。

## 5. 品質チェック(必ず見直す)

作成後に全問を読み直し、次の問題がないか確認する。今までの作成で実際に見つかった例を挙げる。

| よくある問題 | 例 | 直し方 |
|---|---|---|
| **正解が2つ取れる** | `strictly prohibited` と `strictly forbidden`、`postponed until` と `delayed until`、`respond to` と `reply to` | 誤答を、文法的・意味的に明確に誤りの語に替える |
| 誤答の語が名詞としても成り立つ | `Working in ...` に対する誤答 `Work in ...` | 冠詞が必要な可算名詞などに替える |
| 英文が不自然 | `keep on your seat belts`、`check with either` | 例文を書き直す |
| 解説・正解記号の書き損じ | 正解が A なのに `answer` が D | 正解を最初の選択肢に書くルールを守る |
| 品詞ラベルの誤り | 副詞なのに `point` が「形容詞」 | 修正する |
| JSON の構文エラー | `"text":"word","}` | `check.py` が自動修正する |
| 正解語の重複 | 同じ単語が別の問題でも正解 | 多少は可。多い場合は別の語に替える |

## 6. 時間の目安(Claude で作成した場合の実測)

| 種類 | 量 | 作成時間 |
|---|---|---|
| 文法・語彙 | 100問 | 約5〜7分(見直し込み) |
| Part 6 | 10セット | 約3分 |
| Part 7 | 10セット | 約3〜4分 |

1回の会話で作れるのは数百問程度。区切りのよいところで `push.sh` で push しておく。
