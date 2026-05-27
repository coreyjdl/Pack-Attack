import { useMemo, useState } from "react";
import type {
  GearItem,
  Kit,
  Person,
  StorageLocation,
  Trip,
  Vehicle
} from "@pack-attack/shared";
import { Stat } from "../components/Stat";
import type { Selection, ViewMode } from "../types";
import { gramsToLb } from "../units";

interface Props {
  trip: Trip;
  kits: Kit[];
  locations: StorageLocation[];
  items: GearItem[];
  vehicles: Vehicle[];
  people: Person[];
  onSelect: (s: Selection) => void;
  onSwitchView: (m: ViewMode) => void;
  onOpenTrips: () => void;
  onSetReview: (libraryItemId: string, verdict: "used" | "unused" | "unsure" | undefined) => void;
}

export function HomePanel({
  trip,
  kits,
  locations,
  items,
  vehicles,
  people,
  onSelect,
  onSwitchView,
  onOpenTrips,
  onSetReview
}: Props): JSX.Element {
  const missing = items.filter((i) => i.status === "missing").length;
  const staged = items.filter((i) => i.status === "staged").length;
  const packed = items.filter((i) => i.status === "packed").length;
  const tripVehicles = vehicles.filter((v) => trip.vehicleIds.includes(v.id));

  const totalGrams = items.reduce((acc, i) => acc + (i.weightGrams ?? 0) * (i.quantity || 1), 0);

  function vehicleStats(vehicleId: string): { packed: number; staged: number; missing: number; total: number; grams: number } {
    let p = 0, s = 0, m = 0, g = 0;
    for (const it of items) {
      if (it.kitId) {
        const kit = kits.find((k) => k.id === it.kitId);
        // Items routed via kit override take the kit's vehicle if any (best-effort lookup via trip.kitRefs)
        if (kit) {
          const kitRef = trip.kitRefs[kit.id];
          if (kitRef?.vehicleId && kitRef.vehicleId !== vehicleId) continue;
        }
      }
      const ref = trip.itemRefs[it.id];
      const carried = ref?.vehicleId;
      if (carried !== vehicleId) continue;
      if (it.status === "packed") p++;
      else if (it.status === "staged") s++;
      else if (it.status === "missing") m++;
      g += (it.weightGrams ?? 0) * (it.quantity || 1);
    }
    return { packed: p, staged: s, missing: m, total: p + s + m, grams: g };
  }

  function daysUntilStart(): number | null {
    if (!trip.startDate) return null;
    const start = new Date(trip.startDate + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((start.getTime() - today.getTime()) / 86_400_000);
  }
  const daysLeft = daysUntilStart();

  const tripIsOver = useMemo(() => {
    const end = trip.endDate ?? trip.startDate;
    if (!end) return false;
    return end < new Date().toISOString().slice(0, 10);
  }, [trip.endDate, trip.startDate]);

  const reviewedCount = Object.keys(trip.postReview ?? {}).length;
  const reviewGroups = useMemo(() => {
    const byKit = new Map<string, GearItem[]>();
    const unassigned: GearItem[] = [];
    for (const it of items) {
      if (it.kitId) {
        const list = byKit.get(it.kitId) ?? [];
        list.push(it);
        byKit.set(it.kitId, list);
      } else {
        unassigned.push(it);
      }
    }
    const kitGroups = kits
      .map((kit) => ({
        id: `kit:${kit.id}`,
        title: kit.name,
        items: (byKit.get(kit.id) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))
      }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.title.localeCompare(b.title));

    const groups = [...kitGroups];
    if (unassigned.length > 0) {
      groups.push({
        id: "kit:unassigned",
        title: "Unassigned items",
        items: unassigned.slice().sort((a, b) => a.name.localeCompare(b.name))
      });
    }
    return groups;
  }, [items, kits]);

  function groupVerdict(groupItems: GearItem[]): "used" | "unused" | "unsure" | undefined {
    if (groupItems.length === 0) return undefined;
    const first = trip.postReview?.[groupItems[0].id];
    if (!first) return undefined;
    return groupItems.every((it) => trip.postReview?.[it.id] === first) ? first : undefined;
  }

  function setGroupReview(groupItems: GearItem[], verdict: "used" | "unused" | "unsure"): void {
    const current = groupVerdict(groupItems);
    const next = current === verdict ? undefined : verdict;
    for (const it of groupItems) {
      onSetReview(it.id, next);
    }
  }

  return (
    <div className="panel">
      <header className="panel-header">
        <div>
          <h2>{trip.name || "Trip Overview"}</h2>
          <p className="panel-sub">
            {tripVehicles.length} vehicle{tripVehicles.length === 1 ? "" : "s"} · {items.length} items
          </p>
        </div>
      </header>

      <section className="card">
        <h3>This trip {daysLeft !== null && (
          <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>
            · {daysLeft < 0 ? `started ${-daysLeft}d ago` : daysLeft === 0 ? "starts today" : `${daysLeft}d to go`}
          </span>
        )}</h3>
        <div className="field-row">
          <label className="field">
            <span>Trip name</span>
            <input value={trip.name} readOnly />
          </label>
          <label className="field">
            <span>Trip type</span>
            <input value={trip.tripType || "(not set)"} readOnly />
          </label>
          <label className="field">
            <span>Start date</span>
            <input type="text" value={trip.startDate ?? "(not set)"} readOnly />
          </label>
          <label className="field">
            <span>End date</span>
            <input type="text" value={trip.endDate ?? "(not set)"} readOnly />
          </label>
        </div>
        <p className="muted">Trip structure, schedules, vehicles, and assignments are managed in Trips.</p>
        <div className="row-actions">
          <button type="button" className="ghost" onClick={onOpenTrips}>Open Trips</button>
        </div>
      </section>

      <div className="stat-grid">
        <Stat label="Packed" value={packed} tone="ok" />
        <Stat label="Staged" value={staged} tone="warn" />
        <Stat label="Missing" value={missing} tone="bad" />
        <Stat label="Total" value={items.length} tone="neutral" />
      </div>

      {totalGrams > 0 && (
        <p className="muted" style={{ marginTop: -8 }}>
          Total weight: {gramsToLb(totalGrams).toFixed(2)} lb
        </p>
      )}

      {tripVehicles.length > 0 && (
        <section className="card">
          <h3>Packing progress by vehicle</h3>
          <div className="veh-progress-list">
            {tripVehicles.map((v) => {
              const s = vehicleStats(v.id);
              const pct = s.total === 0 ? 0 : Math.round((s.packed / s.total) * 100);
              return (
                <div key={v.id} className="veh-progress-row">
                  <div className="veh-progress-head">
                    <strong>{v.name}</strong>
                    <span className="muted">
                      {s.packed}/{s.total} packed · {s.staged}S · {s.missing}M
                      {s.grams > 0 && ` · ${gramsToLb(s.grams).toFixed(1)} lb`}
                    </span>
                  </div>
                  <div className="veh-progress-bar">
                    <div className="veh-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Items appear here once you set "Carried by" on them. Unassigned items aren't counted per‑vehicle.
          </p>
        </section>
      )}

      {tripIsOver && (
        <section className="card">
          <h3>Post‑trip review <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
            · {reviewedCount}/{items.length} reviewed
          </span></h3>
          <p className="muted">
            Review by kit when it makes sense, then override item-by-item as needed. Safety and contingency items can
            stay in your loadout even if they are often marked unused.
          </p>
          {reviewGroups.map((group) => {
            const groupReviewCount = group.items.filter((it) => Boolean(trip.postReview?.[it.id])).length;
            const grpVerdict = groupVerdict(group.items);
            return (
              <div key={group.id} className="review-kit-group">
                <div className="review-kit-head">
                  <h4>
                    {group.title}
                    <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
                      {` · ${groupReviewCount}/${group.items.length} reviewed`}
                    </span>
                  </h4>
                  <div className="review-buttons">
                    <button
                      type="button"
                      className={grpVerdict === "used" ? "chip active" : "chip"}
                      onClick={() => setGroupReview(group.items, "used")}
                    >Mark kit used</button>
                    <button
                      type="button"
                      className={grpVerdict === "unused" ? "chip active" : "chip"}
                      onClick={() => setGroupReview(group.items, "unused")}
                    >Mark kit unused</button>
                    <button
                      type="button"
                      className={grpVerdict === "unsure" ? "chip active" : "chip"}
                      onClick={() => setGroupReview(group.items, "unsure")}
                    >Mark kit unsure</button>
                  </div>
                </div>

                <ul className="review-list">
                  {group.items.map((it) => {
                    const verdict = trip.postReview?.[it.id];
                    return (
                      <li key={it.id} className="review-row">
                        <span className="review-name">{it.name}</span>
                        <div className="review-buttons">
                          <button
                            type="button"
                            className={verdict === "used" ? "chip active" : "chip"}
                            onClick={() => onSetReview(it.id, verdict === "used" ? undefined : "used")}
                          >Used</button>
                          <button
                            type="button"
                            className={verdict === "unused" ? "chip active" : "chip"}
                            onClick={() => onSetReview(it.id, verdict === "unused" ? undefined : "unused")}
                          >Unused</button>
                          <button
                            type="button"
                            className={verdict === "unsure" ? "chip active" : "chip"}
                            onClick={() => onSetReview(it.id, verdict === "unsure" ? undefined : "unsure")}
                          >Unsure</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      <section className="card">
        <h3>Locations</h3>
        {tripVehicles.length > 1 ? (
          <>
            {tripVehicles.map((v) => {
              const locs = locations.filter((l) => l.vehicleId === v.id);
              if (locs.length === 0) return null;
              return (
                <div key={v.id} className="location-vehicle-group">
                  <h4 className="muted">{v.name}</h4>
                  <div className="tile-grid">
                    {locs.map((loc) => {
                      const count = items.filter((i) => i.locationId === loc.id).length;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          className="tile"
                          onClick={() => {
                            onSwitchView("location");
                            onSelect({ kind: "location", id: loc.id });
                          }}
                        >
                          <span className="tile-title">{loc.name}</span>
                          <span className="tile-sub">{loc.kind} · {count} items</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="tile-grid">
            {locations.map((loc) => {
              const count = items.filter((i) => i.locationId === loc.id).length;
              return (
                <button
                  key={loc.id}
                  type="button"
                  className="tile"
                  onClick={() => {
                    onSwitchView("location");
                    onSelect({ kind: "location", id: loc.id });
                  }}
                >
                  <span className="tile-title">{loc.name}</span>
                  <span className="tile-sub">{loc.kind} · {count} items</span>
                </button>
              );
            })}
          </div>
        )}
      </section>


      <section className="card">
        <h3>Kits in this trip</h3>
        <div className="tile-grid">
          {kits.map((kit) => {
            const count = items.filter((i) => i.kitId === kit.id).length;
            return (
              <button
                key={kit.id}
                type="button"
                className="tile"
                onClick={() => {
                  onSwitchView("kit");
                  onSelect({ kind: "kit", id: kit.id });
                }}
              >
                <span className="tile-title">{kit.name}</span>
                <span className="tile-sub">{count} items</span>
              </button>
            );
          })}
          {kits.length === 0 && <p className="muted">No kits in this trip yet.</p>}
        </div>
      </section>
    </div>
  );
}

