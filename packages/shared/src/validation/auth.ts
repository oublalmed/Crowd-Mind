import { AUTH_CONSTANTS } from '../constants/auth';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < AUTH_CONSTANTS.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} characters`);
  }
  if (password.length > AUTH_CONSTANTS.PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${AUTH_CONSTANTS.PASSWORD_MAX_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  return { valid: errors.length === 0, errors };
}

export function validateUsername(username: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (username.length < AUTH_CONSTANTS.USERNAME_MIN_LENGTH) {
    errors.push(`Username must be at least ${AUTH_CONSTANTS.USERNAME_MIN_LENGTH} characters`);
  }
  if (username.length > AUTH_CONSTANTS.USERNAME_MAX_LENGTH) {
    errors.push(`Username must not exceed ${AUTH_CONSTANTS.USERNAME_MAX_LENGTH} characters`);
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  return { valid: errors.length === 0, errors };
}
