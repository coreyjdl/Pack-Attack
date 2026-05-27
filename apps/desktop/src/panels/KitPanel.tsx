import type { Category, GearItem, GearStatus, Kit, StorageLocation, Vehicle } from "@pack-attack/shared";
import { ItemChecklist } from "../components/ItemChecklist";
import { STATUS_GLYPH } from "../constants";

interface Props {
  kit: Kit;
  items: GearItem[];
  categories: Category[];
  locations: StorageLocation[];
  tripVehicles: Vehicle[];
  onUpdate: (patch: Partial<Kit>) => void;
  onSelectItem: (id: string) => void;
  onCycleStatus: (id: string) => void;
  onSetAllStatus: (status: GearStatus) => void;
  onExportScope: () => void;
}

export function KitPanel({
  kit,
  items,
  categories,
  locations,
  tripVehicles,
  onUpdate,
  onSelectItem,
  onCycleStatus,
  onSetAllStatus,
  onExportScope
}: Props): JSX.Element {
  const locById = new Map(locations.map((l) => [l.id, l]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const packedCount = items.filter((i) => i.status === "packed").length;
  const allPacked = items.length > 0 && packedCount === items.length;

  return (
    <div className="panel">
      <header className="panel-header">
        <div>
          <span className="crumb">Kit</span>
          <h2>{kit.name}</h2>
          <p className="panel-sub">
            {packedCount}/{items.length} packed · category: {catById.get(kit.categoryId)?.name ?? "—"} · location: {kit.locationId ? locById.get(kit.locationId)?.name ?? "—" : "—"}
          </p>
        </div>
        <div className="header-actions">
          <div className="status-actions" aria-label="Kit status actions">
            <button
              type="button"
              className={allPacked ? "status-toggle status-packed" : "status-toggle status-missing"}
              onClick={() => onSetAllStatus(allPacked ? "missing" : "packed")}
              disabled={items.length === 0}
              title={allPacked ? "Mark every item in this kit as missing" : "Mark every item in this kit as packed"}
              aria-label={allPacked ? "Set entire kit to missing" : "Set entire kit to packed"}
            >
              {allPacked ? STATUS_GLYPH.packed : STATUS_GLYPH.missing}
            </button>
          </div>
          <button type="button" className="ghost" onClick={onExportScope} title="Export this kit's checklist">
            Export
          </button>
        </div>
      </header>

      <section className="card">
        <h3>Kit assignment</h3>
        <div className="field-grid">
          <label>
            Category
            <select
              value={kit.categoryId}
              onChange={(e) => onUpdate({ categoryId: e.target.value || categories[0]?.id || kit.categoryId })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Location
            <select
              value={kit.locationId ?? ""}
              onChange={(e) => onUpdate({ locationId: e.target.value || undefined })}
            >
              <option value="">Unassigned</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card">
        <h3>Contents</h3>
        <ItemChecklist
          items={items}
          locationLookup={(id) => (id ? locById.get(id)?.name : undefined)}
          categoryLookup={(id) => catById.get(id)?.name}
          onSelectItem={onSelectItem}
          onCycleStatus={onCycleStatus}
        />
      </section>
    </div>
  );
}
