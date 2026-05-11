import { useEffect, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "@/redux/store";
import { fetchProducts } from "@/redux/productsSlice";
import { ProductFilterBar } from "@/components/ProductFilterBar";
import { ProductTable } from "@/components/ProductTable";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ProductListQuery } from "@/types/api";

export const ProductsPage = () => {
  const dispatch = useAppDispatch();
  const { items, total, facets, status, error } = useAppSelector((s) => s.products);

  const [query, setQuery] = useState<ProductListQuery>({});
  const debouncedQuery = useDebouncedValue(query, 200);

  useEffect(() => {
    dispatch(fetchProducts(debouncedQuery));
  }, [dispatch, debouncedQuery]);

  // Show the *post-filter* count as "matched" and store the original
  // catalogue size separately. On a real backend we'd return both;
  // here `total` from the response is already the post-filter count
  // since the backend filters, so we approximate "total catalogue" as
  // the largest count we've seen.
  const totalCatalogue = useMaxSeen(total);

  return (
    <div>
      <h2 className="section-title">Products</h2>
      <p className="section-sub">Catalogue browse with the same filter set the builder uses.</p>

      <ProductFilterBar
        facets={facets}
        query={query}
        onChange={setQuery}
        matchedCount={total}
        totalCount={totalCatalogue}
      />

      {status === "error" && <div className="alert error">{error}</div>}
      {status === "loading" && items.length === 0 ? (
        <div className="card muted">Loading…</div>
      ) : (
        <ProductTable products={items} />
      )}
    </div>
  );
};

// Keeps the highest seen `total` so the "X of Y" line stays stable
// while filters narrow the list. Ref-backed so we don't trigger an
// extra render just to update the max.
const useMaxSeen = (current: number) => {
  const max = useRef(current);
  if (current > max.current) max.current = current;
  return max.current;
};
