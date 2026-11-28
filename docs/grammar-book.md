# 文法の教科書: 内容の書き方

アプリの「文法の教科書」(`/grammar-book`)の内容を書く・直すときの決まり。**読んだ人が理解できることを最優先**にする。分量が増えてもよい。

- 内容: `frontend/src/content/grammarBook/chapters/<章の ID>.json`(全24章)
- 章の一覧(ID・番号・題名): `frontend/src/content/grammarBook/chapters.ts`
- 型: `types.ts` / 機械的な検査: `validate.ts`(`content.test.ts` が全章に対して実行する)
- 問題集の `point`(文法項目)と章の対応: `pointRules.json`。問題集に新しい `point` を足したら、規則も足す(`chapterOf.test.ts` が落ちる)

## 1. 読者と目標

- 読者: 日本語を母語とする学習者(本人)。TOEIC 930 点・英検準1級が目標だが、文法用語や基礎は**うろ覚えと考えて**、基礎から順に説明する。
- 目標: 読み終えたとき、(1) その項目の**ルールと理由**が分かり、(2) 自分で**例文を作れ**、(3) 試験の問題で**ひっかけに気づける**こと。
- 丸暗記の羅列にしない。「なぜそうなるか」を、日本語との違いに触れながら説明する。

## 2. 構成

```
章(Chapter)
 ├ lead        この章で学ぶこと・なぜ大事か(80字以上)
 ├ sections[]  節(Section)
 │   ├ intro      この節で分かること・どんな場面で困るか(40字以上)
 │   ├ keywords   問題の point に含まれる語(解答後のリンクが節に飛ぶために使う)
 │   ├ items[]    項目(Item) ← 学習の最小単位。例文を必ず1つ以上付ける
 │   │   ├ heading, explanation, table?, examples[], cautions?
 │   └ examNote?  試験(TOEIC Part 5・6、英検準1級)での出方とひっかけ
 ├ summary[]   章のまとめ(3〜12個の箇条書き)
 ├ quiz[]      確認問題(8〜15問、4択)
 └ related[]   関連する章の ID
```

### JSON の例(1項目)

```json
{
  "heading": "前置詞の後ろには「名詞のかたまり」が来る",
  "explanation": "前置詞(in, at, despite など)は、後ろに名詞・代名詞・動名詞のどれかを置くことばです。**後ろに「主語 + 動詞」を続けることはできません。**\n\n「〜にもかかわらず」を表す despite は前置詞なので、後ろは名詞のかたまりです。同じ意味でも although は接続詞なので、後ろに「主語 + 動詞」を続けます。\n\n見分け方は、空所の後ろを見ることです。名詞のかたまりなら前置詞、「主語 + 動詞」なら接続詞を選びます。",
  "table": {
    "caption": "「〜にもかかわらず」の言い方",
    "headers": ["品詞", "語", "後ろに来る形"],
    "rows": [["前置詞", "despite / in spite of", "名詞・動名詞"], ["接続詞", "although / though", "主語 + 動詞"]]
  },
  "examples": [
    {
      "en": "**Despite** the heavy rain, the match went ahead.",
      "ja": "大雨にもかかわらず、試合は予定どおり行われた。",
      "note": "the heavy rain は名詞のかたまりなので、前置詞 Despite を使う"
    },
    {
      "en": "**Although** it rained heavily, the match went ahead.",
      "ja": "大雨だったが、試合は予定どおり行われた。",
      "note": "it rained(主語 + 動詞)が続くので、接続詞 Although を使う"
    }
  ],
  "cautions": ["× Despite it rained heavily, ... は誤り。Despite の後ろに「主語 + 動詞」は置けない"]
}
```

## 3. 書き方の決まり

### 3.1 説明(explanation)

