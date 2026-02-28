export const RATE_LIMITS = {
  LOGIN: { windowMs: 60000, max: 5 },
  API_DEFAULT: { windowMs: 60000, max: 100 },
  GAME_ACTIONS: { windowMs: 1000, max: 10 },
  VOTE: { windowMs: 5000, max: 1 },
} as const;

export const AD_LIMITS = {
  INTERSTITIAL_COOLDOWN_MS: 180000, // 3 minutes between interstitials
  MAX_IMPRESSIONS_PER_DAY: 3,
  REWARDED_COOLDOWN_MS: 60000, // 1 minute between rewarded ads
} as const;

export const FREE_TIER_LIMITS = {
  DAILY_GAMES: 5,
} as const;

export const LEADERBOARD_LIMITS = {
  PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;
