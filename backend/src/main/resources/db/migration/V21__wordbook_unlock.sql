-- 同梱語の解放。同梱語は全部入れておき、利用者の一周目の進み具合に合わせて少しずつ出す(1日20語まで)。
-- 既存の語は、そのまま出す(ただし、同梱の w0601 以降で、まだ一度も出していない語は解放前にする)。
-- 手動・読解から登録した語は、いつも解放済み(bundled_id が NULL)。
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS unlocked BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE wordbook_words SET unlocked = FALSE
WHERE bundled_id > 'w0600' AND times_asked = 0;