- **最初に結論を1〜2文**で言う(その項目で一番大事なこと)。続けて、理由・仕組み、見分け方の手順、例外の順に書く。
- 用語は**初出で必ず説明**する(例:「他動詞(目的語が必要な動詞)」「先行詞(関係詞の前にある名詞)」)。説明は章ごとに繰り返してよい。
- 日本語と英語の発想の違いが原因の間違いは、その違いを書く(例: 日本語の「〜に」「〜を」と英語の自動詞・他動詞は対応しない)。
- 規則には**例外・紛らわしい場合も書く**。ただし、根拠のない断定や、実在しない規則を書かない。
- 長さの目安: 通常の項目は 200〜500 字、重要な項目は 500〜900 字。段落は空行(`\n\n`)で区切る。行頭の「・」は箇条書きとして表示される。
- 表(`table`)を積極的に使う(活用・語尾・使い分け・比較)。表の各行の列数は `headers` と同じにする。
- 数字・割合・頻度を、根拠なく書かない(「TOEIC の約30%が…」は不可)。「よく出る」「ひっかけに使われやすい」程度の定性的な表現にする。
- 英米の違いや、用法が揺れる場合は、そのことを明記する。
- 文章に HTML・Markdown の見出し(`#`)・コードブロックは使えない。強調は `**語**` だけ。
- 他の章を参照するときは「第N章「題名」」と書く(例: 「第9章「比較」」)。番号と題名は `chapters.ts` の一覧に合わせる。

### 3.2 例文(examples)

- **すべての項目に、例文を1つ以上**付ける(検査で必須)。中心になる項目・対比が大事な項目は2〜3つ付ける。対比する形(前置詞と接続詞など)は、並べて示す。
- `en`: 正しい自然な英文だけを書く(誤った英文は `cautions` に「× 〜」として書く)。8〜20語を目安に、日常・ビジネス・ニュースなど実際に使われる場面にする。注目する語・形を `**` で囲む。
- `ja`: 意味が通る自然な日本語訳。直訳で不自然にしない。
- `note`: 「なぜここがその形になるか」を具体的に一言。例文を読んだだけでポイントが分かるように書く。
- 同じ例文を何度も使い回さない。単語は、TOEIC 930 点・英検準1級の学習者に有益な範囲で、難しすぎない語を使う。

### 3.3 間違えやすい点(cautions)

- 学習者が実際に間違えやすい点を、1項目あたり0〜3個。「× 誤 → ○ 正」の形で書き、理由を1文添える。

### 3.4 試験での出方(examNote)

- その節の知識が、TOEIC Part 5・6、英検準1級(大問1・2)でどう問われるか、どんなひっかけがあるかを書く。解く手順(空所の前後のどこを見るか)を示す。

### 3.5 keywords(節ごと)

- 問題集の `point` に**含まれる語**を書く。例: 節「関係代名詞」の keywords は `["関係代名詞"]`、節「関係副詞」は `["関係副詞"]`。
- その章に対応する問題集の `point` の一覧は、作業用に渡される `points-<章の ID>.txt` にある。**一覧にある point はすべて、どれかの節の keywords に当てはまる**ようにする(検査で確かめる)。
- 問題集に該当する問題が無い節は、`keywords` を空の配列にしてよい。
- **1つの point が複数の節に当てはまるとき**: 画面は、一番長い keyword が当てはまる節を選ぶ(`sectionForPoint`)。例: point「関係代名詞(what)」は、keyword「(what)」の節(長さ6)が「関係代名詞」の節(長さ5)より優先される。広い語(「関係代名詞」「名詞」など)は基本の節に1つだけ置き、具体的な語は専用の節の keywords に長く書く。
- 同じ語が複数の節の keywords に入ると、どの節が開くか分かりにくくなるので、避ける。

## 4. 確認問題(quiz)

