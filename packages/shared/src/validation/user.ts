export function validateDisplayName(name: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (name.length < 1) {
    errors.push('Display name is required');
  }
  if (name.length > 50) {
    errors.push('Display name must not exceed 50 characters');
  }
  if (name.trim() !== name) {
    errors.push('Display name must not have leading or trailing spaces');
  }

  return { valid: errors.length === 0, errors };
}

export function validateBio(bio: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (bio.length > 200) {
    errors.push('Bio must not exceed 200 characters');
  }

  return { valid: errors.length === 0, errors };
}

export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const AVATAR_DIMENSIONS = { width: 256, height: 256 };
