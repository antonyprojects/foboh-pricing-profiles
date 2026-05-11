import type { ProductFacets, ProductListQuery } from "@/types/api";

interface Props {
  facets: ProductFacets;
  query: ProductListQuery;
  onChange: (next: ProductListQuery) => void;
  matchedCount: number;
  totalCount: number;
}

export const ProductFilterBar = ({ facets, query, onChange, matchedCount, totalCount }: Props) => {
  const set = <K extends keyof ProductListQuery>(key: K, value: ProductListQuery[K]) => {
    onChange({ ...query, [key]: value || undefined });
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="row wrap" style={{ gap: 12 }}>
        <label className="field" style={{ flex: "1 1 240px" }}>
          Search title or SKU
          <input
            type="search"
            value={query.q ?? ""}
            placeholder="e.g. koyama or KOYBRUNV6"
            onChange={(e) => set("q", e.target.value)}
          />
        </label>

        <label className="field" style={{ flex: "0 0 180px" }}>
          Brand
          <select value={query.brand ?? ""} onChange={(e) => set("brand", e.target.value)}>
            <option value="">All brands</option>
            {facets.brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>

        <label className="field" style={{ flex: "0 0 180px" }}>
          Sub-category
          <select value={query.subCategory ?? ""} onChange={(e) => set("subCategory", e.target.value)}>
            <option value="">All sub-categories</option>
            {facets.subCategories.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="field" style={{ flex: "0 0 180px" }}>
          Segment
          <select value={query.segment ?? ""} onChange={(e) => set("segment", e.target.value)}>
            <option value="">All segments</option>
            {facets.segments.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <div style={{ alignSelf: "flex-end", padding: "6px 0" }}>
          <button onClick={() => onChange({})} disabled={Object.values(query).every((v) => !v)}>
            Reset
          </button>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 8 }}>
        Showing <strong>{matchedCount}</strong> of {totalCount} products.
      </div>
    </div>
  );
};
