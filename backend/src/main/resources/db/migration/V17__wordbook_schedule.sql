-- 単語帳の出題を、正誤と間隔反復で決める。語ごとに出題回数・正解回数・復習の段階と次回の復習日を持つ。
-- review_stage が NULL の語は、まだ一度も出していない語(新規)。
-- 既存の解答記録からの埋め戻しは、起動時に WordbookScheduleBackfill が行う(DB によらず同じ結果にするため)
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS times_asked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS times_correct INTEGER NOT NULL DEFAULT 0;
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS review_stage INTEGER;
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS next_due_date DATE;
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS last_asked_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_wordbook_words_user_due ON wordbook_words(user_id, next_due_date);
