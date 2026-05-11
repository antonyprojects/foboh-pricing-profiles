import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler((_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), now: new Date().toISOString() });
  }),
);

export default router;
