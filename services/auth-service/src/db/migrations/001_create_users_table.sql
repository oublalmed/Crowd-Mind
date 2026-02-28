-- Migration: 001_create_users_table
-- Description: Creates the users table for authentication and player profiles

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(254) UNIQUE NOT NULL,
    username        VARCHAR(20) UNIQUE NOT NULL,
    display_name    VARCHAR(50) NOT NULL,
    password_hash   VARCHAR(255),
    provider        VARCHAR(10) NOT NULL DEFAULT 'email',
    provider_id     VARCHAR(255),
    skill_rating    INTEGER DEFAULT 1000,
    level           INTEGER DEFAULT 1,
    xp              INTEGER DEFAULT 0,
    is_premium      BOOLEAN DEFAULT false,
    premium_expires_at TIMESTAMPTZ,
    avatar_url      TEXT,
    bio             VARCHAR(200),
    preferences     JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups on login and search
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- Trigger to auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
