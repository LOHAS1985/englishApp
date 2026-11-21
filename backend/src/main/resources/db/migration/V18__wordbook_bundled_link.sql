-- 同梱語を、あとから内容を直して(訳・例文)既存の単語帳に反映できるようにする。
-- bundled_id: 同梱の語の ID(w0001 など)。手動・読解から登録した語は NULL
-- user_edited: 利用者が訳・例文を直した語。同梱の内容を更新するとき、この語は上書きしない
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS bundled_id VARCHAR(20);
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS user_edited BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS ux_wordbook_words_bundled ON wordbook_words(user_id, bundled_id);

-- 利用者が削除した同梱語。同梱の内容を更新しても、削除した語は戻さない
CREATE TABLE IF NOT EXISTS wordbook_bundled_deleted (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    bundled_id VARCHAR(20) NOT NULL,
    CONSTRAINT uq_wordbook_bundled_deleted UNIQUE (user_id, bundled_id)
);
