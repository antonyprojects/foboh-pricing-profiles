import type { Adjustment } from "@/types/api";

interface Props {
  value: Adjustment;
  onChange: (next: Adjustment) => void;
}

export const AdjustmentControls = ({ value, onChange }: Props) => {
  const setKind = (kind: Adjustment["kind"]) => {
    if (kind === "absolute") onChange({ kind, value: value.value });
    else onChange({ kind, direction: value.direction ?? "decrease", value: value.value });
  };

  return (
    <div className="row wrap" style={{ gap: 12 }}>
      <label className="field" style={{ flex: "0 0 160px" }}>
        Adjustment type
        <select value={value.kind} onChange={(e) => setKind(e.target.value as Adjustment["kind"])}>
          <option value="dynamic">Dynamic (%)</option>
          <option value="fixed">Fixed ($)</option>
          <option value="absolute">Absolute ($)</option>
        </select>
      </label>

      {value.kind !== "absolute" && (
        <label className="field" style={{ flex: "0 0 140px" }}>
          Direction
          <select
            value={value.direction ?? "decrease"}
            onChange={(e) =>
              onChange({ ...value, direction: e.target.value as NonNullable<Adjustment["direction"]> })
            }
          >
            <option value="decrease">Decrease</option>
            <option value="increase">Increase</option>
          </select>
        </label>
      )}

      <label className="field" style={{ flex: "0 0 160px" }}>
        {value.kind === "dynamic" ? "Percent" : value.kind === "fixed" ? "Amount ($)" : "Final price ($)"}
        <input
          type="number"
          min={0}
          step={value.kind === "dynamic" ? "0.1" : "0.01"}
          value={Number.isFinite(value.value) ? value.value : 0}
          onChange={(e) => onChange({ ...value, value: e.target.valueAsNumber || 0 })}
        />
      </label>

      <div className="muted" style={{ alignSelf: "flex-end", padding: "6px 0", fontSize: 12 }}>
        {explain(value)}
      </div>
    </div>
  );
};

const explain = (a: Adjustment): string => {
  if (a.kind === "absolute") return `New price = $${a.value.toFixed(2)} flat`;
  const op = a.direction === "decrease" ? "−" : "+";
  if (a.kind === "fixed") return `New = Base ${op} $${a.value.toFixed(2)}`;
  return `New = Base ${op} (${a.value}% × Base)`;
};
