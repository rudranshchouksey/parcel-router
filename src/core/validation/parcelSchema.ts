import { z } from 'zod';

export const ParcelInputSchema = z.object({
  weight: z
    .number({ error: 'Weight is required' })
    .positive('Weight must be greater than 0')
    .max(10000, 'Weight cannot exceed 10,000 kg'),
  value: z
    .number({ error: 'Value is required' })
    .min(0, 'Value cannot be negative')
    .max(10_000_000, 'Value cannot exceed €10,000,000'),
  destinationCountry: z.string().max(100).optional(),
  recipient: z.object({
    name: z.string().max(200),
    address: z.object({
      street: z.string().max(200).optional(),
      houseNumber: z.string().max(20).optional(),
      postalCode: z.string().max(20).optional(),
      city: z.string().max(100).optional(),
    }).optional(),
  }).optional(),
});

export type ParcelInput = z.infer<typeof ParcelInputSchema>;
