import type { GearItem } from "@pack-attack/shared";

interface Props {
  item: GearItem;
  selected: boolean;
  onSelect: () => void;
}

export function ItemRow({ item, selected, onSelect }: Props): JSX.Element {
  return (
    <li>
      <button className={selected ? "item-row selected" : "item-row"} onClick={onSelect} type="button">
        <span className={`status-dot status-${item.status}`} aria-hidden />
        <span className="item-name">{item.name}</span>
        {item.quantity > 1 && <span className="qty">×{item.quantity}</span>}
      </button>
    </li>
  );
}
