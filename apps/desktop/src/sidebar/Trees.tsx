import { useState } from "react";
import type { Category, GearItem, GearStatus, Kit, StorageLocation, Vehicle } from "@pack-attack/shared";
import { ItemRow } from "../components/ItemRow";
import { TreeGroup } from "../components/TreeGroup";
import { STATUS_FILTERS, STATUS_LABEL, UNASSIGNED } from "../constants";
import type { Selection } from "../types";

interface LocationTreeProps {
  locations: StorageLocation[];
  itemsByLocation: Map<string, GearItem[]>;
  expanded: Record<string, boolean>;
  selection: Selection;
  search: string;
  /** Vehicles attached to the active trip. Drives multi-vehicle grouping. */
  tripVehicles: Vehicle[];
  onSelect: (s: Selection) => void;
  onToggle: (key: string) => void;
}

export function LocationTree({
  locations,
  itemsByLocation,
  expanded,
  selection,
  search,
  tripVehicles,
  onSelect,
  onToggle
}: LocationTreeProps): JSX.Element {
  const unassigned = itemsByLocation.get(UNASSIGNED) ?? [];
  const multi = tripVehicles.length > 1;

  function renderGroup(loc: StorageLocation): JSX.Element {
    return (
      <TreeGroup
        key={loc.id}
        groupKey={`loc-${loc.id}`}
        name={loc.name}
        items={itemsByLocation.get(loc.id) ?? []}
        expanded={expanded}
        selection={selection}
        search={search}
        onToggle={onToggle}
        onSelectGroup={() => onSelect({ kind: "location", id: loc.id })}
        isSelectedGroup={selection.kind === "location" && selection.id === loc.id}
        onSelectItem={(id) => onSelect({ kind: "item", id })}
      />
    );
  }

  return (
    <div className="tree-section">
      {multi ? (
        <>
          {tripVehicles.map((v) => {
            const ownLocs = locations.filter((l) => l.vehicleId === v.id);
            return (
              <div key={v.id} className="tree-vehicle">
                <h5 className="tree-vehicle-head muted">{v.name}</h5>
                {ownLocs.map(renderGroup)}
              </div>
            );
          })}
        </>
      ) : (
        <>
          {locations.map(renderGroup)}
        </>
      )}

      {unassigned.length > 0 && (
        <TreeGroup
          groupKey="loc-unassigned"
          name="Unassigned location"
          items={unassigned}
          expanded={expanded}
          selection={selection}
          search={search}
          onToggle={onToggle}
          onSelectGroup={() => onSelect({ kind: "location", id: UNASSIGNED })}
          isSelectedGroup={selection.kind === "location" && selection.id === UNASSIGNED}
          onSelectItem={(id) => onSelect({ kind: "item", id })}
          labelClassName="muted-row"
        />
      )}
    </div>
  );
}

interface KitTreeProps {
  kits: Kit[];
  categories: Category[];
  itemsByKit: Map<string, GearItem[]>;
  expanded: Record<string, boolean>;
  selection: Selection;
  search: string;
  onSelect: (s: Selection) => void;
  onToggle: (key: string) => void;
  /** Library kits not yet in the active trip, available to import. */
  importableKits: Array<{ id: string; name: string }>;
  onImportKit: (kitId: string) => void;
}

export function KitTree({
  kits,
  categories,
  itemsByKit,
  expanded,
  selection,
  search,
  onSelect,
  onToggle,
  importableKits,
  onImportKit
}: KitTreeProps): JSX.Element {
  const [importId, setImportId] = useState("");

  return (
    <div className="tree-section">
      {kits.map((kit) => (
        <TreeGroup
          key={kit.id}
          groupKey={`kit-${kit.id}`}
          name={kit.name}
          items={itemsByKit.get(kit.id) ?? []}
          expanded={expanded}
          selection={selection}
          search={search}
          onToggle={onToggle}
          onSelectGroup={() => onSelect({ kind: "kit", id: kit.id })}
          isSelectedGroup={selection.kind === "kit" && selection.id === kit.id}
          onSelectItem={(id) => onSelect({ kind: "item", id })}
        />
      ))}

      {importableKits.length > 0 && (
        <div className="inline-add" title="Pull an existing library kit (and all its items) into this trip">
          <select value={importId} onChange={(e) => setImportId(e.target.value)}>
            <option value="">Import library kit…</option>
            {importableKits.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!importId}
            onClick={() => {
              if (!importId) return;
              onImportKit(importId);
              setImportId("");
            }}
          >
            Import
          </button>
        </div>
      )}
    </div>
  );
}

interface CategoryTreeProps {
  categories: Category[];
  itemsByCategory: Map<string, GearItem[]>;
  expanded: Record<string, boolean>;
  selection: Selection;
  search: string;
  onSelect: (sel: Selection) => void;
  onToggle: (key: string) => void;
}

export function CategoryTree({
  categories,
  itemsByCategory,
  expanded,
  selection,
  search,
  onSelect,
  onToggle
}: CategoryTreeProps): JSX.Element {
  const groups: Array<{ id: string; name: string; items: GearItem[] }> = categories.map((c) => ({
    id: c.id,
    name: c.name,
    items: itemsByCategory.get(c.id) ?? []
  }));
  const unassigned = itemsByCategory.get(UNASSIGNED) ?? [];
  if (unassigned.length > 0) {
    groups.push({ id: UNASSIGNED, name: "Uncategorized", items: unassigned });
  }

  return (
    <div className="tree-section">
      {groups.map((group) => (
        <TreeGroup
          key={group.id}
          groupKey={`cat-${group.id}`}
          name={group.name}
          items={group.items}
          expanded={expanded}
          selection={selection}
          search={search}
          onToggle={onToggle}
          onSelectGroup={() => onToggle(`cat-${group.id}`)}
          onSelectItem={(id) => onSelect({ kind: "item", id })}
        />
      ))}
      {groups.length === 0 && <p className="empty">No categories yet. Add some on the Home page.</p>}
    </div>
  );
}

interface AllItemsProps {
  items: GearItem[];
  selection: Selection;
  statusFilter: GearStatus | "all";
  onStatusFilter: (s: GearStatus | "all") => void;
  onSelect: (id: string) => void;
}

export function AllItemsList({ items, selection, statusFilter, onStatusFilter, onSelect }: AllItemsProps): JSX.Element {
  return (
    <div className="tree-section">
      <div className="filter-row">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            className={statusFilter === s ? "chip active" : "chip"}
            onClick={() => onStatusFilter(s)}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <ul className="leaf-list flat">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            selected={selection.kind === "item" && selection.id === item.id}
            onSelect={() => onSelect(item.id)}
          />
        ))}
        {items.length === 0 && <li className="empty">No matches</li>}
      </ul>
    </div>
  );
}
