import { z } from 'zod';
import { Parcel } from '@/core/engine/types';

// JSON batch format — modern API contract
const BatchJsonSchema = z.object({
  batchId: z.string().optional(),
  parcels: z.array(z.object({
    weight: z.number().positive('Weight must be positive'),
    value: z.number().min(0, 'Value cannot be negative'),
    destinationCountry: z.string().optional(),
    recipient: z.object({
      name: z.string(),
      address: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
      }).optional(),
    }).optional(),
  })),
});

export function parseJsonBatch(raw: unknown): {
  parcels: Parcel[];
  batchId: string;
  errors: string[];
} {
  const result = BatchJsonSchema.safeParse(raw);

  if (!result.success) {
    return {
      parcels: [],
      batchId: 'unknown',
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  return {
    parcels: result.data.parcels,
    batchId: result.data.batchId ?? crypto.randomUUID(),
    errors: [],
  };
}
