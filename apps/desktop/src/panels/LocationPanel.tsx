import { useMemo, useState } from "react";
import type { Category, GearItem, Kit, StorageLocation } from "@pack-attack/shared";
import { ItemChecklist } from "../components/ItemChecklist";

interface Props {
  location: StorageLocation;
  items: GearItem[];
  kits: Kit[];
  categories: Category[];
  onSelectItem: (id: string) => void;
  onCycleStatus: (id: string) => void;
  onExportScope: () => void;
}

export function LocationPanel({
  location,
  items,
  kits,
  categories,
  onSelectItem,
  onCycleStatus,
  onExportScope
}: Props): JSX.Element {
  const kitById = new Map(kits.map((k) => [k.id, k]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  /* Group items by kit. Loose items (no kitId) go in a synthetic "Loose items" group. */
  const groups = useMemo(() => {
    const byKit = new Map<string, GearItem[]>();
    const loose: GearItem[] = [];
    for (const it of items) {
      if (it.kitId && kitById.has(it.kitId)) {
        const arr = byKit.get(it.kitId) ?? [];
        arr.push(it);
        byKit.set(it.kitId, arr);
      } else {
        loose.push(it);
      }
    }
    const kitGroups = Array.from(byKit.entries()).map(([kitId, kitItems]) => ({
      kind: "kit" as const,
      id: kitId,
      name: kitById.get(kitId)?.name ?? "Kit",
      items: kitItems
    }));
    kitGroups.sort((a, b) => a.name.localeCompare(b.name));
    return loose.length > 0
      ? [...kitGroups, { kind: "loose" as const, id: "__loose__", name: "Loose items", items: loose }]
      : kitGroups;
  }, [items, kits]);

  /* Kit groups collapsed by default; loose group expanded. */
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ __loose__: true });
  const toggle = (id: string): void => setOpenIds((p) => ({ ...p, [id]: !(p[id] ?? false) }));

  function countByStatus(group: GearItem[]): { packed: number; staged: number; missing: number } {
    let packed = 0, staged = 0, missing = 0;
    for (const i of group) {
      if (i.status === "packed") packed++;
      else if (i.status === "staged") staged++;
      else missing++;
    }
    return { packed, staged, missing };
  }

  return (
    <div className="panel">
      <header className="panel-header">
        <div>
          <span className="crumb">Location</span>
          <h2>{location.name}</h2>
          <p className="panel-sub">
            {items.length} items · type: {location.kind}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost" onClick={onExportScope} title="Export this location's checklist">
            Export
          </button>
        </div>
      </header>

      <section className="card">
        <div className="card-head">
          <h3>Packing checklist</h3>
          {groups.length > 1 && (
            <div className="row-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setOpenIds(Object.fromEntries(groups.map((g) => [g.id, true])))}
              >
                Expand all
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setOpenIds({})}
              >
                Collapse all
              </button>
            </div>
          )}
        </div>

        {groups.length === 0 && <p className="muted">No items in this location yet.</p>}

        {groups.map((g) => {
          const open = openIds[g.id] ?? false;
          const { packed, staged, missing } = countByStatus(g.items);
          return (
            <div key={g.id} className={open ? "kit-group open" : "kit-group"}>
              <button
                type="button"
                className="kit-group-head"
                onClick={() => toggle(g.id)}
                aria-expanded={open}
              >
                <span className="kit-group-caret">{open ? "▾" : "▸"}</span>
                <span className="kit-group-name">{g.name}</span>
                <span className="kit-group-meta muted">
                  {g.items.length} · {packed}P / {staged}S / {missing}M
                </span>
              </button>
              {open && (
                <div className="kit-group-body">
                  <ItemChecklist
                    items={g.items}
                    kitLookup={(id) => (id ? kitById.get(id)?.name : undefined)}
                    categoryLookup={(id) => catById.get(id)?.name}
                    onSelectItem={onSelectItem}
                    onCycleStatus={onCycleStatus}
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
