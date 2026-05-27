import type { Category, GearItem, GearStatus, Kit, StorageLocation } from "@pack-attack/shared";
import { KitGroupedChecklist } from "../components/KitGroupedChecklist";

interface Props {
  location: StorageLocation;
  items: GearItem[];
  kits: Kit[];
  categories: Category[];
  onSelectItem: (id: string) => void;
  onCycleStatus: (id: string) => void;
  onSetGroupStatus: (itemIds: string[], status: GearStatus) => void;
  onExportScope: () => void;
}

export function LocationPanel({
  location,
  items,
  kits,
  categories,
  onSelectItem,
  onCycleStatus,
  onSetGroupStatus,
  onExportScope
}: Props): JSX.Element {
  const kitById = new Map(kits.map((k) => [k.id, k]));
  const catById = new Map(categories.map((c) => [c.id, c]));

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
        <h3>Packing checklist by kit</h3>
        <KitGroupedChecklist
          items={items}
          kitLookup={(id) => (id ? kitById.get(id)?.name : undefined)}
          categoryLookup={(id) => catById.get(id)?.name}
          onSelectItem={onSelectItem}
          onCycleStatus={onCycleStatus}
          onSetGroupStatus={onSetGroupStatus}
          emptyText="No items in this location yet."
        />
      </section>
    </div>
  );
}
