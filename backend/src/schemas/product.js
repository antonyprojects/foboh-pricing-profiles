import { z } from "zod";

export const productListQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  brand: z.string().trim().min(1).optional(),
  subCategory: z.string().trim().min(1).optional(),
  segment: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
