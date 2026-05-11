import { useEffect } from "react";
import { Link } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@/redux/store";
import { deleteProfile, fetchProfiles } from "@/redux/profilesSlice";
import { fetchCustomers } from "@/redux/customersSlice";
import {
  describeAdjustment,
  describeCustomerScope,
  describeProductScope,
} from "@/utils/format";

export const ProfilesPage = () => {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((s) => s.profiles);
  const { items: customers, groups, status: customersStatus } = useAppSelector((s) => s.customers);

  useEffect(() => {
    if (status === "idle") dispatch(fetchProfiles());
    if (customersStatus === "idle") dispatch(fetchCustomers());
  }, [dispatch, status, customersStatus]);

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

      {status === "error" && <div className="alert error">{error}</div>}
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
            {items.map((p) => (
              <tr key={p.id}>
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
                    onClick={() => {
                      if (window.confirm(`Delete profile "${p.name}"?`)) {
                        dispatch(deleteProfile(p.id));
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
