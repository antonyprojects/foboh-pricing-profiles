import type { Product } from "@/types/api";

interface Props {
  products: Product[];
  selectable?: boolean;
  selectedSkus?: Set<string>;
  onToggle?: (sku: string) => void;
  onToggleAll?: (next: boolean) => void;
  /** Optional column showing previewed new price. */
  previewBySku?: Map<string, { newPrice: number; delta: number; deltaPct: number }>;
}

const fmt = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

export const ProductTable = ({
  products,
  selectable,
  selectedSkus,
  onToggle,
  onToggleAll,
  previewBySku,
}: Props) => {
  const allSelected = selectable && products.length > 0
    ? products.every((p) => selectedSkus?.has(p.sku))
    : false;

  const someSelected = selectable && !allSelected
    ? products.some((p) => selectedSkus?.has(p.sku))
    : false;

  return (
    <table>
      <thead>
        <tr>
          {selectable && (
            <th style={{ width: 36 }}>
              <input
                type="checkbox"
                aria-label="Select all on this page"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={(e) => onToggleAll?.(e.target.checked)}
              />
            </th>
          )}
          <th>Title</th>
          <th>SKU</th>
          <th>Brand</th>
          <th>Sub-cat</th>
          <th>Segment</th>
          <th className="right">Base price</th>
          {previewBySku && <th className="right">New price</th>}
          {previewBySku && <th className="right">Delta</th>}
        </tr>
      </thead>
      <tbody>
        {products.length === 0 && (
          <tr>
            <td colSpan={previewBySku ? 9 : 7} className="muted" style={{ textAlign: "center", padding: 24 }}>
              No products match.
            </td>
          </tr>
        )}
        {products.map((p) => {
          const preview = previewBySku?.get(p.sku);
          return (
            <tr key={p.sku}>
              {selectable && (
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.title}`}
                    checked={!!selectedSkus?.has(p.sku)}
                    onChange={() => onToggle?.(p.sku)}
                  />
                </td>
              )}
              <td>{p.title}</td>
              <td className="mono">{p.sku}</td>
              <td>{p.brand}</td>
              <td>{p.subCategory}</td>
              <td>{p.segment}</td>
              <td className="right mono">{fmt(p.basePrice)}</td>
              {previewBySku && (
                <td className="right mono">
                  {preview ? fmt(preview.newPrice) : <span className="muted">—</span>}
                </td>
              )}
              {previewBySku && (
                <td className="right mono">
                  {preview ? (
                    <span className={preview.delta < 0 ? "good" : preview.delta > 0 ? "warn" : ""}>
                      {fmt(preview.delta)} ({preview.deltaPct.toFixed(1)}%)
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
