import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { resolvePrice } from "../services/resolver.js";

const router = Router();

const resolveQuerySchema = z.object({
  customerId: z.string().trim().min(1),
  sku: z.string().trim().min(1),
});

router.get(
  "/resolve",
  validate({ query: resolveQuerySchema }),
  asyncHandler((req, res) => {
    const result = resolvePrice(req.query.customerId, req.query.sku);
    res.json(result);
  }),
);

export default router;
