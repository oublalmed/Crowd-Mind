/**
 * ScoringService — Strategy pattern implementation for game-mode-specific scoring.
 *
 * Each game mode has its own ScoringStrategy that determines how points are
 * awarded. The service selects the correct strategy at runtime via getStrategy().
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoteData {
  /** The option the player voted for */
  choice: string;
  /** Timestamp (epoch ms) when the vote was submitted */
  submittedAt: number;
}

export interface RoundResult {
  /** The option that received the majority of votes */
  majorityChoice: string;
  /** Total number of voters in the round */
  totalVoters: number;
  /** Number of voters who picked the majority choice */
  majorityCount: number;
  /** Timestamp (epoch ms) when the round started */
  roundStartedAt: number;
  /** Duration of the voting phase in seconds */
  phaseDurationSec: number;
  /** Map of userId -> previous-round choice (used by DebateScoring) */
  previousChoices?: Record<string, string>;
  /** Map of userId -> current-round choice (used by DebateScoring) */
  currentChoices?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Strategy interface
// ---------------------------------------------------------------------------

export interface ScoringStrategy {
  /**
   * Calculate the score earned by a single player for a single round.
   *
   * @param vote        The player's vote data for this round
   * @param roundResult Aggregated round outcome
   * @param timeElapsed Milliseconds from round start to vote submission
   * @returns           Points earned (non-negative integer)
   */
  calculateScore(vote: VoteData, roundResult: RoundResult, timeElapsed: number): number;
}

// ---------------------------------------------------------------------------
// CrowdMindScoring — default mode
// ---------------------------------------------------------------------------

/**
 * Points are awarded for voting with the majority.
 * A speed bonus rewards faster votes (up to +50 points).
 *
 * Base:  100 points for a majority vote, 0 otherwise.
 * Speed: Linear bonus from 50 (instant) to 0 (at deadline).
 * Streak multiplier can be layered on externally.
 */
export class CrowdMindScoring implements ScoringStrategy {
  private static readonly BASE_POINTS = 100;
  private static readonly MAX_SPEED_BONUS = 50;

  calculateScore(vote: VoteData, roundResult: RoundResult, timeElapsed: number): number {
    // Server-authoritative: reject votes submitted after the phase ends
    const phaseDurationMs = roundResult.phaseDurationSec * 1000;
    if (timeElapsed < 0 || timeElapsed > phaseDurationMs) {
      return 0; // anti-cheat: invalid timing
    }

    const votedWithMajority = vote.choice === roundResult.majorityChoice;
    if (!votedWithMajority) {
      return 0;
    }

    // Speed bonus: linear decay from MAX_SPEED_BONUS to 0
    const timeRatio = Math.max(0, 1 - timeElapsed / phaseDurationMs);
    const speedBonus = Math.round(CrowdMindScoring.MAX_SPEED_BONUS * timeRatio);

    return CrowdMindScoring.BASE_POINTS + speedBonus;
  }
}

// ---------------------------------------------------------------------------
// SpeedVoteScoring — speed-focused mode
// ---------------------------------------------------------------------------

/**
 * Points are awarded purely on speed of vote, regardless of whether the
 * player voted with the majority. Faster = more points.
 *
 * Max 200 points (instant), linearly decaying to 10 at the deadline.
 */
export class SpeedVoteScoring implements ScoringStrategy {
  private static readonly MAX_POINTS = 200;
  private static readonly MIN_POINTS = 10;

  calculateScore(_vote: VoteData, roundResult: RoundResult, timeElapsed: number): number {
    const phaseDurationMs = roundResult.phaseDurationSec * 1000;
    if (timeElapsed < 0 || timeElapsed > phaseDurationMs) {
      return 0; // anti-cheat
    }

    const timeRatio = Math.max(0, 1 - timeElapsed / phaseDurationMs);
    const points =
      SpeedVoteScoring.MIN_POINTS +
      Math.round((SpeedVoteScoring.MAX_POINTS - SpeedVoteScoring.MIN_POINTS) * timeRatio);

    return points;
  }
}

// ---------------------------------------------------------------------------
// DebateScoring — persuasion mode
// ---------------------------------------------------------------------------

/**
 * Points are awarded based on how many other players switched their vote
 * to match this player's choice compared to the previous round.
 *
 * 25 points per player persuaded (changed to this player's choice).
 * Bonus 50 points if the player held the majority at the end.
 */
export class DebateScoring implements ScoringStrategy {
  private static readonly POINTS_PER_PERSUASION = 25;
  private static readonly MAJORITY_BONUS = 50;

  calculateScore(vote: VoteData, roundResult: RoundResult, timeElapsed: number): number {
    const phaseDurationMs = roundResult.phaseDurationSec * 1000;
    if (timeElapsed < 0 || timeElapsed > phaseDurationMs) {
      return 0; // anti-cheat
    }

    let persuasionPoints = 0;

    // Count players who switched TO this player's choice
    if (roundResult.previousChoices && roundResult.currentChoices) {
      for (const [userId, currentChoice] of Object.entries(roundResult.currentChoices)) {
        const previousChoice = roundResult.previousChoices[userId];
        if (
          previousChoice !== undefined &&
          previousChoice !== currentChoice &&
          currentChoice === vote.choice
        ) {
          persuasionPoints += DebateScoring.POINTS_PER_PERSUASION;
        }
      }
    }

    // Majority bonus
    const majorityBonus =
      vote.choice === roundResult.majorityChoice ? DebateScoring.MAJORITY_BONUS : 0;

    return persuasionPoints + majorityBonus;
  }
}

// ---------------------------------------------------------------------------
// Strategy selector
// ---------------------------------------------------------------------------

export type GameMode = 'crowd_mind' | 'speed_vote' | 'debate' | string;

const strategyMap: Record<string, ScoringStrategy> = {
  crowd_mind: new CrowdMindScoring(),
  speed_vote: new SpeedVoteScoring(),
  debate: new DebateScoring(),
};

/**
 * Return the appropriate ScoringStrategy for a given game mode.
 * Falls back to CrowdMindScoring for unknown modes.
 */
export function getStrategy(gameMode: GameMode): ScoringStrategy {
  return strategyMap[gameMode] ?? strategyMap['crowd_mind'];
}

const ScoringService = {
  CrowdMindScoring,
  SpeedVoteScoring,
  DebateScoring,
  getStrategy,
};

export default ScoringService;
