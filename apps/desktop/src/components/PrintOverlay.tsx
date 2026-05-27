import { useEffect } from "react";
import type { Category, GearItem, Kit, PackingList, StorageLocation, Vehicle } from "@pack-attack/shared";
import { STATUS_LABEL } from "../constants";

interface Props {
  list: PackingList;
  kits: Kit[];
  locations: StorageLocation[];
  categories: Category[];
  items: GearItem[];
  vehicles: Vehicle[];
  onClose: () => void;
}

export function PrintOverlay({ list, kits, locations, categories, items, vehicles, onClose }: Props): JSX.Element {
  useEffect(() => {
    document.body.classList.add("printing");
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("printing");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const locById = new Map(locations.map((l) => [l.id, l]));
  const kitById = new Map(kits.map((k) => [k.id, k]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const packed = items.filter((i) => i.status === "packed").length;

  type LocGroup = { locId: string; locName: string; kits: Map<string, GearItem[]>; loose: GearItem[] };
  type VehGroup = { vehId: string; vehName: string; locs: Map<string, LocGroup> };

  const vehOrder: string[] = [];
  const vehGroups = new Map<string, VehGroup>();
  const ensureVeh = (vid: string, name: string): VehGroup => {
    let g = vehGroups.get(vid);
    if (!g) {
      g = { vehId: vid, vehName: name, locs: new Map() };
      vehGroups.set(vid, g);
      vehOrder.push(vid);
    }
    return g;
  };
  // Seed in vehicle order so output is stable.
  for (const v of vehicles) ensureVeh(v.id, v.name);

  const ensureLoc = (vg: VehGroup, locId: string): LocGroup => {
    let lg = vg.locs.get(locId);
    if (!lg) {
      const name = locId === "__none__" ? "(no location)" : (locById.get(locId)?.name ?? "(no location)");
      lg = { locId, locName: name, kits: new Map(), loose: [] };
      vg.locs.set(locId, lg);
    }
    return lg;
  };

  for (const it of items) {
    const vid = it.vehicleId && vehicleById.has(it.vehicleId) ? it.vehicleId : "__none__";
    const vg = ensureVeh(vid, vid === "__none__" ? "Unassigned" : (vehicleById.get(vid)?.name ?? vid));
    const lid = it.locationId && locById.has(it.locationId) ? it.locationId : "__none__";
    const lg = ensureLoc(vg, lid);
    if (it.kitId && kitById.has(it.kitId)) {
      const arr = lg.kits.get(it.kitId) ?? [];
      arr.push(it);
      lg.kits.set(it.kitId, arr);
    } else {
      lg.loose.push(it);
    }
  }

  const renderItems = (arr: GearItem[]): JSX.Element => (
    <table className="print-table">
      <thead>
        <tr>
          <th aria-label="check"></th>
          <th>Status</th>
          <th>Qty</th>
          <th>Item</th>
        </tr>
      </thead>
      <tbody>
        {arr.map((it) => (
          <tr key={it.id} className={`print-row status-${it.status}`}>
            <td className="check">☐</td>
            <td className="status">{STATUS_LABEL[it.status]}</td>
            <td className="qty">{it.quantity}</td>
            <td>
              <div className="iname">{it.name}</div>
              {it.notes && <div className="inotes">{it.notes}</div>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Order locations within a vehicle per the library order.
  const orderedLocIds = (vg: VehGroup): string[] => {
    const ids: string[] = [];
    for (const loc of locations) if (vg.locs.has(loc.id)) ids.push(loc.id);
    if (vg.locs.has("__none__")) ids.push("__none__");
    return ids;
  };

  return (
    <div className="print-overlay" role="dialog" aria-label="Print preview">
      <div className="print-toolbar no-print">
        <strong>Print preview</strong>
        <span className="muted">Press Esc to close</span>
        <span className="spacer" />
        <button type="button" onClick={() => window.print()}>Print</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>
      <div className="print-page">
        <h1>{list.name}</h1>
        <p className="print-sub">
          Generated {new Date().toLocaleString()} · {packed}/{items.length} items packed
        </p>
        {vehOrder.map((vid) => {
          const vg = vehGroups.get(vid)!;
          const locIds = orderedLocIds(vg);
          const total = locIds.reduce((sum, lid) => {
            const lg = vg.locs.get(lid)!;
            return sum + lg.loose.length + Array.from(lg.kits.values()).reduce((a, b) => a + b.length, 0);
          }, 0);
          if (total === 0) return null;
          return (
            <section className="print-vehicle" key={vid}>
              <h2 className="print-vehicle-head">{vg.vehName} <span className="muted">· {total} item{total === 1 ? "" : "s"}</span></h2>
              {locIds.map((lid) => {
                const lg = vg.locs.get(lid)!;
                const totalInLoc =
                  lg.loose.length + Array.from(lg.kits.values()).reduce((a, b) => a + b.length, 0);
                if (totalInLoc === 0) return null;
                return (
                  <section className="print-section" key={lid}>
                    <h3>{lg.locName}</h3>
                    {Array.from(lg.kits.entries()).map(([kitId, kitItems]) => {
                      const kit = kitById.get(kitId)!;
                      const catName = catById.get(kit.categoryId)?.name ?? "";
                      return (
                        <div className="print-kit" key={kitId}>
                          <h4>
                            {kit.name}
                            {catName && <span className="muted"> · {catName}</span>}
                          </h4>
                          {renderItems(kitItems)}
                        </div>
                      );
                    })}
                    {lg.loose.length > 0 && (
                      <div className="print-kit">
                        <h4>Loose items</h4>
                        {renderItems(lg.loose)}
                      </div>
                    )}
                  </section>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
