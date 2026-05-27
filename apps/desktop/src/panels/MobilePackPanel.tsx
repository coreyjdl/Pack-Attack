import { useMemo } from "react";
import type { GearItem, GearStatus, Trip, TripTask } from "@pack-attack/shared";
import { ItemChecklist } from "../components/ItemChecklist";
import { STATUS_GLYPH } from "../constants";

interface Props {
  trip: Trip;
  items: GearItem[];
  onSelectItem: (id: string) => void;
  onCycleStatus: (id: string) => void;
  onPackGroup: (itemIds: string[]) => void;
  statusFilter: GearStatus | "all";
  onStatusFilter: (status: GearStatus | "all") => void;
  kitLookup: (id?: string) => string | undefined;
  locationLookup: (id?: string) => string | undefined;
  categoryLookup: (id: string) => string | undefined;
  onToggleTask: (id: string, done: boolean) => void;
}

function taskDueLabel(task: TripTask): string {
  if (task.dueDate) {
    return `Due ${task.dueDate}`;
  }
  if (task.dueOffsetDays === undefined) return "";
  const d = task.dueOffsetDays;
  if (d === 0) return "Day of trip";
  return d < 0 ? `${-d}d before` : `${d}d after start`;
}

export function MobilePackPanel({
  trip,
  items,
  onSelectItem,
  onCycleStatus,
  onPackGroup,
  statusFilter,
  onStatusFilter,
  kitLookup,
  locationLookup,
  categoryLookup,
  onToggleTask
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

  const grouped = useMemo(() => {
    const byKit = new Map<string, GearItem[]>();
    const loose: GearItem[] = [];
    for (const item of filteredItems) {
      if (item.kitId) {
        const arr = byKit.get(item.kitId) ?? [];
        arr.push(item);
        byKit.set(item.kitId, arr);
      } else {
        loose.push(item);
      }
    }

    const kitGroups = Array.from(byKit.entries())
      .map(([kitId, kitItems]) => ({
        id: `kit:${kitId}`,
        title: kitLookup(kitId) ?? "Kit",
        items: kitItems.sort((a, b) => a.name.localeCompare(b.name))
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    if (loose.length > 0) {
      kitGroups.push({
        id: "kit:loose",
        title: "Loose items",
        items: loose.sort((a, b) => a.name.localeCompare(b.name))
      });
    }

    return kitGroups;
  }, [filteredItems, kitLookup]);

  const openTasks = (trip.tasks ?? []).filter((t) => !t.done);
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
        {grouped.length === 0 ? (
          <p className="muted">No items match this filter.</p>
        ) : (
          <div className="mobile-pack-groups">
            {grouped.map((group) => {
              const packedCount = group.items.filter((i) => i.status === "packed").length;
              const allPacked = group.items.length > 0 && packedCount === group.items.length;
              const kitStatus: GearStatus =
                packedCount === 0 ? "missing" : allPacked ? "packed" : "staged";
              return (
                <section key={group.id} className="mobile-pack-group">
                  <header className="mobile-pack-group-head">
                    <div>
                      <strong>{group.title}</strong>
                      <span className="muted">{packedCount}/{group.items.length} packed</span>
                    </div>
                    <div className="mobile-pack-group-action">
                      <button
                        type="button"
                        className={`status-toggle status-${kitStatus}`}
                        onClick={() => onPackGroup(group.items.map((i) => i.id))}
                        disabled={allPacked}
                        aria-label={allPacked ? `${group.title} packed` : `Pack full kit ${group.title}`}
                        title={allPacked ? "Kit packed" : "Pack full kit"}
                      >
                        {STATUS_GLYPH[kitStatus]}
                      </button>
                      <span className="muted">Pack kit</span>
                    </div>
                  </header>
                  <ItemChecklist
                    items={group.items}
                    onSelectItem={onSelectItem}
                    onCycleStatus={onCycleStatus}
                    kitLookup={kitLookup}
                    locationLookup={locationLookup}
                    categoryLookup={categoryLookup}
                  />
                </section>
              );
            })}
          </div>
        )}
      </section>

      <section className="card mobile-pack-tasks">
        <h3>Open tasks ({openTasks.length})</h3>
        {openTasks.length === 0 ? (
          <p className="muted">No open tasks.</p>
        ) : (
          <ul className="task-list mobile-task-list">
            {openTasks.slice(0, 10).map((task) => (
              <li key={task.id} className="task-row">
                <button
                  type="button"
                  className="task-toggle status-missing"
                  onClick={() => onToggleTask(task.id, true)}
                  aria-label={`Mark ${task.title} complete`}
                >
                  {STATUS_GLYPH.missing}
                </button>
                <span className="task-title">{task.title}</span>
                <span className="task-due muted">{taskDueLabel(task)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
