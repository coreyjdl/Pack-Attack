import type { Category, GearItem, Kit, StorageLocation, Vehicle } from "@pack-attack/shared";
import { PhotoGrid } from "../components/PhotoGrid";
import { LocationSelect } from "../components/LocationSelect";
import { fmtOz, fmtFlOz, ozToGrams, flOzToMl } from "../units";
import { STATUS_CYCLE, STATUS_GLYPH } from "../constants";

interface Props {
  item: GearItem;
  categories: Category[];
  locations: StorageLocation[];
  kits: Kit[];
  /** Update routes per-field: shared (name/url/photos/reviewNotes) → library;
   *  per-trip (status/qty/kit/loc/category/notes) → trip ref. App.tsx handles routing. */
  onUpdate: (patch: Partial<GearItem>) => void;
  /** Remove the item from the active trip (does NOT delete the library item). */
  onRemoveFromTrip: () => void;
  /** Delete the item from the library (and from every trip referencing it). */
  onDeleteFromLibrary: () => void;
  onAddPhoto: (file: File) => void;
  onRemovePhoto: (idx: number) => void;
  onViewPhoto: (src: string) => void;
  onPhotoReject: (message: string) => void;
  /** Vehicles in the current trip. */
  tripVehicles: Vehicle[];
  carriedByVehicleId?: string;
  onSetCarriedBy: (vehicleId: string | undefined) => void;
}

