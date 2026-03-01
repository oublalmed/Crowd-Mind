/**
 * Utility for validating and reading environment variables with type safety.
 * Throws at startup if required variables are missing, rather than
 * failing silently at runtime.
 */

export class EnvValidationError extends Error {
  public readonly missingVars: string[];

  constructor(missingVars: string[]) {
    super(
      `Missing required environment variables:\n${missingVars.map((v) => `  - ${v}`).join('\n')}`
    );
    this.name = 'EnvValidationError';
    this.missingVars = missingVars;
  }
}

/**
 * Read a required environment variable. Throws if not set.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Read an optional environment variable with a fallback.
 */
export function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

/**
 * Read an integer environment variable with a fallback.
 */
export function intEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid integer, got: ${value}`);
  }
  return parsed;
}

/**
 * Validate that all required environment variables are present.
 * Call at service startup to fail fast.
 */
export function validateEnv(required: string[]): void {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new EnvValidationError(missing);
  }
}

/**
 * Check if the current environment is production.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Ensure a secret is not a default/development value in production.
 */
export function validateSecret(name: string, value: string, insecureDefaults: string[]): void {
  if (isProduction() && insecureDefaults.includes(value)) {
    throw new Error(
      `SECURITY: ${name} is using an insecure default value in production. ` +
        `Set a proper value via environment variables.`
    );
  }
}
