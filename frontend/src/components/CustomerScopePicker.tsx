import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { fetchCustomers } from "@/redux/customersSlice";
import type { CustomerScope } from "@/types/api";

interface Props {
  value: CustomerScope;
  onChange: (next: CustomerScope) => void;
}

export const CustomerScopePicker = ({ value, onChange }: Props) => {
  const dispatch = useAppDispatch();
  const { items, groups, status } = useAppSelector((s) => s.customers);

  useEffect(() => {
    if (status === "idle") dispatch(fetchCustomers());
  }, [dispatch, status]);

  return (
    <div className="row wrap" style={{ gap: 12 }}>
      <label className="field" style={{ flex: "0 0 200px" }}>
        Applies to
        <select
          value={value.kind}
          onChange={(e) => {
            const kind = e.target.value as CustomerScope["kind"];
            if (kind === "all_customers") onChange({ kind });
            else if (kind === "customer_group") onChange({ kind, groupId: groups[0]?.id ?? "" });
            else onChange({ kind, customerId: items[0]?.id ?? "" });
          }}
        >
          <option value="all_customers">All customers</option>
          <option value="customer_group">A customer group</option>
          <option value="customer">A specific customer</option>
        </select>
      </label>

      {value.kind === "customer_group" && (
        <label className="field" style={{ flex: "1 1 220px" }}>
          Group
          <select
            value={value.groupId}
            onChange={(e) => onChange({ kind: "customer_group", groupId: e.target.value })}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </label>
      )}

      {value.kind === "customer" && (
        <label className="field" style={{ flex: "1 1 220px" }}>
          Customer
          <select
            value={value.customerId}
            onChange={(e) => onChange({ kind: "customer", customerId: e.target.value })}
          >
            {items.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
};