- 8〜15問(目安 10問)。章末で、**読んだ内容が理解できたかを確かめる**もの。本文の例文を写さず、別の文で出す。
- 形式は4択(A〜D)。TOEIC Part 5 風の空所(`-------`。ハイフン7つ)を基本にし、文の転換・話法のように形式が合わない章は、日本語の指示を `sentence` に含めてよい(例:「次の直接話法を間接話法にしたとき、空所に入る語は?」)。
- 難易度の配分: 基本 2〜3問 → 標準 4〜5問 → TOEIC 風の応用 2〜3問。
- 選択肢は、品詞・形が似た紛らわしい語にする(明らかに違うものばかりにしない)。
- **正解は必ず1つだけ**にする。各選択肢を空所に入れて、他の選択肢が文法的にも意味的にも成り立たないことを確かめる(正解が2つになる問題は不可)。
- `explanation`: 正解の理由(どの規則か)と、**他の選択肢がなぜ不可か**を書く(50字以上)。`translation`: 文全体の日本語訳。
- 正解の記号 A〜D は、章の中で偏らせない。目安は、問題数を4で割った数の前後(10問なら各 2〜3 問、13問なら各 3〜4 問)。1つの記号が全体の45%を超えると検査で落ちる。全章で見ても、各記号が20〜30%になるようにする。
- `id` は `<章の ID>-q01`, `-q02`, … の連番。

## 5. 分量の目安

| 章の重さ | 節 | 項目 | 例文 |
| --- | --- | --- | --- |
| 重い(品詞と語形・動詞・時制・法・接続詞・関係詞・前置詞・不定詞・分詞・比較) | 6〜10 | 40〜70 | 項目数以上 |
| 標準(名詞・代名詞・形容詞・副詞・動名詞・態・一致・倒置ほか) | 5〜8 | 25〜45 | 項目数以上 |
| 軽い(文・冠詞・疑問詞・助動詞・時制の一致と話法・文の転換) | 4〜7 | 18〜35 | 項目数以上 |

検査の下限(これ未満は落ちる): 3節以上、項目 12 以上、例文 20 以上、各項目の説明 80 字以上。**下限ではなく、上の目安を目指す。**

## 6. 用語の統一

- 品詞: 名詞・代名詞・動詞・形容詞・副詞・前置詞・接続詞・冠詞(間投詞)
- 文型: 第1文型 SV、第2文型 SVC、第3文型 SVO、第4文型 SVOO、第5文型 SVOC
- 動詞: 自動詞・他動詞、状態動詞・動作動詞、助動詞、準動詞(不定詞・動名詞・分詞)
- 名詞: 可算名詞・不可算名詞(数えられない名詞)、集合名詞、所有格
- 節: 主節・従属節、名詞節・形容詞節・副詞節
- 関係詞: 先行詞、関係代名詞(主格・目的格・所有格)、関係副詞、制限用法・非制限用法(継続用法)
- 仮定法: 仮定法過去・仮定法過去完了・仮定法未来、直説法
- 分詞: 現在分詞・過去分詞、分詞構文
- 英語の語・句は英語のまま書く(日本語で「〜」を使って意味を添える)。

## 7. 章ごとに必ず扱う内容

(これに加えて、標準的な英文法書が扱う内容を漏れなく書く。)

