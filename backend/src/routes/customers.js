import { Router } from "express";
import { store } from "../store/store.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    items: store.listCustomers(),
    groups: store.listGroups(),
  });
});

router.get("/:id", (req, res) => {
  const customer = store.getCustomer(req.params.id);
  if (!customer) return res.status(404).json({ error: { code: "NOT_FOUND", message: `Unknown customer: ${req.params.id}` } });
  res.json(customer);
});

export default router;
