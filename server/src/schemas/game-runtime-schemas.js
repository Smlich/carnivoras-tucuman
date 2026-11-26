import { z } from 'zod';

export const gameScorePayloadSchema = z.object({
  score: z.coerce.number().int().min(0).max(100_000_000).default(0),
  highScore: z.coerce.number().int().min(0).max(100_000_000).default(0),
  maxCombo: z.coerce.number().int().min(0).max(100_000).default(0),
  levelReached: z.coerce.number().int().min(1).max(20).default(1),
  victory: z.boolean().default(false),
  elapsedSec: z.coerce.number().min(0).max(86_400).default(0),
  enemiesDefeated: z.coerce.number().int().min(0).max(1_000_000).default(0),
  damageTaken: z.coerce.number().int().min(0).max(100_000).default(0),
  petId: z.string().trim().min(1).max(40).default('batricio'),
});

const gameRuntimeConfigSchema = z.object({
  gameTitle: z.string().trim().min(1).max(100),
  gameSubtitle: z.string().trim().max(180).optional().default(''),
  player: z.record(z.string(), z.unknown()),
  species: z.record(z.string(), z.unknown()),
  enemies: z.record(z.string(), z.unknown()),
  waves: z.array(z.record(z.string(), z.unknown())).min(1).max(60),
  bosses: z.array(z.record(z.string(), z.unknown())).min(1).max(20),
}).passthrough();

export function validateGameRuntimeConfig(raw) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') {
    throw new Error('La configuración del juego debe ser un objeto JSON válido.');
  }
  const serialized = JSON.stringify(raw);
  if (serialized.length > 96_000) {
    throw new Error('La configuración del juego supera el tamaño máximo permitido.');
  }
  return gameRuntimeConfigSchema.parse(raw);
}
