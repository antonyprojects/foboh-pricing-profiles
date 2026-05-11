/**
 * Small, deterministic product search. Free-text matches title or SKU
 * (case-insensitive substring); faceted filters AND together; pagination
 * is bounded by the schema.
 *
 * For a real catalogue this would be backed by a search engine. With
 * a dozen products in memory, a single pass over the array is the
 * right tool.
 */
export const searchProducts = (allProducts, query) => {
  const { q, brand, subCategory, segment, limit, offset } = query;

  const needle = q?.toLowerCase();

  const filtered = allProducts.filter((p) => {
    if (!p.active) return false;
    if (brand && p.brand !== brand) return false;
    if (subCategory && p.subCategory !== subCategory) return false;
    if (segment && p.segment !== segment) return false;
    if (needle) {
      const inTitle = p.title.toLowerCase().includes(needle);
      const inSku = p.sku.toLowerCase().includes(needle);
      if (!inTitle && !inSku) return false;
    }
    return true;
  });

  filtered.sort((a, b) => a.title.localeCompare(b.title));

  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
};
