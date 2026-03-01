import {
  validateEmail,
  validatePassword,
  validateUsername,
} from '../validation/auth';
import { validateDisplayName, validateBio } from '../validation/user';
import { validateGameMode, validateGameSettings } from '../validation/game';

// =============================================================================
// Auth Validation
// =============================================================================

describe('validateEmail', () => {
  it('accepts a valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('accepts emails with subdomains', () => {
    expect(validateEmail('user@mail.example.co.uk')).toBe(true);
  });

  it('rejects emails without @', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  it('rejects emails without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('rejects emails with spaces', () => {
    expect(validateEmail('user @example.com')).toBe(false);
  });

  it('rejects emails longer than 254 characters', () => {
    const longEmail = 'a'.repeat(245) + '@test.com';
    expect(validateEmail(longEmail)).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts a valid password', () => {
    const result = validatePassword('SecurePass1');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePassword('Aa1bbbb');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('at least 8'));
  });

  it('rejects passwords without uppercase', () => {
    const result = validatePassword('lowercase123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('uppercase'));
  });

  it('rejects passwords without lowercase', () => {
    const result = validatePassword('UPPERCASE123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('lowercase'));
  });

  it('rejects passwords without digits', () => {
    const result = validatePassword('NoDigitsHere');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('digit'));
  });

  it('returns multiple errors for a weak password', () => {
    const result = validatePassword('abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects passwords longer than 128 characters', () => {
    const longPassword = 'Aa1' + 'x'.repeat(126);
    const result = validatePassword(longPassword);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('128'));
  });
});

describe('validateUsername', () => {
  it('accepts a valid username', () => {
    const result = validateUsername('player_1');
    expect(result.valid).toBe(true);
  });

  it('rejects usernames shorter than 3 characters', () => {
    const result = validateUsername('ab');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('at least 3'));
  });

  it('rejects usernames longer than 20 characters', () => {
    const result = validateUsername('a'.repeat(21));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('20'));
  });

  it('rejects usernames with special characters', () => {
    const result = validateUsername('user@name');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('letters, numbers, and underscores'));
  });

  it('accepts underscored usernames', () => {
    const result = validateUsername('cool_player_99');
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// User Validation
// =============================================================================

describe('validateDisplayName', () => {
  it('accepts a valid display name', () => {
    const result = validateDisplayName('John Doe');
    expect(result.valid).toBe(true);
  });

  it('rejects empty display name', () => {
    const result = validateDisplayName('');
    expect(result.valid).toBe(false);
  });

  it('rejects display names over 50 chars', () => {
    const result = validateDisplayName('a'.repeat(51));
    expect(result.valid).toBe(false);
  });

  it('rejects display names with leading spaces', () => {
    const result = validateDisplayName(' John');
    expect(result.valid).toBe(false);
  });

  it('rejects display names with trailing spaces', () => {
    const result = validateDisplayName('John ');
    expect(result.valid).toBe(false);
  });
});

describe('validateBio', () => {
  it('accepts a valid bio', () => {
    const result = validateBio('I love games!');
    expect(result.valid).toBe(true);
  });

  it('accepts empty bio', () => {
    const result = validateBio('');
    expect(result.valid).toBe(true);
  });

  it('rejects bio over 200 chars', () => {
    const result = validateBio('a'.repeat(201));
    expect(result.valid).toBe(false);
  });
});

// =============================================================================
// Game Validation
// =============================================================================

describe('validateGameMode', () => {
  it('accepts crowd_mind', () => {
    expect(validateGameMode('crowd_mind')).toBe(true);
  });

  it('accepts speed_vote', () => {
    expect(validateGameMode('speed_vote')).toBe(true);
  });

  it('accepts debate', () => {
    expect(validateGameMode('debate')).toBe(true);
  });

  it('rejects invalid mode', () => {
    expect(validateGameMode('battle_royale')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateGameMode('')).toBe(false);
  });
});

describe('validateGameSettings', () => {
  it('accepts valid settings', () => {
    const result = validateGameSettings({
      maxPlayers: 6,
      roundTimeSeconds: 30,
      totalRounds: 5,
    });
    expect(result.valid).toBe(true);
  });

  it('accepts empty settings (all optional)', () => {
    const result = validateGameSettings({});
    expect(result.valid).toBe(true);
  });

  it('rejects maxPlayers below minimum', () => {
    const result = validateGameSettings({ maxPlayers: 1 });
    expect(result.valid).toBe(false);
  });

  it('rejects maxPlayers above maximum', () => {
    const result = validateGameSettings({ maxPlayers: 100 });
    expect(result.valid).toBe(false);
  });

  it('rejects roundTime below 10', () => {
    const result = validateGameSettings({ roundTimeSeconds: 5 });
    expect(result.valid).toBe(false);
  });

  it('rejects roundTime above 120', () => {
    const result = validateGameSettings({ roundTimeSeconds: 300 });
    expect(result.valid).toBe(false);
  });

  it('rejects totalRounds below 1', () => {
    const result = validateGameSettings({ totalRounds: 0 });
    expect(result.valid).toBe(false);
  });

  it('rejects totalRounds above 20', () => {
    const result = validateGameSettings({ totalRounds: 25 });
    expect(result.valid).toBe(false);
  });
});
