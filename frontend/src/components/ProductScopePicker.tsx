import type { ProductFacets, ProductScope } from "@/types/api";

interface Props {
  value: ProductScope;
  facets: ProductFacets;
  /** SKUs available for the "specific SKU" picker. */
  skuOptions: Array<{ sku: string; title: string }>;
  onChange: (next: ProductScope) => void;
}

export const ProductScopePicker = ({ value, facets, skuOptions, onChange }: Props) => {
  const carryOverSkus = value.skus;

  const change = (kind: ProductScope["kind"]) => {
    if (kind === "all_products") onChange({ kind, skus: carryOverSkus });
    else if (kind === "sku") onChange({ kind, sku: skuOptions[0]?.sku ?? "", skus: carryOverSkus });
    else if (kind === "brand") onChange({ kind, brand: facets.brands[0] ?? "", skus: carryOverSkus });
    else if (kind === "sub_category")
      onChange({ kind, subCategory: facets.subCategories[0] ?? "", skus: carryOverSkus });
    else onChange({ kind, segment: facets.segments[0] ?? "", skus: carryOverSkus });
  };

  return (
    <div className="row wrap" style={{ gap: 12 }}>
      <label className="field" style={{ flex: "0 0 200px" }}>
        Product scope
        <select value={value.kind} onChange={(e) => change(e.target.value as ProductScope["kind"])}>
          <option value="all_products">All products</option>
          <option value="segment">Segment</option>
          <option value="sub_category">Sub-category</option>
          <option value="brand">Brand</option>
          <option value="sku">Specific SKU</option>
        </select>
      </label>

      {value.kind === "brand" && (
        <label className="field" style={{ flex: "1 1 220px" }}>
          Brand
          <select value={value.brand} onChange={(e) => onChange({ ...value, brand: e.target.value })}>
            {facets.brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      )}

      {value.kind === "sub_category" && (
        <label className="field" style={{ flex: "1 1 220px" }}>
          Sub-category
          <select value={value.subCategory} onChange={(e) => onChange({ ...value, subCategory: e.target.value })}>
            {facets.subCategories.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}

      {value.kind === "segment" && (
        <label className="field" style={{ flex: "1 1 220px" }}>
          Segment
          <select value={value.segment} onChange={(e) => onChange({ ...value, segment: e.target.value })}>
            {facets.segments.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}

      {value.kind === "sku" && (
        <label className="field" style={{ flex: "1 1 280px" }}>
          SKU
          <select value={value.sku} onChange={(e) => onChange({ ...value, sku: e.target.value })}>
            {skuOptions.map((p) => (
              <option key={p.sku} value={p.sku}>{p.sku} — {p.title}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
};
