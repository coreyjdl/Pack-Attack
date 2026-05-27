import { useState } from "react";
import type { Category, LibraryData, LibraryItem, LibraryKit, Vehicle } from "@pack-attack/shared";
import { PhotoGrid } from "../components/PhotoGrid";
import { DeleteIconButton } from "../components/DeleteIconButton";
import { LocationSelect } from "../components/LocationSelect";
import { CategoriesCard } from "./CategoriesCard";
import { fmtOz, fmtFlOz, ozToGrams, flOzToMl } from "../units";

interface Props {
  library: LibraryData;
  vehicles: Vehicle[];
  onAddCategory: (name: string) => Category | null;
  onRenameCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddItem: (name: string) => LibraryItem | null;
  onUpdateItem: (id: string, patch: Partial<LibraryItem>) => void;
  onDeleteItem: (id: string) => void;
  onAddItemPhoto: (id: string, file: File) => void;
  onRemoveItemPhoto: (id: string, idx: number) => void;
  onAddKit: (name: string) => LibraryKit | null;
  onUpdateKit: (id: string, patch: Partial<LibraryKit>) => void;
  onDeleteKit: (id: string) => void;
  onViewPhoto: (src: string) => void;
  onPhotoReject: (msg: string) => void;
  onAddToActiveTrip: (id: string) => void;
  onRemoveFromActiveTrip: (id: string) => void;
  onAddKitToActiveTrip: (id: string) => number;
  onRemoveKitFromActiveTrip: (id: string) => void;
  /** Library item ids currently in the active trip. */
  activeTripItemIds: Set<string>;
  /** Library kit ids currently in the active trip. */
  activeTripKitIds: Set<string>;
}

