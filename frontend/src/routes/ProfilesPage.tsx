import { useEffect } from "react";
import { Link } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@/redux/store";
import {
  deleteProfile,
  fetchProfiles,
  resetDeleteStatus,
} from "@/redux/profilesSlice";
import { fetchCustomers } from "@/redux/customersSlice";
import { renderThunkError } from "@/redux/thunkError";
import {
  describeAdjustment,
  describeCustomerScope,
  describeProductScope,
} from "@/utils/format";

export const ProfilesPage = () => {
  const dispatch = useAppDispatch();
  const { items, status, error, deleteStatus, deleteError, deleteErrorId } =
    useAppSelector((s) => s.profiles);
  const { items: customers, groups, status: customersStatus } = useAppSelector((s) => s.customers);

  useEffect(() => {
    if (status === "idle") dispatch(fetchProfiles());
    if (customersStatus === "idle") dispatch(fetchCustomers());
  }, [dispatch, status, customersStatus]);

  const onDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete profile "${name}"?`)) return;
    // The thunk uses rejectWithValue, so the rejected payload lives in
    // state.deleteError. We don't need to do anything special here
    // beyond firing — the UI alert below picks it up.
    await dispatch(deleteProfile(id));
  };

  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">Pricing profiles</h2>
          <p className="section-sub">All profiles in the store. Resolver picks one at lookup time.</p>
        </div>
        <div className="spacer" />
        <Link to="/builder"><button className="primary">New profile</button></Link>
      </div>

      {status === "error" && (
        <div className="alert error" style={{ whiteSpace: "pre-wrap" }}>
          {renderThunkError(error) ?? "Failed to load profiles"}
        </div>
      )}

      {deleteStatus === "error" && deleteError && (
        <div className="alert error" style={{ marginBottom: 12 }}>
          <div className="row">
            <span style={{ whiteSpace: "pre-wrap" }}>
              {renderThunkError(deleteError) ?? "Failed to delete profile"}
            </span>
            <div className="spacer" />
            <button onClick={() => dispatch(resetDeleteStatus())}>Dismiss</button>
          </div>
        </div>
      )}

      {status === "loading" && <div className="card muted">Loading…</div>}

      {status === "ready" && items.length === 0 && (
        <div className="card muted">No profiles yet. Build one →</div>
      )}

      {status === "ready" && items.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Customer scope</th>
              <th>Product scope</th>
              <th>Adjustment</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const isFailingDelete = deleteStatus === "error" && deleteErrorId === p.id;
              const isPendingDelete = deleteStatus === "pending" && deleteErrorId === p.id;
              return (
                <tr key={p.id} style={isFailingDelete ? { background: "rgba(248, 113, 113, 0.06)" } : undefined}>
                  <td>
                    <div>{p.name}</div>
                    {p.description && <div className="muted" style={{ fontSize: 12 }}>{p.description}</div>}
                  </td>
                  <td>{describeCustomerScope(p.customerScope, customers, groups)}</td>
                  <td>{describeProductScope(p.productScope)}</td>
                  <td>{describeAdjustment(p.adjustment)}</td>
                  <td className="mono">{p.priority}</td>
                  <td>
                    {p.active
                      ? <span className="pill good">active</span>
                      : <span className="pill">inactive</span>
                    }
                  </td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>
                    {new Date(p.updatedAt).toLocaleString()}
                  </td>
                  <td>
                    <button
                      className="danger"
                      disabled={isPendingDelete}
                      onClick={() => onDelete(p.id, p.name)}
                    >
                      {isPendingDelete ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
