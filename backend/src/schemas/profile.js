import { z } from "zod";

/**
 * Schemas for pricing profiles.
 *
 * Customer scope and product scope are discriminated unions on `kind`.
 * Refinements check that the required field for each kind is present —
 * cleaner than a giant superRefine and gives better error messages.
 */

export const customerScopeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("customer"),
    customerId: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("customer_group"),
    groupId: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("all_customers"),
  }),
]);

export const productScopeSchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("sku"),
      sku: z.string().trim().min(1),
      skus: z.array(z.string().trim().min(1)).optional(),
    }),
    z.object({
      kind: z.literal("brand"),
      brand: z.string().trim().min(1),
      skus: z.array(z.string().trim().min(1)).optional(),
    }),
    z.object({
      kind: z.literal("sub_category"),
      subCategory: z.string().trim().min(1),
      skus: z.array(z.string().trim().min(1)).optional(),
    }),
    z.object({
      kind: z.literal("segment"),
      segment: z.string().trim().min(1),
      skus: z.array(z.string().trim().min(1)).optional(),
    }),
    z.object({
      kind: z.literal("all_products"),
      skus: z.array(z.string().trim().min(1)).optional(),
    }),
  ]);

export const adjustmentSchema = z
  .object({
    kind: z.enum(["fixed", "dynamic", "absolute"]),
    direction: z.enum(["increase", "decrease"]).optional(),
    value: z.number().finite().min(0),
  })
  .superRefine((adj, ctx) => {
    if (adj.kind === "fixed" || adj.kind === "dynamic") {
      if (!adj.direction) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "`direction` is required for fixed/dynamic adjustments",
          path: ["direction"],
        });
      }
    }
    if (adj.kind === "dynamic" && adj.value > 100) {
      // A discount larger than 100% would zero everything; an increase
      // larger than 100% is allowed (e.g. premium pricing).
      if (adj.direction === "decrease") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Dynamic decrease cannot exceed 100%",
          path: ["value"],
        });
      }
    }
  });

export const createProfileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  customerScope: customerScopeSchema,
  productScope: productScopeSchema,
  adjustment: adjustmentSchema,
  priority: z.number().int().min(0).max(1_000_000).optional().default(100),
  active: z.boolean().optional().default(true),
});

export const profileIdParamSchema = z.object({
  id: z.string().trim().min(1),
});
