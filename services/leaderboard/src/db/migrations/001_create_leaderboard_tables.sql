-- Leaderboard archive table
-- Stores historical leaderboard snapshots after weekly/season resets
CREATE TABLE IF NOT EXISTS leaderboard_archive (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            VARCHAR(20) NOT NULL,            -- 'weekly', 'season', 'daily'
    season_id       VARCHAR(100),                    -- nullable for weekly-only archives
    week_number     INTEGER,                         -- ISO week number (nullable for season archives)
    user_id         UUID NOT NULL,
    score           DOUBLE PRECISION NOT NULL DEFAULT 0,
    rank            INTEGER NOT NULL,
    archived_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_archive_type ON leaderboard_archive (type);
CREATE INDEX IF NOT EXISTS idx_leaderboard_archive_user ON leaderboard_archive (user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_archive_season ON leaderboard_archive (season_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_archive_archived ON leaderboard_archive (archived_at);

-- Seasons table
-- Tracks game seasons with start/end dates and reward definitions
CREATE TABLE IF NOT EXISTS seasons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    start_date      TIMESTAMPTZ NOT NULL,
    end_date        TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT false,
    rewards         JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons (is_active);
CREATE INDEX IF NOT EXISTS idx_seasons_dates ON seasons (start_date, end_date);
