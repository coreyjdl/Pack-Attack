import { useMemo, useState } from "react";
import type { LibraryItem } from "@pack-attack/shared";

interface Props {
  items: LibraryItem[];
  /** Library item ids already in the current trip — shown as disabled. */
  excludeIds: Set<string>;
  onPick: (ids: string[]) => void;
  onClose: () => void;
}

/** Modal picker for importing existing library items into the active trip. */
export function LibraryPicker({ items, excludeIds, onPick, onClose }: Props): JSX.Element {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  function toggle(id: string): void {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="lightbox" onClick={onClose}>
      <div
        className="library-picker"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Add from library"
      >
        <header className="picker-head">
          <strong>Add from library</strong>
          <input
            autoFocus
            placeholder="Search library…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
        </header>
        <ul className="picker-list">
          {filtered.map((it) => {
            const already = excludeIds.has(it.id);
            const isPicked = picked.has(it.id);
            return (
              <li key={it.id} className={already ? "picker-row disabled" : "picker-row"}>
                <button
                  type="button"
                  className={isPicked ? "picker-toggle active" : "picker-toggle"}
                  disabled={already}
                  aria-pressed={isPicked}
                  onClick={() => toggle(it.id)}
                >
                  <span>{it.name}</span>
                  {already && <span className="muted"> (already in trip)</span>}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="empty">No matches</li>}
        </ul>
        <footer className="picker-foot">
          <span className="muted">{picked.size} selected</span>
          <button
            type="button"
            disabled={picked.size === 0}
            onClick={() => {
              onPick(Array.from(picked));
              onClose();
            }}
          >
            Add to trip
          </button>
        </footer>
      </div>
    </div>
  );
}
