import { useEffect, useMemo, useState } from "react";

import { useAppDispatch, useAppSelector } from "@/redux/store";
import { fetchCustomers } from "@/redux/customersSlice";
import { fetchProducts } from "@/redux/productsSlice";
import { pricingApi } from "@/api/endpoints";
import { fmtMoney } from "@/utils/format";
import type { ResolveResponse } from "@/types/api";

export const ResolverPage = () => {
  const dispatch = useAppDispatch();
  const { items: customers, status: customersStatus } = useAppSelector((s) => s.customers);
  const { items: products, status: productsStatus } = useAppSelector((s) => s.products);

  // Default to the brief's worked scenario so the page is useful at first render.
  const [customerId, setCustomerId] = useState("cust_bondi_cellars");
  const [sku, setSku] = useState("KOYBRUNV6");
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customersStatus === "idle") dispatch(fetchCustomers());
    if (productsStatus === "idle") dispatch(fetchProducts({}));
  }, [dispatch, customersStatus, productsStatus]);

  // Resolve whenever the pair changes.
  useEffect(() => {
    if (!customerId || !sku) return;
    let cancelled = false;
    setLoading(true);
    pricingApi
      .resolve(customerId, sku)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setError(null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, sku]);

  const customer = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId]);
  const product = useMemo(() => products.find((p) => p.sku === sku), [products, sku]);

  return (
    <div className="col" style={{ gap: 16 }}>
      <div>
        <h2 className="section-title">Resolver</h2>
        <p className="section-sub">
          Pick a customer + product to see which profile wins. Defaulted to the brief's
          worked scenario: Bondi Cellars on Koyama Methode Brut Nature NV (Profile C wins at $95).
        </p>
      </div>

      <div className="card row wrap" style={{ gap: 12 }}>
        <label className="field" style={{ flex: "1 1 240px" }}>
          Customer
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.groups.length ? ` (${c.groups.length} group${c.groups.length === 1 ? "" : "s"})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="field" style={{ flex: "1 1 280px" }}>
          Product
          <select value={sku} onChange={(e) => setSku(e.target.value)}>
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>{p.sku} — {p.title}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading && !result && <div className="card muted">Resolving…</div>}

      {result && (
        <>
          <div className="card">
            <div className="row" style={{ alignItems: "baseline" }}>
              <div>
                <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.04 }}>
                  Effective price
                </div>
                <div style={{ fontSize: 36, fontWeight: 700 }} className="mono">
                  {fmtMoney(result.price)}
                </div>
              </div>
              <div className="spacer" />
              <div style={{ textAlign: "right" }}>
                <div className="muted" style={{ fontSize: 12 }}>Catalogue base</div>
                <div className="mono">{fmtMoney(result.basePrice)}</div>
                {result.basePrice !== result.price && (
                  <div className={result.price < result.basePrice ? "good" : "warn"} style={{ fontSize: 12 }}>
                    {((result.price - result.basePrice) / result.basePrice * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>

            <hr style={{ borderColor: "var(--border)", margin: "16px 0" }} />

            <div style={{ marginBottom: 8 }}>
              {result.sourceProfileId ? (
                <>
                  <strong>Winning profile:</strong>{" "}
                  <span>{result.sourceProfileName}</span>{" "}
                  <span className="pill mono">{result.sourceProfileId}</span>
                </>
              ) : (
                <strong>No profile applies — charging catalogue base price.</strong>
              )}
            </div>
            <div className="muted">{result.reason}</div>

            {customer && product && (
              <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
                Looked up: <strong>{customer.name}</strong> on <strong>{product.title}</strong> (SKU {product.sku}).
              </div>
            )}
          </div>

          {result.considered.length > 0 && (
            <div>
              <h3 style={{ margin: "8px 0" }}>All profiles considered</h3>
              <p className="section-sub">
                Sorted by precedence — top row is the winner. Specificity scores are{" "}
                <span className="mono">(customer, product, priority)</span>: lower is more specific.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Profile</th>
                    <th>Specificity (cust, prod, prio)</th>
                    <th className="right">Computed price</th>
                  </tr>
                </thead>
                <tbody>
                  {result.considered.map((c, i) => (
                    <tr key={c.profileId} style={i === 0 ? { background: "rgba(74, 222, 128, 0.06)" } : undefined}>
                      <td className="mono">{i === 0 ? "★" : i + 1}</td>
                      <td>
                        <div>{c.profileName}</div>
                        <div className="muted mono" style={{ fontSize: 11 }}>{c.profileId}</div>
                      </td>
                      <td className="mono">
                        ({c.specificity.customer}, {c.specificity.product}, {c.specificity.priority})
                      </td>
                      <td className="right mono">{fmtMoney(c.computedPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
