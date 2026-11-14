-- 単語帳。利用者が覚えたい英単語と、その色(無色・青・黄・赤)・例文・日本語訳を持つ
CREATE TABLE IF NOT EXISTS wordbook_words (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    word VARCHAR(60) NOT NULL,
    meaning_ja TEXT,
    example_en TEXT,
    example_answer VARCHAR(60),
    example_ja TEXT,
    source VARCHAR(10) NOT NULL,
    color VARCHAR(10) NOT NULL,
    translation_status VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_wordbook_words_user_word UNIQUE (user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_wordbook_words_user_color ON wordbook_words(user_id, color);

-- 起動時・定期処理の状態(同梱語の投入版、日本語訳の調査を最後に行った日)
CREATE TABLE IF NOT EXISTS app_state (
    state_key VARCHAR(60) PRIMARY KEY,
    state_value VARCHAR(60) NOT NULL
);

-- 管理画面で登録していた単語を単語帳へ移す。訳があれば完了、無ければ翌日の調査に回す。
-- 同じ語(大文字小文字の違い)は1つだけ残し、既に移した語は重複させない
INSERT INTO wordbook_words (user_id, word, meaning_ja, example_en, example_answer, example_ja, source, color,
    translation_status, created_at, updated_at)
SELECT u.id, LOWER(w.word), w.meaning_ja, w.example_en, NULL, w.example_ja, 'MANUAL', 'NONE',
    CASE WHEN w.meaning_ja IS NOT NULL THEN 'DONE' ELSE 'PENDING' END,
    COALESCE(w.created_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
FROM words w
CROSS JOIN users u
WHERE w.word IS NOT NULL
  AND w.id IN (SELECT MIN(w2.id) FROM words w2 WHERE w2.word IS NOT NULL GROUP BY LOWER(w2.word))
  AND NOT EXISTS (
      SELECT 1 FROM wordbook_words x WHERE x.user_id = u.id AND x.word = LOWER(w.word)
  );
