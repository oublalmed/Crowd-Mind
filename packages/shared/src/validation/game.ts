import { GAME_CONSTANTS } from '../constants/game';
import { GameMode, GameSettings } from '../types/game';

const VALID_GAME_MODES: GameMode[] = ['crowd_mind', 'speed_vote', 'debate'];

export function validateGameMode(mode: string): mode is GameMode {
  return VALID_GAME_MODES.includes(mode as GameMode);
}

export function validateGameSettings(settings: Partial<GameSettings>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (settings.maxPlayers !== undefined) {
    if (settings.maxPlayers < GAME_CONSTANTS.MIN_PLAYERS || settings.maxPlayers > GAME_CONSTANTS.MAX_PLAYERS) {
      errors.push(`Max players must be between ${GAME_CONSTANTS.MIN_PLAYERS} and ${GAME_CONSTANTS.MAX_PLAYERS}`);
    }
  }

  if (settings.roundTimeSeconds !== undefined) {
    if (settings.roundTimeSeconds < 10 || settings.roundTimeSeconds > 120) {
      errors.push('Round time must be between 10 and 120 seconds');
    }
  }

  if (settings.totalRounds !== undefined) {
    if (settings.totalRounds < 1 || settings.totalRounds > 20) {
      errors.push('Total rounds must be between 1 and 20');
    }
  }

  return { valid: errors.length === 0, errors };
}
