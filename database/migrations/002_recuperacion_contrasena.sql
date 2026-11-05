-- Aplicar una sola vez con psql -v ON_ERROR_STOP=1. No elimina usuarios ni formularios.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS password_reset_tokens (
 id bigserial PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash char(64) NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
COMMIT;
