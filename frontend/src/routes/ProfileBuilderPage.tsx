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
import { ApiError } from "@/api/client";
import { renderThunkError } from "@/redux/thunkError";
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
    if (!debouncedRequest.name) {
      // Don't preview until name is filled — the API requires it. The
      // table still updates (no preview column) so the supplier can
      // iterate on scope and adjustment without naming the profile.
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
      .catch((err: unknown) => {
        if (cancelled) return;
        setPreview(null);
        // ApiError carries structured details from the backend's
        // ZodError. Render those if present so the supplier sees
        // "adjustment.value: must be a finite number" rather than a
        // generic "Validation error".
        if (err instanceof ApiError) {
          setPreviewError(renderThunkError({
            message: err.toDisplay(),
            code: err.code,
            status: err.status,
            details: err.details,
            errorId: err.errorId,
          }) ?? err.message);
        } else {
          setPreviewError(err instanceof Error ? err.message : String(err));
        }
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
  const canSave = !!request.name && saveStatus !== "pending";

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
              step={1}
              value={Number.isFinite(builder.priority) ? builder.priority : ""}
              onChange={(e) => {
                // valueAsNumber returns NaN for "", "abc", and other
                // non-numeric input. We previously did `|| 100` which
                // silently snapped to 100 — the user typed garbage and
                // never knew. Now: keep the prior value on empty input
                // (so a transient empty box doesn't blow away their
                // last good number) and only commit valid integers.
                const n = e.target.valueAsNumber;
                if (Number.isFinite(n) && n >= 0) dispatch(setPriority(Math.floor(n)));
              }}
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

      {previewError && (
        <div className="alert error" style={{ whiteSpace: "pre-wrap" }}>
          Preview: {previewError}
        </div>
      )}
      {previewing && <div className="muted">Previewing…</div>}

      {saveError && (
        <div className="alert error" style={{ whiteSpace: "pre-wrap" }}>
          {renderThunkError(saveError) ?? "Failed to save profile"}
        </div>
      )}

      <div className="row">
        <button onClick={() => dispatch(reset())}>Reset</button>
        <div className="spacer" />
        <button className="primary" onClick={onSave} disabled={!canSave}>
          {saveStatus === "pending" ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
};