export function ItemPanel({
  item,
  categories,
  locations,
  kits,
  onUpdate,
  onRemoveFromTrip,
  onDeleteFromLibrary,
  onAddPhoto,
  onRemovePhoto,
  onViewPhoto,
  onPhotoReject,
  tripVehicles,
  carriedByVehicleId,
  onSetCarriedBy
}: Props): JSX.Element {
  /* Flag items that have been marked "unused" on the most recent 3 reviews. */
  const recentUnused = (item.unusedTripIds ?? []).length;
  const recentUsed = (item.usedTripIds ?? []).length;
  const showLeaveBehindFlag = recentUnused >= 3 && recentUsed === 0;
  const expired = !!item.expiresAt && item.expiresAt < new Date().toISOString().slice(0, 10);
  const statusIdx = STATUS_CYCLE.indexOf(item.status);
  const cycleStatus = STATUS_CYCLE[(statusIdx + 1) % STATUS_CYCLE.length];

  return (
    <div className="panel">
      <header className="panel-header">
        <div>
          <span className="crumb">Item</span>
          <input className="title-input" value={item.name} onChange={(e) => onUpdate({ name: e.target.value })} />
          <div className="badge-row">
            {item.consumable && <span className="badge">consumable{item.consumableUnit ? ` · ${item.consumableUnit}` : ""}</span>}
            {item.perishable && <span className="badge">perishable</span>}
            {expired && <span className="badge warn">expired</span>}
            {showLeaveBehindFlag && (
              <span className="badge warn" title="Marked unused on 3+ trips — consider leaving behind">
                rarely used ({recentUnused}×)
              </span>
            )}
          </div>
        </div>
        <div className="header-actions">
          <div className="status-actions" aria-label="Item status">
            <button
              type="button"
              className={`status-toggle status-${item.status}`}
              onClick={() => onUpdate({ status: cycleStatus })}
              title="Cycle status: missing → staged → packed"
              aria-label={`Cycle status for ${item.name}`}
            >
              {STATUS_GLYPH[item.status]}
            </button>
          </div>
          <button type="button" className="ghost" onClick={onRemoveFromTrip} title="Remove from this trip (keeps library)">
            Remove from trip
          </button>
          <button className="danger" type="button" onClick={onDeleteFromLibrary} title="Delete the library asset (removes from all trips)">
            Delete
          </button>
        </div>
      </header>

      <section className="card">
        <h3>In this trip</h3>
        <p className="muted">These settings are per-trip — overrides for category, kit, location, qty, and notes.</p>
        <div className="field-grid">
          <label>
            Quantity{item.consumable && item.consumableUnit ? ` (${item.consumableUnit})` : ""}
            <input
              type="number"
              min={item.consumable ? 0 : 1}
              value={item.quantity}
              onChange={(e) => onUpdate({ quantity: Math.max(item.consumable ? 0 : 1, Number.parseInt(e.target.value || "0", 10)) })}
            />
          </label>
          <label>
            Category
            <select value={item.categoryId} onChange={(e) => onUpdate({ categoryId: e.target.value })}>
              <option value="">(none)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Kit
            <select value={item.kitId ?? ""} onChange={(e) => onUpdate({ kitId: e.target.value || undefined })}>
              <option value="">(no kit)</option>
              {kits.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </label>
          <label>
            Location
            <LocationSelect
              value={item.locationId}
              locations={locations}
              vehicles={tripVehicles}
              vehicleId={carriedByVehicleId ?? (tripVehicles.length === 1 ? tripVehicles[0].id : undefined)}
              scopeVehicles={tripVehicles}
              onChange={(locationId, inferredVehicleId) => {
                onUpdate({ locationId });
                if (inferredVehicleId && inferredVehicleId !== carriedByVehicleId) {
                  onSetCarriedBy(inferredVehicleId);
                }
              }}
            />
          </label>
          {tripVehicles.length > 1 && (
            <label>
              Carried by
              <select
                value={carriedByVehicleId ?? ""}
                onChange={(e) => onSetCarriedBy(e.target.value || undefined)}
              >
                <option value="">(unassigned)</option>
                {tripVehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="wide">
            Packing notes
            <textarea
              rows={2}
              value={item.notes ?? ""}
              onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
              placeholder="Where it nests, how it's wrapped (per-trip)."
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>Library fields <span className="muted">(shared across every trip)</span></h3>
        <div className="field-grid">
          <label>
            Weight (oz)
            <input
              type="number"
              min={0}
              step={0.1}
              value={fmtOz(item.weightGrams) || ""}
              onChange={(e) =>
                onUpdate({ weightGrams: e.target.value ? ozToGrams(Number.parseFloat(e.target.value)) : undefined })
              }
            />
          </label>
          <label>
            Volume (fl oz)
            <input
              type="number"
              min={0}
              step={0.1}
              value={fmtFlOz(item.volumeMl) || ""}
              onChange={(e) =>
                onUpdate({ volumeMl: e.target.value ? flOzToMl(Number.parseFloat(e.target.value)) : undefined })
              }
            />
          </label>
          <div className="field-row wide toggle-row">
            <div className="field-toggle toggle-cell">
              <span>Consumable</span>
              <button
                type="button"
                className={item.consumable ? "status-toggle status-packed" : "status-toggle status-missing"}
                aria-pressed={!!item.consumable}
                onClick={() => onUpdate({ consumable: item.consumable ? undefined : true })}
                title={item.consumable ? "Set consumable to no" : "Set consumable to yes"}
              >
                {item.consumable ? STATUS_GLYPH.packed : STATUS_GLYPH.missing}
              </button>
            </div>
            <label className="compact-field">
              Unit
              <input
                type="text"
                placeholder="L, oz, ct..."
                value={item.consumableUnit ?? ""}
                onChange={(e) => onUpdate({ consumableUnit: e.target.value || undefined })}
              />
            </label>
          </div>
          <div className="field-row wide toggle-row">
            <div className="field-toggle toggle-cell">
              <span>Perishable</span>
              <button
                type="button"
                className={item.perishable ? "status-toggle status-packed" : "status-toggle status-missing"}
                aria-pressed={!!item.perishable}
                onClick={() => onUpdate({ perishable: item.perishable ? undefined : true })}
                title={item.perishable ? "Set perishable to no" : "Set perishable to yes"}
              >
                {item.perishable ? STATUS_GLYPH.packed : STATUS_GLYPH.missing}
              </button>
            </div>
            <label className="compact-field">
              Expires
              <input
                type="date"
                value={item.expiresAt ?? ""}
                onChange={(e) => onUpdate({ expiresAt: e.target.value || undefined })}
              />
            </label>
          </div>
          <label className="wide">
            Product / info link
            <input
              type="url"
              placeholder="https://…"
              value={item.itemUrl ?? ""}
              onChange={(e) => onUpdate({ itemUrl: e.target.value || undefined })}
            />
          </label>
          <label className="wide">
            Replacement link
            <input
              type="url"
              placeholder="https://…"
              value={item.replacementUrl ?? ""}
              onChange={(e) => onUpdate({ replacementUrl: e.target.value || undefined })}
            />
          </label>
          <label className="wide">
            Review notes
            <textarea
              rows={3}
              value={item.reviewNotes ?? ""}
              onChange={(e) => onUpdate({ reviewNotes: e.target.value || undefined })}
              placeholder="Field performance, what to upgrade — visible in every trip."
            />
          </label>
        </div>
        {(item.itemUrl || item.replacementUrl) && (
          <div className="link-chips">
            {item.itemUrl && (
              <a href={item.itemUrl} target="_blank" rel="noreferrer">Open product ↗</a>
            )}
            {item.replacementUrl && (
              <a href={item.replacementUrl} target="_blank" rel="noreferrer">Open replenish ↗</a>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h3>Photos <span className="muted">(shared)</span></h3>
        <PhotoGrid
          photos={item.photoUris ?? []}
          alt={item.name}
          onAdd={onAddPhoto}
          onRemove={onRemovePhoto}
          onView={onViewPhoto}
          onReject={onPhotoReject}
        />
      </section>
    </div>
  );
}
