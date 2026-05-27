import { useMemo } from "react";
import type { GearItem, GearStatus } from "@pack-attack/shared";
import { ItemChecklist } from "./ItemChecklist";
import { STATUS_GLYPH } from "../constants";

interface Props {
  items: GearItem[];
  kitLookup: (id?: string) => string | undefined;
  locationLookup?: (id?: string) => string | undefined;
  categoryLookup?: (id: string) => string | undefined;
  onSelectItem: (id: string) => void;
  onCycleStatus: (id: string) => void;
  onSetGroupStatus: (itemIds: string[], status: GearStatus) => void;
  emptyText?: string;
}

function nextStatus(status: GearStatus): GearStatus {
  if (status === "missing") return "staged";
  if (status === "staged") return "packed";
  return "missing";
}

export function KitGroupedChecklist({
  items,
  kitLookup,
  locationLookup,
  categoryLookup,
  onSelectItem,
  onCycleStatus,
  onSetGroupStatus,
  emptyText = "No items match this filter."
}: Props): JSX.Element {
  const grouped = useMemo(() => {
    const byKit = new Map<string, GearItem[]>();
    const loose: GearItem[] = [];
    for (const item of items) {
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
        items: kitItems.slice().sort((a, b) => a.name.localeCompare(b.name))
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    if (loose.length > 0) {
      kitGroups.push({
        id: "kit:loose",
        title: "Loose items",
        items: loose.slice().sort((a, b) => a.name.localeCompare(b.name))
      });
    }

    return kitGroups;
  }, [items, kitLookup]);

  if (grouped.length === 0) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <div className="mobile-pack-groups">
      {grouped.map((group) => {
        const packedCount = group.items.filter((i) => i.status === "packed").length;
        const missingCount = group.items.filter((i) => i.status === "missing").length;
        const kitStatus: GearStatus =
          missingCount === group.items.length ? "missing" : packedCount === group.items.length ? "packed" : "staged";

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
                  onClick={() => onSetGroupStatus(group.items.map((i) => i.id), nextStatus(kitStatus))}
                  aria-label={`Cycle status for ${group.title}`}
                  title="Cycle status: missing -> staged -> packed"
                >
                  {STATUS_GLYPH[kitStatus]}
                </button>
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
  );
}
