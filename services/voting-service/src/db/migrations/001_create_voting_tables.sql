-- Migration: 001_create_voting_tables
-- Description: Creates tables for vote records and round results

CREATE TABLE IF NOT EXISTS votes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     VARCHAR(100) NOT NULL,
    round       INTEGER NOT NULL,
    user_id     UUID NOT NULL,
    choice      VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_votes_room_round_user UNIQUE (room_id, round, user_id)
);

CREATE TABLE IF NOT EXISTS round_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         VARCHAR(100) NOT NULL,
    round           INTEGER NOT NULL,
    winning_choice  VARCHAR(255),
    vote_counts     JSONB DEFAULT '{}',
    completed_at    TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_round_results_room_round UNIQUE (room_id, round)
);

-- Indexes for vote lookups
CREATE INDEX IF NOT EXISTS idx_votes_room ON votes (room_id);
CREATE INDEX IF NOT EXISTS idx_votes_room_round ON votes (room_id, round);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes (user_id);

-- Indexes for round results
CREATE INDEX IF NOT EXISTS idx_round_results_room ON round_results (room_id);
