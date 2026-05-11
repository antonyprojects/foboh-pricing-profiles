import { Router } from "express";
import { store } from "../store/store.js";
import { newId } from "../utils/id.js";
import { validate } from "../middleware/validate.js";
import { createProfileSchema, profileIdParamSchema } from "../schemas/profile.js";
import { HttpError } from "../middleware/errorHandler.js";
import { applyAdjustment, productsInScope } from "../services/pricing.js";
import { roundMoney } from "../utils/money.js";

const router = Router();

/**
 * Hydrate an input payload into a stored profile (adding id + timestamps).
 * Also validates that referenced customer/group ids actually exist —
 * Zod can validate shape; the store has to validate references.
 */
const hydrateForCreate = (input) => {
  assertScopeReferences(input);
  const now = new Date().toISOString();
  return {
    id: newId("prof"),
    name: input.name,
    description: input.description ?? null,
    customerScope: input.customerScope,
    productScope: input.productScope,
    adjustment: input.adjustment,
    priority: input.priority ?? 100,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
};

const assertScopeReferences = (input) => {
  const { customerScope } = input;
  if (customerScope.kind === "customer") {
    if (!store.getCustomer(customerScope.customerId)) {
      throw new HttpError(400, "INVALID_SCOPE", `Unknown customerId: ${customerScope.customerId}`);
    }
  } else if (customerScope.kind === "customer_group") {
    const groupExists = store.listGroups().some((g) => g.id === customerScope.groupId);
    if (!groupExists) {
      throw new HttpError(400, "INVALID_SCOPE", `Unknown groupId: ${customerScope.groupId}`);
    }
  }
  // Product scope referencing a non-existent sku is *allowed* — the
  // supplier might be authoring a profile for a SKU that's coming soon.
  // The resolver simply won't match it until the product exists.
};

// ============================================================ GET /api/profiles

router.get("/", (_req, res) => {
  res.json(store.listProfiles());
});

// ============================================================ POST /api/profiles/preview
// Defined before the param routes so :id never captures "preview".

router.post("/preview", validate({ body: createProfileSchema }), (req, res) => {
  const input = req.body;
  const products = productsInScope(store.listProducts(), input.productScope);

  const items = products.map((p) => {
    const newPrice = applyAdjustment(p.basePrice, input.adjustment);
    const delta = roundMoney(newPrice - p.basePrice);
    const deltaPct = p.basePrice === 0 ? 0 : roundMoney((delta / p.basePrice) * 100);
    return {
      sku: p.sku,
      title: p.title,
      basePrice: p.basePrice,
      newPrice,
      delta,
      deltaPct,
    };
  });

  const count = items.length;
  const sum = items.reduce(
    (acc, it) => ({ delta: acc.delta + it.delta, pct: acc.pct + it.deltaPct }),
    { delta: 0, pct: 0 },
  );

  res.json({
    items,
    summary: {
      count,
      avgDelta: count ? roundMoney(sum.delta / count) : 0,
      avgDeltaPct: count ? roundMoney(sum.pct / count) : 0,
    },
  });
});

// ============================================================ POST /api/profiles

router.post("/", validate({ body: createProfileSchema }), (req, res) => {
  const profile = hydrateForCreate(req.body);
  const saved = store.createProfile(profile);
  res.status(201).json(saved);
});

// ============================================================ GET /api/profiles/:id

router.get("/:id", validate({ params: profileIdParamSchema }), (req, res) => {
  const profile = store.getProfile(req.params.id);
  if (!profile) throw new HttpError(404, "NOT_FOUND", `Unknown profile: ${req.params.id}`);
  res.json(profile);
});

// ============================================================ PUT /api/profiles/:id

router.put(
  "/:id",
  validate({ params: profileIdParamSchema, body: createProfileSchema }),
  (req, res) => {
    if (!store.getProfile(req.params.id)) {
      throw new HttpError(404, "NOT_FOUND", `Unknown profile: ${req.params.id}`);
    }
    assertScopeReferences(req.body);
    const updated = store.updateProfile(req.params.id, {
      name: req.body.name,
      description: req.body.description ?? null,
      customerScope: req.body.customerScope,
      productScope: req.body.productScope,
      adjustment: req.body.adjustment,
      priority: req.body.priority ?? 100,
      active: req.body.active ?? true,
    });
    res.json(updated);
  },
);

// ============================================================ DELETE /api/profiles/:id

router.delete("/:id", validate({ params: profileIdParamSchema }), (req, res) => {
  const ok = store.deleteProfile(req.params.id);
  if (!ok) throw new HttpError(404, "NOT_FOUND", `Unknown profile: ${req.params.id}`);
  res.status(204).send();
});

export default router;
