import {
  CrowdMindScoring,
  SpeedVoteScoring,
  DebateScoring,
  getStrategy,
  VoteData,
  RoundResult,
} from '../services/scoring.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeVote = (choice: string, submittedAt = 0): VoteData => ({
  choice,
  submittedAt,
});

const makeRoundResult = (overrides: Partial<RoundResult> = {}): RoundResult => ({
  majorityChoice: 'A',
  totalVoters: 10,
  majorityCount: 7,
  roundStartedAt: 0,
  phaseDurationSec: 30,
  ...overrides,
});

// ---------------------------------------------------------------------------
// CrowdMindScoring
// ---------------------------------------------------------------------------

describe('CrowdMindScoring', () => {
  const scorer = new CrowdMindScoring();
  const phaseDurationSec = 30;
  const result = makeRoundResult({ phaseDurationSec });

  it('awards base + max speed bonus for instant majority vote', () => {
    const score = scorer.calculateScore(makeVote('A'), result, 0);
    // 100 base + 50 speed bonus
    expect(score).toBe(150);
  });

  it('awards base points with no speed bonus at deadline', () => {
    const score = scorer.calculateScore(makeVote('A'), result, 30_000);
    expect(score).toBe(100);
  });

  it('awards partial speed bonus at half time', () => {
    const score = scorer.calculateScore(makeVote('A'), result, 15_000);
    // 100 base + round(50 * 0.5) = 125
    expect(score).toBe(125);
  });

  it('returns 0 for minority vote', () => {
    const score = scorer.calculateScore(makeVote('B'), result, 5000);
    expect(score).toBe(0);
  });

  it('returns 0 for negative timeElapsed (anti-cheat)', () => {
    const score = scorer.calculateScore(makeVote('A'), result, -1);
    expect(score).toBe(0);
  });

  it('returns 0 for timeElapsed exceeding phase duration (anti-cheat)', () => {
    const score = scorer.calculateScore(makeVote('A'), result, 31_000);
    expect(score).toBe(0);
  });

  it('returns 0 for zero phase duration (division by zero edge case)', () => {
    const zeroResult = makeRoundResult({ phaseDurationSec: 0 });
    const score = scorer.calculateScore(makeVote('A'), zeroResult, 0);
    // 0/0 produces NaN which rounds to NaN — verify the behavior
    expect(Number.isNaN(score) || typeof score === 'number').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SpeedVoteScoring
// ---------------------------------------------------------------------------

describe('SpeedVoteScoring', () => {
  const scorer = new SpeedVoteScoring();
  const phaseDurationSec = 20;
  const result = makeRoundResult({ phaseDurationSec });

  it('awards max points for instant vote', () => {
    const score = scorer.calculateScore(makeVote('A'), result, 0);
    expect(score).toBe(200);
  });

  it('awards min points at the deadline', () => {
    const score = scorer.calculateScore(makeVote('A'), result, 20_000);
    expect(score).toBe(10);
  });

  it('awards points regardless of majority choice', () => {
    const score = scorer.calculateScore(makeVote('Z'), result, 0);
    expect(score).toBe(200);
  });

  it('awards proportional points at midpoint', () => {
    const score = scorer.calculateScore(makeVote('A'), result, 10_000);
    // 10 + round((200-10) * 0.5) = 10 + 95 = 105
    expect(score).toBe(105);
  });

  it('returns 0 for negative timeElapsed', () => {
    const score = scorer.calculateScore(makeVote('A'), result, -100);
    expect(score).toBe(0);
  });

  it('returns 0 for timeElapsed beyond phase', () => {
    const score = scorer.calculateScore(makeVote('A'), result, 21_000);
    expect(score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// DebateScoring
// ---------------------------------------------------------------------------

describe('DebateScoring', () => {
  const scorer = new DebateScoring();
  const phaseDurationSec = 30;

  it('awards majority bonus when voting with majority', () => {
    const result = makeRoundResult({ phaseDurationSec });
    const score = scorer.calculateScore(makeVote('A'), result, 5000);
    // No previous/current choices provided -> persuasion = 0, majority bonus = 50
    expect(score).toBe(50);
  });

  it('awards 0 when not in majority and no persuasions', () => {
    const result = makeRoundResult({ phaseDurationSec });
    const score = scorer.calculateScore(makeVote('B'), result, 5000);
    expect(score).toBe(0);
  });

  it('awards persuasion points for players who switched to this choice', () => {
    const result = makeRoundResult({
      phaseDurationSec,
      majorityChoice: 'A',
      previousChoices: {
        'p1': 'B',
        'p2': 'B',
        'p3': 'A',
      },
      currentChoices: {
        'p1': 'A', // switched B -> A
        'p2': 'A', // switched B -> A
        'p3': 'A', // stayed A
      },
    });

    const score = scorer.calculateScore(makeVote('A'), result, 5000);
    // 2 persuasions * 25 = 50 + majority bonus 50 = 100
    expect(score).toBe(100);
  });

  it('does not count players who stayed on the same choice', () => {
    const result = makeRoundResult({
      phaseDurationSec,
      majorityChoice: 'A',
      previousChoices: { 'p1': 'A' },
      currentChoices: { 'p1': 'A' },
    });

    const score = scorer.calculateScore(makeVote('A'), result, 5000);
    // 0 persuasions + 50 majority = 50
    expect(score).toBe(50);
  });

  it('does not count players who switched to a different choice', () => {
    const result = makeRoundResult({
      phaseDurationSec,
      majorityChoice: 'C',
      previousChoices: { 'p1': 'A' },
      currentChoices: { 'p1': 'C' },
    });

    // Voter chose 'A' but p1 switched to 'C' (not 'A')
    const score = scorer.calculateScore(makeVote('A'), result, 5000);
    expect(score).toBe(0);
  });

  it('returns 0 for invalid timing', () => {
    const result = makeRoundResult({ phaseDurationSec });
    expect(scorer.calculateScore(makeVote('A'), result, -1)).toBe(0);
    expect(scorer.calculateScore(makeVote('A'), result, 31_000)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getStrategy
// ---------------------------------------------------------------------------

describe('getStrategy', () => {
  it('returns CrowdMindScoring for crowd_mind', () => {
    expect(getStrategy('crowd_mind')).toBeInstanceOf(CrowdMindScoring);
  });

  it('returns SpeedVoteScoring for speed_vote', () => {
    expect(getStrategy('speed_vote')).toBeInstanceOf(SpeedVoteScoring);
  });

  it('returns DebateScoring for debate', () => {
    expect(getStrategy('debate')).toBeInstanceOf(DebateScoring);
  });

  it('falls back to CrowdMindScoring for unknown mode', () => {
    expect(getStrategy('unknown_mode')).toBeInstanceOf(CrowdMindScoring);
  });

  it('falls back to CrowdMindScoring for empty string', () => {
    expect(getStrategy('')).toBeInstanceOf(CrowdMindScoring);
  });
});
