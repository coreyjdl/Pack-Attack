import type { GearItem } from "@pack-attack/shared";
import { STATUS_GLYPH } from "../constants";

interface Props {
  items: GearItem[];
  onSelectItem: (id: string) => void;
  onCycleStatus: (id: string) => void;
  kitLookup?: (id?: string) => string | undefined;
  locationLookup?: (id?: string) => string | undefined;
  categoryLookup?: (id: string) => string | undefined;
}

export function ItemChecklist({
  items,
  onSelectItem,
  onCycleStatus,
  kitLookup,
  locationLookup,
  categoryLookup
}: Props): JSX.Element {
  if (items.length === 0) {
    return <p className="muted empty-state">Nothing here yet.</p>;
  }
  return (
    <ul className="checklist">
      {items.map((item) => {
        const meta: string[] = [];
        const kitName = kitLookup?.(item.kitId);
        const locName = locationLookup?.(item.locationId);
        const catName = categoryLookup?.(item.categoryId);
        if (kitName) meta.push(`Kit: ${kitName}`);
        if (locName) meta.push(`At: ${locName}`);
        if (catName && !kitName && !locName) meta.push(catName);
        return (
          <li key={item.id} className="checklist-row">
            <button
              type="button"
              className={`status-toggle status-${item.status}`}
              onClick={() => onCycleStatus(item.id)}
              title="Click to cycle: missing → staged → packed"
              aria-label={`Mark ${item.name} status`}
            >
              {STATUS_GLYPH[item.status]}
            </button>
            <button type="button" className="checklist-main" onClick={() => onSelectItem(item.id)}>
              <span className="checklist-name">
                {item.name}
                {item.quantity > 1 ? <span className="qty"> ×{item.quantity}</span> : null}
              </span>
              {meta.length > 0 && <span className="checklist-meta">{meta.join(" · ")}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
