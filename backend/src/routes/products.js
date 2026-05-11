import { Router } from "express";
import { store } from "../store/store.js";
import { validate } from "../middleware/validate.js";
import { productListQuerySchema } from "../schemas/product.js";
import { searchProducts } from "../services/productSearch.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();

router.get("/", validate({ query: productListQuerySchema }), (req, res) => {
  const { items, total } = searchProducts(store.listProducts(), req.query);
  res.json({ items, total, facets: store.productFacets() });
});

router.get("/:sku", (req, res) => {
  const product = store.getProduct(req.params.sku);
  if (!product) throw new HttpError(404, "NOT_FOUND", `Unknown SKU: ${req.params.sku}`);
  res.json(product);
});

export default router;