/** Master CRUD for the canonical library (items + kits). */
export function LibraryPanel({
  library,
  vehicles,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAddItemPhoto,
  onRemoveItemPhoto,
  onAddKit,
  onUpdateKit,
  onDeleteKit,
  onViewPhoto,
  onPhotoReject,
  onAddToActiveTrip,
  onRemoveFromActiveTrip,
  onAddKitToActiveTrip,
  onRemoveKitFromActiveTrip,
  activeTripItemIds,
  activeTripKitIds
}: Props): JSX.Element {
  const [newItemName, setNewItemName] = useState("");
  const [newKitName, setNewKitName] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const items = q ? library.items.filter((i) => i.name.toLowerCase().includes(q)) : library.items;

  function toggle(id: string): void {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="panel">
      <header className="panel-header">
        <div>
          <h2>Library</h2>
          <p className="panel-sub">
            The canonical catalog. Photos, notes, and links here propagate to every trip automatically.
          </p>
        </div>
      </header>

      <section className="card">
        <div className="card-head">
          <h3>Items <span className="muted">({library.items.length})</span></h3>
          <input
            className="library-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search library…"
          />
        </div>

        <div className="add-row">
          <input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="New library item (e.g. Moto Pump)"
            onKeyDown={(e) => {
              if (e.key === "Enter" && onAddItem(newItemName)) setNewItemName("");
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (onAddItem(newItemName)) setNewItemName("");
            }}
          >
            Add to library
          </button>
        </div>

        <ul className="library-list">
          {items.map((it) => {
            const open = expanded[it.id];
            return (
              <li key={it.id} className="library-row">
                <div className="library-row-head">
                  <button type="button" className="caret" onClick={() => toggle(it.id)} aria-label="Expand">
                    {open ? "▾" : "▸"}
                  </button>
                  <input
                    className="library-name"
                    value={it.name}
                    onChange={(e) => onUpdateItem(it.id, { name: e.target.value })}
                  />
                  {activeTripItemIds.has(it.id) ? (
                    <button
                      type="button"
                      className="trip-toggle trip-toggle-remove icon-btn"
                      onClick={() => onRemoveFromActiveTrip(it.id)}
                      title="Remove from active trip"
                      aria-label={`Remove ${it.name} from active trip`}
                    >
                      -
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="trip-toggle trip-toggle-add icon-btn"
                      onClick={() => onAddToActiveTrip(it.id)}
                      title="Add to active trip"
                      aria-label={`Add ${it.name} to active trip`}
                    >
                      +
                    </button>
                  )}
                  <DeleteIconButton
                    onClick={() => onDeleteItem(it.id)}
                    label={`Delete ${it.name}`}
                  />
                </div>
                {open && (
                  <div className="library-row-body">
                    <div className="field-grid">
                      <label>
                        Default category
                        <select
                          value={it.defaultCategoryId ?? ""}
                          onChange={(e) => onUpdateItem(it.id, { defaultCategoryId: e.target.value || undefined })}
                        >
                          <option value="">(none)</option>
                          {library.categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Default kit
                        <select
                          value={it.defaultKitId ?? ""}
                          onChange={(e) => onUpdateItem(it.id, { defaultKitId: e.target.value || undefined })}
                        >
                          <option value="">(none)</option>
                          {library.kits.map((k) => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Default location
                        <LocationSelect
                          className="library-inline-select"
                          value={it.defaultLocationId}
                          locations={library.locations}
                          vehicles={vehicles}
                          scopeVehicles={vehicles}
                          placeholder="(none)"
                          onChange={(locationId) => onUpdateItem(it.id, { defaultLocationId: locationId })}
                        />
                      </label>
                      <label>
                        Default qty
                        <input
                          type="number"
                          min={1}
                          value={it.defaultQuantity ?? 1}
                          onChange={(e) => onUpdateItem(it.id, { defaultQuantity: Math.max(1, Number.parseInt(e.target.value || "1", 10)) })}
                        />
                      </label>
                      <label>
                        Weight (oz)
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={fmtOz(it.weightGrams) || ""}
                          onChange={(e) => onUpdateItem(it.id, { weightGrams: e.target.value ? ozToGrams(Number.parseFloat(e.target.value)) : undefined })}
                        />
                      </label>
                      <label>
                        Volume (fl oz)
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={fmtFlOz(it.volumeMl) || ""}
                          onChange={(e) => onUpdateItem(it.id, { volumeMl: e.target.value ? flOzToMl(Number.parseFloat(e.target.value)) : undefined })}
                        />
                      </label>
                      <label className="wide">
                        Product link
                        <input
                          type="url"
                          value={it.itemUrl ?? ""}
                          placeholder="https://…"
                          onChange={(e) => onUpdateItem(it.id, { itemUrl: e.target.value || undefined })}
                        />
                      </label>
                      <label className="wide">
                        Replacement link
                        <input
                          type="url"
                          value={it.replacementUrl ?? ""}
                          placeholder="https://…"
                          onChange={(e) => onUpdateItem(it.id, { replacementUrl: e.target.value || undefined })}
                        />
                      </label>
                      <label className="wide">
                        Review notes
                        <textarea
                          rows={2}
                          value={it.reviewNotes ?? ""}
                          onChange={(e) => onUpdateItem(it.id, { reviewNotes: e.target.value || undefined })}
                        />
                      </label>
                    </div>
                    <div>
                      <h4>Photos</h4>
                      <PhotoGrid
                        photos={it.photoUris ?? []}
                        alt={it.name}
                        onAdd={(file) => onAddItemPhoto(it.id, file)}
                        onRemove={(idx) => onRemoveItemPhoto(it.id, idx)}
                        onView={onViewPhoto}
                        onReject={onPhotoReject}
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {items.length === 0 && <li className="empty">No items match.</li>}
        </ul>
      </section>

      <section className="card">
        <h3>Kits <span className="muted">({library.kits.length})</span></h3>
        <div className="add-row">
          <input
            value={newKitName}
            onChange={(e) => setNewKitName(e.target.value)}
            placeholder="New library kit"
            onKeyDown={(e) => {
              if (e.key === "Enter" && onAddKit(newKitName)) setNewKitName("");
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (onAddKit(newKitName)) setNewKitName("");
            }}
          >
            Add kit
          </button>
        </div>
        <ul className="library-list">
          {library.kits.map((k) => (
            <li key={k.id} className="library-row">
              <div className="library-row-head">
                <input
                  className="library-name"
                  value={k.name}
                  onChange={(e) => onUpdateKit(k.id, { name: e.target.value })}
                />
                <button
                  type="button"
                  className={activeTripKitIds.has(k.id) ? "trip-toggle trip-toggle-remove icon-btn" : "trip-toggle trip-toggle-add icon-btn"}
                  onClick={() => activeTripKitIds.has(k.id) ? onRemoveKitFromActiveTrip(k.id) : onAddKitToActiveTrip(k.id)}
                  title={activeTripKitIds.has(k.id)
                    ? "Remove this kit (and its items) from the active trip"
                    : "Add this kit (and all its items) to the active trip"}
                  aria-label={activeTripKitIds.has(k.id)
                    ? `Remove ${k.name} from active trip`
                    : `Add ${k.name} to active trip`}
                >
                  {activeTripKitIds.has(k.id) ? "-" : "+"}
                </button>
                <select
                  value={k.defaultCategoryId ?? ""}
                  onChange={(e) => onUpdateKit(k.id, { defaultCategoryId: e.target.value || undefined })}
                  title="Default category"
                >
                  <option value="">(no category)</option>
                  {library.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <LocationSelect
                  className="library-inline-select"
                  value={k.defaultLocationId}
                  locations={library.locations}
                  vehicles={vehicles}
                  scopeVehicles={vehicles}
                  placeholder="(no location)"
                  onChange={(locationId) => onUpdateKit(k.id, { defaultLocationId: locationId })}
                />
                <DeleteIconButton
                  onClick={() => onDeleteKit(k.id)}
                  label={`Delete ${k.name}`}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <CategoriesCard
        categories={library.categories}
        getKitCount={(catId) => library.kits.filter((k) => k.defaultCategoryId === catId).length}
        getItemCount={(catId) => library.items.filter((i) => i.defaultCategoryId === catId).length}
        onAdd={onAddCategory}
        onRename={onRenameCategory}
        onDelete={onDeleteCategory}
      />
    </div>
  );
}
