-- 同梱語の品詞(v 動詞・adj 形容詞・n 名詞)と水準(1 易しい・2 標準)。
-- 4択の誤答を同じ品詞から選ぶ(品詞だけで選択肢が絞れないようにする)のと、易しい語を初期色の青にするために使う。
-- 手動・読解から登録した語は NULL(品詞が分からない語は、誤答を全体から選ぶ)
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS pos VARCHAR(10);
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS level INTEGER;
