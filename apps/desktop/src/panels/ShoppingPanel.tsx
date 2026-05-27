import { useMemo, useState } from "react";
import type { LibraryItem, Trip } from "@pack-attack/shared";
import { STATUS_GLYPH } from "../constants";

interface ShoppingLine {
  libId: string;
  name: string;
  totalQty: number;
  tripIds: string[];
  tripNames: string[];
  perishable: boolean;
  expiresAt?: string;
}

interface Props {
  trips: Trip[];
  libraryItems: LibraryItem[];
  activeTripId: string;
  onCollectItem: (libraryItemId: string, tripIds: string[], scope: "shown" | "active") => void;
  /** Today's ISO yyyy-mm-dd; injected so we can filter to upcoming trips only. */
  today?: string;
}

/**
 * Shopping list view. Aggregates items with status==="missing" across upcoming
 * (non-template) trips, dedupes by library id, and sums per-trip quantities.
 * Also surfaces perishables whose expiry has passed or is within 7 days.
 */
export function ShoppingPanel({ trips, libraryItems, activeTripId, onCollectItem, today }: Props): JSX.Element {
  const todayIso = today ?? new Date().toISOString().slice(0, 10);
  const [includePast, setIncludePast] = useState(false);
  const [includeExpiring, setIncludeExpiring] = useState(true);
  const [collectScope, setCollectScope] = useState<"shown" | "active">("shown");

  const itemById = useMemo(() => new Map(libraryItems.map((x) => [x.id, x])), [libraryItems]);

  const lines: ShoppingLine[] = useMemo(() => {
    const map = new Map<string, ShoppingLine>();
    const upcoming = trips.filter((t) => {
      if (t.isTemplate) return false;
      if (includePast) return true;
      if (!t.startDate && !t.endDate) return true; // undated trips count as upcoming
      const end = t.endDate ?? t.startDate;
      return !end || end >= todayIso;
    });
    for (const t of upcoming) {
      for (const [libId, ref] of Object.entries(t.itemRefs)) {
        if (ref.status !== "missing") continue;
        const lib = itemById.get(libId);
        if (!lib) continue;
        const existing = map.get(libId);
        if (existing) {
          existing.totalQty += ref.quantity || 1;
          if (!existing.tripIds.includes(t.id)) existing.tripIds.push(t.id);
          if (!existing.tripNames.includes(t.name)) existing.tripNames.push(t.name);
        } else {
          map.set(libId, {
            libId,
            name: lib.name,
            totalQty: ref.quantity || 1,
            tripIds: [t.id],
            tripNames: [t.name],
            perishable: !!lib.perishable,
            expiresAt: lib.expiresAt
          });
        }
      }
    }
    /* Expiring perishables: add even if not flagged missing. */
    if (includeExpiring) {
      const horizon = new Date(todayIso + "T00:00:00");
      horizon.setDate(horizon.getDate() + 7);
      const horizonIso = horizon.toISOString().slice(0, 10);
      for (const lib of libraryItems) {
        if (!lib.expiresAt) continue;
        if (lib.expiresAt > horizonIso) continue;
        if (map.has(lib.id)) continue;
        map.set(lib.id, {
          libId: lib.id,
          name: lib.name,
          totalQty: 1,
          tripIds: [],
          tripNames: [],
          perishable: !!lib.perishable,
          expiresAt: lib.expiresAt
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [trips, itemById, libraryItems, includePast, includeExpiring, todayIso]);

  function exportText(): void {
    const txt = lines.map((l) => {
      const tag = l.expiresAt ? ` [exp ${l.expiresAt}]` : "";
      const trips = l.tripNames.length > 0 ? `  — ${l.tripNames.join(", ")}` : "";
      return `[ ] ${l.totalQty} × ${l.name}${tag}${trips}`;
    }).join("\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pack-attack-shopping.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="panel">
      <header className="panel-header">
        <div>
          <h2>Shopping list</h2>
          <p className="panel-sub">
            Items flagged "missing" across {includePast ? "all" : "upcoming"} trips. Optionally include expiring risk items.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost" onClick={exportText} disabled={lines.length === 0}>
            Export .txt
          </button>
        </div>
      </header>

      <section className="card">
        <div className="chip-row">
          <button
            type="button"
            className={includePast ? "chip active" : "chip"}
            aria-pressed={includePast}
            onClick={() => setIncludePast((prev) => !prev)}
          >
            Include past trips
          </button>
          <button
            type="button"
            className={includeExpiring ? "chip active" : "chip"}
            aria-pressed={includeExpiring}
            onClick={() => setIncludeExpiring((prev) => !prev)}
          >
            Also show expiring risk (7d)
          </button>
          <button
            type="button"
            className={collectScope === "shown" ? "chip active" : "chip"}
            aria-pressed={collectScope === "shown"}
            onClick={() => setCollectScope("shown")}
          >
            Collect scope: shown trips
          </button>
          <button
            type="button"
            className={collectScope === "active" ? "chip active" : "chip"}
            aria-pressed={collectScope === "active"}
            onClick={() => setCollectScope("active")}
            disabled={!trips.some((t) => t.id === activeTripId)}
          >
            Collect scope: active trip
          </button>
        </div>
      </section>

      <section className="card">
        {lines.length === 0 ? (
          <p className="muted">Nothing to shop for. Flag items as <strong>missing</strong> to see them here.</p>
        ) : (
          <ul className="shop-list">
            {lines.map((l) => (
              <li key={l.libId} className="shop-row">
                <button
                  type="button"
                  className="shop-confirm"
                  onClick={() => onCollectItem(l.libId, l.tripIds, collectScope)}
                  title={l.tripNames.length > 0 ? "Confirm collected: move from missing to staged" : "No missing trip refs to collect"}
                  aria-label={`Mark ${l.name} collected`}
                  disabled={l.tripNames.length === 0}
                >
                  {STATUS_GLYPH.packed}
                </button>
                <div className="shop-main">
                  <span className="shop-name">
                    <span className="shop-qty">{l.totalQty}×</span> {l.name}
                    {l.perishable && <span className="badge">perishable</span>}
                    {l.expiresAt && <span className="badge warn">exp {l.expiresAt}</span>}
                  </span>
                  {l.tripNames.length > 0 && (
                    <span className="muted shop-trips">for {l.tripNames.join(", ")}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
