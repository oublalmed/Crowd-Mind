-- Migration: 001_create_user_tables
-- Description: Creates user_stats and friend_requests tables
-- Note: The `users` table is owned by auth-service (001_create_users_table.sql)

CREATE TABLE IF NOT EXISTS user_stats (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    games_played    INTEGER NOT NULL DEFAULT 0,
    games_won       INTEGER NOT NULL DEFAULT 0,
    current_streak  INTEGER NOT NULL DEFAULT 0,
    best_streak     INTEGER NOT NULL DEFAULT 0,
    total_score     BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friend_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_friend_requests_status CHECK (status IN ('pending', 'accepted', 'rejected')),
    CONSTRAINT chk_friend_requests_different_users CHECK (from_user_id != to_user_id)
);

-- Indexes for user_stats
CREATE INDEX IF NOT EXISTS idx_user_stats_games ON user_stats (games_played DESC);

-- Indexes for friend_requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests (from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests (to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_pair
    ON friend_requests (LEAST(from_user_id, to_user_id), GREATEST(from_user_id, to_user_id))
    WHERE status != 'rejected';

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_stats_updated_at
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_friend_requests_updated_at
    BEFORE UPDATE ON friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
