import {
  requireEnv,
  optionalEnv,
  intEnv,
  validateEnv,
  validateSecret,
  isProduction,
  EnvValidationError,
} from '../config/env';

describe('requireEnv', () => {
  it('returns the value when set', () => {
    process.env.TEST_VAR = 'hello';
    expect(requireEnv('TEST_VAR')).toBe('hello');
    delete process.env.TEST_VAR;
  });

  it('throws when variable is not set', () => {
    delete process.env.MISSING_VAR;
    expect(() => requireEnv('MISSING_VAR')).toThrow('Required environment variable');
  });
});

describe('optionalEnv', () => {
  it('returns value when set', () => {
    process.env.OPT_VAR = 'value';
    expect(optionalEnv('OPT_VAR', 'default')).toBe('value');
    delete process.env.OPT_VAR;
  });

  it('returns fallback when not set', () => {
    delete process.env.OPT_VAR;
    expect(optionalEnv('OPT_VAR', 'default')).toBe('default');
  });
});

describe('intEnv', () => {
  it('parses integer value', () => {
    process.env.INT_VAR = '42';
    expect(intEnv('INT_VAR', 0)).toBe(42);
    delete process.env.INT_VAR;
  });

  it('returns fallback when not set', () => {
    delete process.env.INT_VAR;
    expect(intEnv('INT_VAR', 99)).toBe(99);
  });

  it('throws on non-integer value', () => {
    process.env.INT_VAR = 'not-a-number';
    expect(() => intEnv('INT_VAR', 0)).toThrow('valid integer');
    delete process.env.INT_VAR;
  });
});

describe('validateEnv', () => {
  it('passes when all variables are set', () => {
    process.env.A = '1';
    process.env.B = '2';
    expect(() => validateEnv(['A', 'B'])).not.toThrow();
    delete process.env.A;
    delete process.env.B;
  });

  it('throws EnvValidationError with missing variables', () => {
    delete process.env.MISSING_A;
    delete process.env.MISSING_B;

    try {
      validateEnv(['MISSING_A', 'MISSING_B']);
      fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError);
      expect((err as EnvValidationError).missingVars).toEqual(['MISSING_A', 'MISSING_B']);
    }
  });
});

describe('validateSecret', () => {
  const origEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
  });

  it('does not throw in development with insecure default', () => {
    process.env.NODE_ENV = 'development';
    expect(() => validateSecret('JWT_SECRET', 'changeme', ['changeme'])).not.toThrow();
  });

  it('throws in production with insecure default', () => {
    process.env.NODE_ENV = 'production';
    expect(() => validateSecret('JWT_SECRET', 'changeme', ['changeme'])).toThrow('SECURITY');
  });

  it('does not throw in production with secure value', () => {
    process.env.NODE_ENV = 'production';
    expect(() =>
      validateSecret('JWT_SECRET', 'a-very-long-secure-random-secret-value', ['changeme'])
    ).not.toThrow();
  });
});

describe('isProduction', () => {
  const origEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
  });

  it('returns true when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    expect(isProduction()).toBe(true);
  });

  it('returns false when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    expect(isProduction()).toBe(false);
  });
});
