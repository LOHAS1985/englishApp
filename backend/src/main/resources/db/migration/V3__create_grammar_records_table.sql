CREATE TABLE grammar_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    sentence TEXT NOT NULL,
    choice_a VARCHAR(255) NOT NULL,
    choice_b VARCHAR(255) NOT NULL,
    choice_c VARCHAR(255) NOT NULL,
    choice_d VARCHAR(255) NOT NULL,
    correct_choice CHAR(1) NOT NULL,
    selected_choice CHAR(1) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    explanation TEXT NOT NULL,
    translation TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_grammar_records_user_id ON grammar_records(user_id);