1. **品詞と語形(parts-of-speech)**: 8品詞と文中の働き(主語・目的語・補語・修飾)/語尾から品詞を見分ける(名詞・形容詞・副詞・動詞の語尾の表。-ly なのに形容詞の語(friendly, lovely など)の注意)/空所に入る品詞を決める手順(前後の語を見る)/同形の語と派生(fast, hard/hardly, late/lately, near/nearly, high/highly など)/紛らわしい語形のペア(economic/economical, considerable/considerate, respectful/respective, successful/successive, industrial/industrious, imaginary/imaginative, comprehensive/comprehensible, reliable/reliant, regrettable/regretful, eventual/eventful, informative/informed, sensible/sensitive, principal/principle, historic/historical, complimentary/complementary, alternate/alternative, credible/credulous など)/-ed と -ing の形容詞(interested/interesting)/数+単数名詞の複合形容詞(a five-year plan)/名詞を作る語尾の使い分け(-ation, -ment, -ness, -ity, -ance/-ence, -er/-or/-ee)。TOEIC Part 5 の品詞問題の解き方。
2. **文(sentence)**: 文の種類(平叙・疑問・命令・感嘆・付加疑問)/肯定文と否定文(not・never・no、部分否定と全体否定、二重否定)/文の要素(S・V・O・C・修飾語 M)/5文型と見分け方/第3文型と第4文型の書き換え(to と for の使い分け)/there is 構文/句と節/単文・重文・複文/主節と従属節/語順の基本/命令文(please・Let's・命令文 + and/or)/感嘆文(What / How)。確認問題は新規に作る(問題集に該当問題が無い)。
3. **名詞(noun)**: 可算・不可算、名詞の5分類/複数形(規則・不規則・単複同形・常に複数形)/不可算名詞の数え方(a piece of など)と、複数形にならない語(information, advice, furniture, equipment, luggage, news, evidence, research, progress, knowledge など)/集合名詞/所有格('s・of・二重所有格)/複合名詞/数量の表し方(a number of / the number of、many/much、few/little)/名詞の働き・同格。
4. **冠詞(article)**: a と an(発音で決まる)/the の用法(特定・既出・唯一・最上級・序数・the + 形容詞)/無冠詞(一般論の複数・不可算、固有名詞、交通手段 by bus、食事、学科、建物の本来の目的 go to school)/the を付ける固有名詞(川・海・山脈・新聞・公共の建物)/冠詞の位置(such a, quite a, half an hour, what a, so + 形容詞 + a)/慣用表現(in person, on time/in time, at the end/in the end, by the way)/総称用法。
5. **代名詞(pronoun)**: 人称代名詞の格変化の表/所有代名詞/再帰代名詞(再帰用法・強調用法・慣用表現 by oneself など)/指示代名詞(this/that、that of / those who)/不定代名詞(one/ones、it と one の違い、other/another/the other(s)、some/any、each/every/either/neither/both/all/none、-one/-body/-thing)/it の用法(人称・形式主語・形式目的語・天候時間距離・強調構文)/相互代名詞(each other)/所有格 whose。
6. **疑問詞(interrogative)**: 疑問代名詞(who/whom/whose/what/which)・疑問形容詞・疑問副詞/疑問文の語順/疑問詞が主語のとき/間接疑問(語順は平叙文、Do you know where ...? と Where do you think ...? の違い)/選択疑問/否定疑問・修辞疑問/what と which の使い分け/how の様々な形(how many/much/long/often/far/old)/疑問詞 + to 不定詞/疑問詞 + ever・on earth の強調。確認問題は新規に作る(問題集に該当問題が1問しかない)。
7. **形容詞(adjective)**: 限定用法・叙述用法(叙述にしか使えない語 alive, asleep, afraid, aware, alone / 限定にしか使えない語 main, mere, former など)/後置修飾(something important, enough)/形容詞の語順/数量形容詞(many/much/a lot of/plenty of、a few/few、a little/little、some/any、several、each/every)/数詞(基数・序数・分数・年号)/感情の -ed と -ing/the + 形容詞/形容詞 + 前置詞の語法/形容詞 + to 不定詞・that 節/意味が変わる形容詞(late, present, certain, ill)。
8. **副詞(adverb)**: 働き(動詞・形容詞・副詞・文全体の修飾)/形(-ly、形容詞と同形 fast/hard/early/late/high/near)/種類(様態・場所・時・頻度・程度・文修飾)/位置(頻度副詞の位置、副詞の語順)/enough・too・so・such/very と much の使い分け/already・yet・still/ago・before・since/just・ever・never・once/準否定(hardly, scarcely, barely, seldom, rarely)/also・too・either・as well/So do I・Neither do I/only の位置/形が似て意味が違う副詞(hard/hardly, late/lately, near/nearly, high/highly, most/mostly, short/shortly, close/closely, direct/directly, free/freely)。
9. **比較(comparison)**: 原級(as ... as、not as ... as、倍数表現、as many/much as、as ... as possible)/比較級(-er/more、不規則変化、than、差の表し方 by、強調 much/far/even/still/a lot、the + 比較級 of the two、比較級 and 比較級、The 比較級 ..., the 比較級 ...、no more than / not more than / no less than / not less than、superior/inferior/senior/junior/prior + to、比べるものをそろえる that of / those of)/最上級(the、in/of、by far、one of the、the + 序数 + 最上級、最上級の同じ意味を表す原級・比較級の構文)/慣用表現(would rather ... than、prefer A to B、not so much A as B、no more ... than(くじらの公式)、nothing but / anything but、no sooner ... than は倒置の章)。
10. **動詞(verb)**: 動詞の種類(be・一般・助動詞)/自動詞と他動詞(間違えやすい動詞: discuss, mention, marry, approach, reach, enter, attend, answer, resemble、lie/lay, rise/raise, sit/seat)/動詞の活用(規則・不規則の表)/状態動詞と動作動詞/第4文型・第5文型をとる動詞/使役動詞(make/let/have/get/help)/知覚動詞(see/hear/feel/watch/notice + O + 原形/-ing/過去分詞)/動詞の語法(suggest・propose・insist・demand・recommend・require + that 節、enable/allow/permit/forbid + O + to do、prevent/keep/stop O from -ing、remind/inform/notify/convince A of B、provide A with B、deprive/rob/rid A of B、blame/accuse A for/of B、regard A as B、replace A with B)/ask・tell・order・advise + O + to do/句動詞の基礎(語彙は別機能なので入口だけ)。
11. **時制(tense)**: 12の時制の全体像(現在・過去・未来 × 単純・進行・完了・完了進行)/現在形の用法(習慣・事実・確定した未来・時刻表)/過去形/未来を表す表現(will・be going to・現在進行形・現在形・be about to・be to・will be -ing・will have p.p.)の違い/進行形(進行形にしにくい状態動詞、意味で変わる have/think/see、always を伴う不満)/現在完了(継続・経験・完了・結果、for/since/already/yet/just/ever/never/once、過去を表す語句(yesterday, ago, last year, when)とは使えない、have been to と have gone to、It has been ... since)/過去完了/未来完了/完了進行形/時・条件の副詞節では未来のことも現在形/時の前置詞との関係。
12. **助動詞(modal)**: can/could、may/might、must/have to/must not/don't have to/need not、should/ought to、had better、will/would(意志・習慣・依頼)、used to と would の違い、used to / be used to / get used to の区別、shall、need・dare/助動詞 + have + 過去分詞(must have p.p., can't have p.p., may/might have p.p., should have p.p., could have p.p., need not have p.p., would have p.p.)/推量の強さの比較/丁寧な依頼・許可/提案・要求の that 節の should/would rather、may as well、cannot ... too、cannot help -ing。確認問題は新規に作る(問題集に該当問題が2問しかない)。
13. **不定詞(infinitive)**: 名詞的用法(主語・目的語・補語、疑問詞 + to、形式主語 it、形式目的語 it)/形容詞的用法(a house to live in、be to 構文)/副詞的用法(目的、感情の原因、判断の根拠、結果 only to、形容詞の限定 easy to do、enough to / too ... to / so ... as to)/意味上の主語(for 〜 / of 〜)/完了不定詞・進行・受動/原形不定詞/代不定詞/分離不定詞/独立不定詞(to be honest, to tell the truth, needless to say, to make matters worse)/不定詞をとる動詞の一覧/動詞 + O + to do/不定詞と動名詞で意味が変わる動詞/be about to・be supposed to・be likely to・have yet to・be due to。
14. **分詞(participle)**: 現在分詞と過去分詞/形容詞的用法(前置修飾・後置修飾)/補語としての分詞(SVC・SVOC、have O p.p.、get、leave)/感情の分詞(人と物で使い分け)/分詞構文(時・理由・条件・譲歩・付帯状況・連続動作、否定、完了形 Having p.p.、受動の Being の省略、独立分詞構文、with + O + 分詞)/慣用的な分詞構文(generally speaking, judging from, considering, given, granted, supposing, provided/providing, speaking of)/接続詞 + 分詞(while walking, when asked, if possible, unless otherwise stated)/動名詞と現在分詞の区別。
15. **動名詞(gerund)**: 名詞的用法(主語・目的語・補語・前置詞の目的語)/動名詞だけを目的語にとる動詞(enjoy, finish, avoid, mind, consider, give up, practice, admit, deny, miss, postpone/put off, suggest, recommend, imagine, escape, risk, quit, resist, appreciate, mention, delay など)/前置詞 to の後の動名詞(look forward to -ing, be used to -ing, object to, contribute to, devote oneself to, be committed to, in addition to, with a view to, when it comes to, be accustomed to)/意味上の主語/完了形・受動形(having p.p., being p.p.)/need・want・deserve・require + -ing/不定詞と動名詞で意味が変わる動詞(remember, forget, regret, try, stop, go on, mean)/動名詞を使った慣用表現(It is no use -ing, cannot help -ing, There is no -ing, be worth -ing, feel like -ing, on -ing, spend 〜 -ing, have trouble -ing, be busy -ing, go -ing)。
16. **法(mood)**: 直説法・命令法・仮定法の違い/仮定法過去(現在の事実に反する仮定、were)/仮定法過去完了(過去の事実に反する仮定)/混合型/仮定法未来(should / were to)/if の省略と倒置(Were I ..., Had I p.p., Should you ...)/I wish・if only・as if / as though・It is (high) time・would rather/if it were not for / but for / without(Were it not for, Had it not been for)/仮定法現在(要求・提案・命令の that 節の動詞は原形か should + 原形。demand, insist, suggest, propose, recommend, require, request, order, urge、vital, essential, necessary, important, imperative)/仮定を含む語句(otherwise, in case, suppose/supposing, provided that, as long as, what if)/丁寧な仮定法(I wonder if you could ...)/名詞・不定詞・主語に条件が隠れた文/直説法の条件文(現実的な条件)との区別。
17. **態(voice)**: 受動態の基本(be + 過去分詞)と、能動態との書き換え/時制・助動詞・完了・進行・不定詞・動名詞の受動態/第4文型の受動態/第5文型の受動態(be made to do のように to が戻る)・知覚動詞の受動態/群動詞の受動態(be looked after, be laughed at, be taken care of)/by 以外の前置詞をとる受動態(be known to/for/by/as, be covered with, be filled with, be made of/from/into, be interested in, be surprised at, be pleased with, be satisfied with, be disappointed with/at, be involved in, be engaged in, be married to, be located in, be concerned about/with, be composed of, be equipped with)/受動態にできない動詞(have, resemble, lack, fit, suit)/受動態を使う場面/get 受動態/It is said that ... と S is said to ...(be reported/believed/thought/expected to)/命令・否定・疑問の受動態/need + -ing/能動の形で受け身の意味(sell well, read well)。
18. **接続詞(conjunction)**: 等位接続詞(and, but, or, nor, so, yet, for)と相関接続詞(both A and B, either A or B, neither A nor B, not only A but also B, not A but B, whether A or B, not so much A as B)/名詞節を作る(that, whether/if, 疑問詞、同格の that、that 節をとる形容詞)/副詞節を作る接続詞(時・理由・目的・結果・条件・譲歩・対比・様態・範囲)の一覧と使い分け/**前置詞と接続詞の見分け**(because と because of、despite/in spite of と although、during と while、for と since、until と by、as と like、in case of と in case)/接続副詞(however, therefore, moreover, nevertheless, consequently, otherwise, meanwhile, thus, furthermore, besides, instead)と接続詞の区別(セミコロン)/whether と if の使い分け/ now that, in that, given that, provided that, as long as, in case, lest, albeit, insofar as, whereas, whereupon/時・条件の副詞節の現在形/that の省略/as の多義。
19. **関係詞(relative)**: 関係代名詞(who/whom/whose/which/that)の格と先行詞/関係代名詞の格の決め方(関係詞節に欠けている要素を見る)/that を使う場合・使えない場合/目的格の省略/前置詞 + 関係代名詞(in which, of whom, some of which, all of whom, the extent to which)/非制限用法(カンマ)と前文全体を先行詞とする which/what(名詞節の what、what is called, what is more, what is worse, what we call, A is to B what C is to D, what S is)/関係副詞(when, where, why, how)と関係代名詞の違い(後ろが完全な文か不完全な文か)/複合関係詞(whoever, whomever, whatever, whichever, wherever, whenever, however)/疑似関係代名詞(as, than, but)/関係詞節の動詞の一致(one of the 〜 who + 複数)/連鎖関係詞節(the man who I think is ...)/whose の用法/関係詞節の短縮(分詞)。
20. **前置詞(preposition)**: 前置詞の基本(後ろは名詞・代名詞・動名詞、主語 + 動詞は来ない)/時(at/on/in、by/until、for/during、within/in、since/from、before/after/prior to、throughout)/場所・方向(at/in/on、above/over/below/under/beneath、beside/besides、between/among、across/over/through、along/around、beyond/past、to/toward/into/onto/out of)/原因・理由・手段・材料・道具(by, with, in, from, of, out of, through)/原因の群前置詞(due to, owing to, because of, thanks to, on account of, as a result of)/譲歩・対比(despite, in spite of, notwithstanding, regardless of, irrespective of, for all)/関連(about, on, regarding, concerning, with regard to, with respect to, as for, as to, in terms of, pertaining to)/除外・追加(except, except for, apart from, aside from, but, other than, besides, in addition to, without, excluding, including, barring, save)/群前置詞(in front of, in case of, in charge of, on behalf of, in favor of, by means of, instead of, in place of, in lieu of, in exchange for, in accordance with, in compliance with, in conjunction with, in line with, contrary to, according to, ahead of, prior to, pursuant to, adjacent to, in the event of, in light of, in view of, with the exception of, by virtue of, on the grounds of, with a view to, at the expense of, in the face of, in the absence of, in the wake of, in anticipation of, in recognition of, in excess of, amid, subject to, contingent upon)/前置詞を含む慣用句(on time/in time, in the end/at the end, on purpose, by accident, in fact, at least/at most, on average, in advance, on schedule, out of order, under construction, in progress, on sale/for sale, in stock/out of stock, on duty, on leave, in particular)/動詞・形容詞・名詞と結びつく前置詞/紛らわしい前置詞の使い分け(by と until、during と while、between と among、since と for、in と within、over と above、beside と besides、through と throughout)。
21. **一致(agreement)**: 主語と動詞の数の一致の基本/主語と動詞が離れている文(修飾語句・挿入)/集合名詞(family, staff, committee, police, people)/A and B(一体のものは単数)/A as well as B・A with B・along with・together with・in addition to(A に一致)/either A or B・neither A nor B・not only A but also B(B に一致)/one of the + 複数名詞(単数)、a number of(複数)と the number of(単数)、a variety of/部分を表す表現(a lot of, some, most, all, half, the rest, the majority, percent、分数 + of + 名詞)/不定代名詞(each, every, everyone, none, neither, either, both, several, few, many)/金額・時間・距離は単数/学科名・国名・病名・news(-s で終わる単数)/疑問詞が主語/there + be(直後の名詞に一致)/名詞節・-ing・to 不定詞が主語のとき(単数)/倒置文(Here comes, Attached are, Among them is)/関係詞節の動詞の一致/代名詞の一致(each ... his or her / their、単数の they、one ... one's)/主語と補語。
22. **時制の一致と話法(sequence-narration)**: 時制の一致の原則(主節が過去のとき、従属節の動詞を過去系にする。現在→過去、過去→過去完了、will→would、can→could、may→might)/**例外**(不変の真理・現在の習慣・歴史上の事実・今も続く事実・仮定法・助動詞 should/ought to/must/had better、比較の than 節)/時・条件の副詞節/話法の転換(直接話法 ↔ 間接話法)の手順/平叙文(said that、told O that)・疑問文(asked if/whether、疑問詞 + 平叙文の語順)・命令文(told/ordered/asked O to do、not to do)・依頼・提案(suggested that / -ing)・感嘆文・Let's/代名詞・指示語・時・場所の副詞の変換の表(I→he/she、this→that、here→there、now→then、today→that day、tomorrow→the next day、yesterday→the day before、ago→before、last week→the week before、next→the following)/伝達動詞の使い分け(say と tell、ask、order、advise、warn、promise、explain、add、reply、announce、admit、deny)/2文以上の直接話法/報告の時点で事実が今も続く場合の時制/描出話法(概説)。確認問題は新規に作る(問題集に該当問題が無い)。
23. **倒置・省略・強調・挿入(inversion)**: 倒置(疑問文、否定語句が文頭に出る倒置: never, hardly ... when, scarcely ... when, no sooner ... than, not only ... but also, not until, only + 副詞句, little, seldom, rarely, nowhere, under no circumstances, on no account, at no time, in no way/so・neither・nor の倒置(So do I)/場所・方向を表す副詞句の倒置(Here comes, On the wall hangs)/補語の前置(So difficult was ..., Such was ...)/仮定法の if の省略/as 譲歩の倒置(Young as he is)/than・as の後の倒置)/省略(共通要素の省略、副詞節の主語 + be の省略 when possible・if necessary・though tired・while in London・unless otherwise specified・if any・if ever、代不定詞の to、代動詞 do、so/not(I think so / I hope not)、関係代名詞・that の省略)/強調(強調構文 It is/was ... that ...、疑問詞の強調 What is it that ...?、do による強調、再帰代名詞による強調、the very、疑問詞 + on earth/in the world/ever、否定の強調 not ... at all / by no means / not in the least)/挿入(, I think, / , as you know, / , however, / if any / if possible / so to speak / 連鎖関係詞節)と同格(カンマ、of、that、or)/ダッシュ・括弧。
24. **文の転換(transformation)**: 文の転換とは/能動 ↔ 受動/平叙 ↔ 疑問・感嘆(修辞疑問 Who knows? = Nobody knows.)/肯定 ↔ 否定(too ... to ↔ so ... that ... cannot、enough to ↔ so ... that ... can)/直接話法 ↔ 間接話法/単文・複文・重文の転換(名詞句 ↔ that 節、because of ↔ because、despite ↔ although、不定詞 ↔ so that、分詞構文 ↔ 接続詞、if ↔ unless / without、仮定法 ↔ 直説法)/比較の書き換え(原級・比較級・最上級、Nothing is more ... than ↔ the most ...)/無生物主語構文 ↔ 副詞句・副詞節(The rain prevented us from going ↔ Because of the rain, we couldn't go)/第3文型 ↔ 第4文型/It ... to / that ↔ 通常の語順/強調構文 ↔ 通常の文/関係詞 ↔ 接続詞・分詞(非制限用法 ↔ and he)/動詞 ↔ 名詞(名詞化)/同義表現の作り方の手順/英検ライティング・ビジネス英語での言い換えの活用。確認問題は新規に作る(問題集に該当問題が無い)。

## 8. 正確さのために

- 書いた内容は、**別の目で見直す**(正しい英語か、規則が正確か、例外を落としていないか、確認問題の正解が1つだけか)。見直しの観点:
  1. すべての例文が文法的に正しく自然か(特に前置詞・冠詞・語法)。ja の訳が en と合っているか。
  2. 説明が事実として正しいか。英米差・用法の揺れを断定していないか。根拠のない数字がないか。
  3. 説明の順序が分かりやすいか(結論 → 理由 → 手順 → 例外)。用語を説明せずに使っていないか。
  4. 確認問題: 正解が1つに決まるか、選択肢が全部成り立たないか(A〜D を空所に入れて確かめる)、解説が各選択肢に触れているか。
  5. 問題集の `point` の一覧が、すべて節の keywords に当てはまるか。
- 内容は AI(Claude)が書いたもので、公式の教材ではない。誤りに気づいたら、JSON を直せばアプリに反映される(版は PATCH を上げる)。

## 9. 作業の手順(書く人向け)

1. このファイルと `types.ts` を読む。
2. 担当の章の `points-<章の ID>.txt`(問題集の point の一覧)を読む。
3. `frontend/src/content/grammarBook/chapters/<章の ID>.json` を書く(有効な JSON。UTF-8)。ファイルが大きいときは、骨組みを書いてから節ごとに足してよい。英文中の `"` は `\"` と書く(日本語の引用は「」を使う)。
4. 検査する: `cd frontend && npx vitest run src/content/grammarBook -t "章 <章の ID>"`。落ちたら、メッセージの場所を直す。
5. 全項目の例文・全確認問題を、上の見直しの観点で読み返す。
