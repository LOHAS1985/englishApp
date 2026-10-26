-- 事前生成した問題のストック(未出題 = served が false)を区別する
ALTER TABLE grammar_questions ADD COLUMN IF NOT EXISTS served BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_grammar_questions_served ON grammar_questions(served, created_at);
