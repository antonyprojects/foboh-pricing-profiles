import { Router } from "express";
import { store } from "../store/store.js";
import { validate } from "../middleware/validate.js";
import { productListQuerySchema } from "../schemas/product.js";
import { searchProducts } from "../services/productSearch.js";
import { HttpError, asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get(
  "/",
  validate({ query: productListQuerySchema }),
  asyncHandler((req, res) => {
    const { items, total } = searchProducts(store.listProducts(), req.query);
    res.json({ items, total, facets: store.productFacets() });
  }),
);

router.get(
  "/:sku",
  asyncHandler((req, res) => {
    const product = store.getProduct(req.params.sku);
    if (!product) throw new HttpError(404, "NOT_FOUND", `Unknown SKU: ${req.params.sku}`);
    // Note: we return inactive products here too. An inactive SKU is a
    // soft-delete; historical references must still resolve to *something*.
    // The resolver knows to short-circuit to base-price for inactive products.
    res.json(product);
  }),
);

export default router;
