import { useMemo } from "react";
import type { GearItem, GearStatus, Trip } from "@pack-attack/shared";
import { KitGroupedChecklist } from "../components/KitGroupedChecklist";

interface Props {
  trip: Trip;
  items: GearItem[];
  onSelectItem: (id: string) => void;
  onCycleStatus: (id: string) => void;
  onSetGroupStatus: (itemIds: string[], status: GearStatus) => void;
  statusFilter: GearStatus | "all";
  onStatusFilter: (status: GearStatus | "all") => void;
  kitLookup: (id?: string) => string | undefined;
  locationLookup: (id?: string) => string | undefined;
  categoryLookup: (id: string) => string | undefined;
}

export function MobilePackPanel({
  trip,
  items,
  onSelectItem,
  onCycleStatus,
  onSetGroupStatus,
  statusFilter,
  onStatusFilter,
  kitLookup,
  locationLookup,
  categoryLookup
}: Props): JSX.Element {
  const counts = useMemo(() => {
    const packed = items.filter((i) => i.status === "packed").length;
    const staged = items.filter((i) => i.status === "staged").length;
    const missing = items.filter((i) => i.status === "missing").length;
    return { packed, staged, missing };
  }, [items]);

  const filteredItems = useMemo(() => {
    const list = statusFilter === "all" ? items : items.filter((i) => i.status === statusFilter);
    const order: Record<GearStatus, number> = {
      missing: 0,
      staged: 1,
      packed: 2
    };
    return list
      .slice()
      .sort((a, b) => {
        const diff = order[a.status] - order[b.status];
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
  }, [items, statusFilter]);

  const total = items.length;
  const pct = total === 0 ? 0 : Math.round((counts.packed / total) * 100);

  return (
    <div className="panel mobile-pack-panel">
      <header className="panel-header mobile-pack-header">
        <div>
          <span className="crumb">Quick pack</span>
          <h2>Pack {trip.name}</h2>
          <p className="panel-sub">
            {counts.packed} packed · {counts.staged} staged · {counts.missing} missing
          </p>
        </div>
        <div className="mobile-pack-progress" aria-label="Packing progress">
          <strong>{pct}%</strong>
          <span>{counts.packed}/{total}</span>
        </div>
      </header>

      <section className="card mobile-pack-filters" aria-label="Checklist filters">
        <button
          type="button"
          className={statusFilter === "all" ? "chip active" : "chip"}
          onClick={() => onStatusFilter("all")}
        >
          All ({total})
        </button>
        <button
          type="button"
          className={statusFilter === "missing" ? "chip active" : "chip"}
          onClick={() => onStatusFilter("missing")}
        >
          Missing ({counts.missing})
        </button>
        <button
          type="button"
          className={statusFilter === "staged" ? "chip active" : "chip"}
          onClick={() => onStatusFilter("staged")}
        >
          Staged ({counts.staged})
        </button>
        <button
          type="button"
          className={statusFilter === "packed" ? "chip active" : "chip"}
          onClick={() => onStatusFilter("packed")}
        >
          Packed ({counts.packed})
        </button>
      </section>

      <section className="card mobile-pack-checklist">
        <h3>Packing checklist by kit</h3>
        <KitGroupedChecklist
          items={filteredItems}
          kitLookup={kitLookup}
          locationLookup={locationLookup}
          categoryLookup={categoryLookup}
          onSelectItem={onSelectItem}
          onCycleStatus={onCycleStatus}
          onSetGroupStatus={onSetGroupStatus}
          emptyText="No items match this filter."
        />
      </section>
    </div>
  );
}
