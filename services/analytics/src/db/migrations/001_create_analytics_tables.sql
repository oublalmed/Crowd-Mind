-- Migration: 001_create_analytics_tables
-- Description: Creates tables for analytics event tracking and aggregation

CREATE TABLE IF NOT EXISTS analytics_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(100) NOT NULL,
    user_id         UUID,
    session_id      VARCHAR(100),
    room_id         VARCHAR(100),
    payload         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying events by type, user, and time range
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_room ON analytics_events (room_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events (created_at);

-- Composite index for user+type queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type ON analytics_events (user_id, event_type);
