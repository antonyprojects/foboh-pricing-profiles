import { Router } from "express";
import { store } from "../store/store.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    items: store.listCustomers(),
    groups: store.listGroups(),
  });
});

router.get("/:id", (req, res) => {
  const customer = store.getCustomer(req.params.id);
  if (!customer) {
    throw new HttpError(404, "NOT_FOUND", `Unknown customer: ${req.params.id}`);
  }
  res.json(customer);
});

export default router;
