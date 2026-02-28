import dotenv from 'dotenv';

dotenv.config();

export interface MatchmakingConfig {
  /** Initial skill rating search range (plus/minus) */
  initialRange: number;
  /** How often to expand the search range (in milliseconds) */
  expandIntervalMs: number;
  /** How much to widen the range on each expansion */
  expandAmount: number;
  /** Maximum time a player can wait in queue before bot backfill (in milliseconds) */
  maxWaitMs: number;
  /** Minimum players required to start a match */
  minPlayers: number;
  /** Maximum players in a match */
  maxPlayers: number;
}

export interface GameConfig {
  port: number;
  wsPort: number;
  nodeEnv: string;

  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    maxConnections: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
  };

  redis: {
    host: string;
    port: number;
    password: string | undefined;
    db: number;
    keyPrefix: string;
  };

  matchmaking: MatchmakingConfig;

  game: {
    /** Default number of rounds per game */
    defaultRounds: number;
    /** Time allowed per voting phase (in seconds) */
    votingPhaseDurationSec: number;
    /** Time allowed for the results phase (in seconds) */
    resultsPhaseDurationSec: number;
    /** Room TTL in Redis (in seconds) */
    roomTtlSec: number;
    /** Grace period for disconnected players before removal (in seconds) */
    disconnectGraceSec: number;
  };

  cors: {
    origin: string | string[];
  };

  jwt: {
    secret: string;
  };
}

const config: GameConfig = {
  port: parseInt(process.env.GAME_ENGINE_PORT || '3003', 10),
  wsPort: parseInt(process.env.GAME_ENGINE_WS_PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'crowdmind_game',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMs: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMs: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '5000', 10),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: 'game-engine:',
  },

  matchmaking: {
    initialRange: parseInt(process.env.MATCHMAKING_INITIAL_RANGE || '100', 10),
    expandIntervalMs: parseInt(process.env.MATCHMAKING_EXPAND_INTERVAL || '5000', 10),
    expandAmount: parseInt(process.env.MATCHMAKING_EXPAND_AMOUNT || '50', 10),
    maxWaitMs: parseInt(process.env.MATCHMAKING_MAX_WAIT || '30000', 10),
    minPlayers: parseInt(process.env.MATCHMAKING_MIN_PLAYERS || '2', 10),
    maxPlayers: parseInt(process.env.MATCHMAKING_MAX_PLAYERS || '8', 10),
  },

  game: {
    defaultRounds: parseInt(process.env.GAME_DEFAULT_ROUNDS || '5', 10),
    votingPhaseDurationSec: parseInt(process.env.GAME_VOTING_PHASE_DURATION || '30', 10),
    resultsPhaseDurationSec: parseInt(process.env.GAME_RESULTS_PHASE_DURATION || '10', 10),
    roomTtlSec: parseInt(process.env.GAME_ROOM_TTL || '3600', 10),
    disconnectGraceSec: parseInt(process.env.GAME_DISCONNECT_GRACE || '30', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  },
};

export default config;
