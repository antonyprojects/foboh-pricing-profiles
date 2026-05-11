import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@/redux/store";
import { fetchProducts } from "@/redux/productsSlice";
import { createProfile, resetSaveStatus } from "@/redux/profilesSlice";
import {
  reset,
  setActive,
  setAdjustment,
  setCustomerScope,
  setDescription,
  setName,
  setPriority,
  setProductScope,
  setSelectedSkus,
  toggleSku,
} from "@/redux/builderSlice";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

import { ProductFilterBar } from "@/components/ProductFilterBar";
import { ProductTable } from "@/components/ProductTable";
import { CustomerScopePicker } from "@/components/CustomerScopePicker";
import { ProductScopePicker } from "@/components/ProductScopePicker";
import { AdjustmentControls } from "@/components/AdjustmentControls";
import { profilesApi } from "@/api/endpoints";
import type {
  CreateProfileRequest,
  PreviewLine,
  PreviewResponse,
  ProductListQuery,
} from "@/types/api";

export const ProfileBuilderPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const builder = useAppSelector((s) => s.builder);
  const { items: products, facets, status: productsStatus } = useAppSelector((s) => s.products);
  const { saveStatus, saveError } = useAppSelector((s) => s.profiles);

  const [query, setQuery] = useState<ProductListQuery>({});
  const debouncedQuery = useDebouncedValue(query, 200);

  useEffect(() => {
    dispatch(fetchProducts(debouncedQuery));
  }, [dispatch, debouncedQuery]);

  // ---- Build the request that will be sent and previewed ---------------
  const request = useMemo<CreateProfileRequest>(() => {
    // If the supplier explicitly selected SKUs in the table, pin them as
    // a hard filter on top of the chosen productScope. Otherwise leave
    // it open so the rule is "live" against the catalogue going forward.
    const productScope = builder.selectedSkus.length
      ? { ...builder.productScope, skus: builder.selectedSkus }
      : builder.productScope;

    return {
      name: builder.name.trim(),
      description: builder.description.trim() || null,
      customerScope: builder.customerScope,
      productScope,
      adjustment: builder.adjustment,
      priority: builder.priority,
      active: builder.active,
    };
  }, [builder]);

  // ---- Live preview ----------------------------------------------------
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const debouncedRequest = useDebouncedValue(request, 250);

  useEffect(() => {
    let cancelled = false;
    // Don't preview until name is filled — the API will reject without
    // it. The supplier can still see the live calc in the column once
    // they type a name. (Could also relax the API to allow nameless
    // previews; this is fine for now.)
    if (!debouncedRequest.name) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    setPreviewing(true);
    profilesApi
      .preview(debouncedRequest)
      .then((res) => {
        if (cancelled) return;
        setPreview(res);
        setPreviewError(null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setPreview(null);
        setPreviewError(e.message);
      })
      .finally(() => {
        if (!cancelled) setPreviewing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedRequest]);

  const previewBySku = useMemo(() => {
    const map = new Map<string, PreviewLine>();
    preview?.items.forEach((it) => map.set(it.sku, it));
    return map;
  }, [preview]);

  // ---- Selection helpers ----------------------------------------------
  const selectedSet = useMemo(() => new Set(builder.selectedSkus), [builder.selectedSkus]);

  const toggleAllOnPage = (checked: boolean) => {
    const pageSkus = products.map((p) => p.sku);
    if (checked) {
      dispatch(setSelectedSkus(Array.from(new Set([...builder.selectedSkus, ...pageSkus]))));
    } else {
      dispatch(setSelectedSkus(builder.selectedSkus.filter((sku) => !pageSkus.includes(sku))));
    }
  };

  // ---- Save ------------------------------------------------------------
  const canSave = !!request.name && saveStatus !== "saving";

  const onSave = async () => {
    dispatch(resetSaveStatus());
    const result = await dispatch(createProfile(request));
    if (createProfile.fulfilled.match(result)) {
      dispatch(reset());
      navigate("/profiles");
    }
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      <div>
        <h2 className="section-title">Build a pricing profile</h2>
        <p className="section-sub">Live preview updates as you change scope or adjustment.</p>
      </div>

      <div className="card col" style={{ gap: 16 }}>
        <div className="row wrap" style={{ gap: 12 }}>
          <label className="field" style={{ flex: "2 1 280px" }}>
            Name
            <input
              type="text"
              value={builder.name}
              placeholder="e.g. 10% off Wine for Independent Retailers"
              onChange={(e) => dispatch(setName(e.target.value))}
            />
          </label>
          <label className="field" style={{ flex: "0 0 140px" }}>
            Priority
            <input
              type="number"
              min={0}
              value={builder.priority}
              onChange={(e) => dispatch(setPriority(e.target.valueAsNumber || 100))}
            />
          </label>
          <label className="field" style={{ flex: "0 0 110px" }}>
            Active
            <select
              value={builder.active ? "yes" : "no"}
              onChange={(e) => dispatch(setActive(e.target.value === "yes"))}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>

        <label className="field">
          Description
          <textarea
            rows={2}
            value={builder.description}
            placeholder="Optional — why this profile exists"
            onChange={(e) => dispatch(setDescription(e.target.value))}
          />
        </label>

        <CustomerScopePicker
          value={builder.customerScope}
          onChange={(s) => dispatch(setCustomerScope(s))}
        />

        <ProductScopePicker
          value={builder.productScope}
          facets={facets}
          skuOptions={products.map((p) => ({ sku: p.sku, title: p.title }))}
          onChange={(s) => dispatch(setProductScope(s))}
        />

        <AdjustmentControls
          value={builder.adjustment}
          onChange={(a) => dispatch(setAdjustment(a))}
        />
      </div>

      <ProductFilterBar
        facets={facets}
        query={query}
        onChange={setQuery}
        matchedCount={products.length}
        totalCount={preview?.summary.count ?? products.length}
      />

      <div className="row" style={{ marginBottom: 8 }}>
        <div className="muted">
          {builder.selectedSkus.length > 0
            ? <>
                <strong>{builder.selectedSkus.length}</strong> SKU
                {builder.selectedSkus.length === 1 ? "" : "s"} pinned —
                profile will <em>only</em> apply to these.
              </>
            : <>No SKUs pinned — profile applies <em>live</em> to anything matching the scope above.</>
          }
        </div>
        <div className="spacer" />
        {builder.selectedSkus.length > 0 && (
          <button onClick={() => dispatch(setSelectedSkus([]))}>Clear selection</button>
        )}
      </div>

      {productsStatus === "loading" && products.length === 0 ? (
        <div className="card muted">Loading products…</div>
      ) : (
        <ProductTable
          products={products}
          selectable
          selectedSkus={selectedSet}
          onToggle={(sku) => dispatch(toggleSku(sku))}
          onToggleAll={toggleAllOnPage}
          previewBySku={previewBySku}
        />
      )}

      {preview && preview.summary.count > 0 && (
        <div className="card muted">
          Preview covers <strong>{preview.summary.count}</strong> product
          {preview.summary.count === 1 ? "" : "s"}; average change&nbsp;
          {preview.summary.avgDeltaPct.toFixed(1)}% ({preview.summary.avgDelta.toFixed(2)} AUD).
        </div>
      )}

      {previewError && <div className="alert error">Preview: {previewError}</div>}
      {previewing && <div className="muted">Previewing…</div>}

      <div className="row">
        <button onClick={() => dispatch(reset())}>Reset</button>
        <div className="spacer" />
        {saveError && <div className="bad">{saveError}</div>}
        <button className="primary" onClick={onSave} disabled={!canSave}>
          {saveStatus === "saving" ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
};
