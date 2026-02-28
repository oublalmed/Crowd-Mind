-- Migration 001: Create game history and player results tables
-- Game Engine Service - Crowd Mind
--
-- This migration creates the persistent storage for completed games.
-- Live game state is managed in Redis; only completed games are written to PostgreSQL.

BEGIN;

-- Enable UUID generation if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- game_history: stores completed game sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mode            VARCHAR(50) NOT NULL,
    players         JSONB NOT NULL DEFAULT '[]'::jsonb,
    rounds          JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_rounds    INTEGER NOT NULL DEFAULT 0,
    duration        INTEGER NOT NULL DEFAULT 0,          -- total game duration in seconds
    winner_id       UUID,                                 -- user who won (nullable for draws)
    room_id         VARCHAR(64),                          -- original Redis room id for tracing
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMP WITH TIME ZONE
);

-- Index for looking up a user's game history efficiently
CREATE INDEX IF NOT EXISTS idx_game_history_players
    ON game_history USING gin (players);

-- Index for filtering by game mode
CREATE INDEX IF NOT EXISTS idx_game_history_mode
    ON game_history (mode);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS idx_game_history_completed_at
    ON game_history (completed_at DESC);

-- ============================================================================
-- game_player_results: per-player outcome for each game
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_player_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id         UUID NOT NULL REFERENCES game_history(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    final_score     INTEGER NOT NULL DEFAULT 0,
    rank            INTEGER NOT NULL DEFAULT 0,
    rating_change   INTEGER NOT NULL DEFAULT 0,           -- ELO / skill rating delta
    xp_earned       INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Fast lookups by game
CREATE INDEX IF NOT EXISTS idx_game_player_results_game_id
    ON game_player_results (game_id);

-- Fast lookups by user (game history per player)
CREATE INDEX IF NOT EXISTS idx_game_player_results_user_id
    ON game_player_results (user_id);

-- Unique constraint: one result row per player per game
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_player_results_unique
    ON game_player_results (game_id, user_id);

COMMIT;
