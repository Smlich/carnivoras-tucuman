import { z } from 'zod';

export const assistantImageSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  dataBase64: z.string().trim().min(16).max(2_900_000),
});

export const careAssistantRequestSchema = z.object({
  question: z.string().trim().min(4, 'Contanos un poco más sobre tu planta.').max(600),
  species: z.string().trim().max(80).default(''),
  locationContext: z.string().trim().max(120).default(''),
  image: assistantImageSchema.nullable().optional(),
});

export const catalogRecommendRequestSchema = z.object({
  query: z.string().trim().min(4, 'Contanos cómo es tu espacio o qué buscás.').max(500),
  sunlight: z.enum(['', 'sol-directo', 'sol-parcial', 'luz-brillante-sin-sol', 'interior-luminoso']).default(''),
  experience: z.enum(['', 'principiante', 'intermedio', 'coleccionista']).default(''),
  budgetMaxARS: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().min(0).max(500_000).optional(),
  ),
});

export const adminCopyRequestSchema = z.object({
  target: z.enum(['product', 'gallery']),
  name: z.string().trim().max(120).default(''),
  species: z.string().trim().max(120).default(''),
  category: z.string().trim().max(60).default(''),
  price: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(0).max(10_000_000).optional(),
  ),
  note: z.string().trim().max(120).default(''),
  existingDescription: z.string().trim().max(500).default(''),
  image: assistantImageSchema.nullable().optional(),
  imageUrl: z.string().trim().max(300).default(''),
});
