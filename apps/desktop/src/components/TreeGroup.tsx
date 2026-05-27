import type { ReactNode } from "react";
import type { GearItem } from "@pack-attack/shared";
import { ItemRow } from "./ItemRow";
import type { Selection } from "../types";

interface Props {
  groupKey: string;
  name: string;
  items: GearItem[];
  expanded: Record<string, boolean>;
  selection: Selection;
  search: string;
  onToggle: (key: string) => void;
  /** If omitted, the group label is just static text (used for "Unassigned" / category groups). */
  onSelectGroup?: () => void;
  isSelectedGroup?: boolean;
  onSelectItem: (id: string) => void;
  /** Force-open this group regardless of expanded state (used when searching). */
  forceOpen?: boolean;
  /** Extra label class — e.g. "muted-row" for unassigned. */
  labelClassName?: string;
  /** Optional trailing content rendered after children (e.g. "no items" empty state customization). */
  emptyText?: string;
  /** Optional children shown after the items list while open. */
  children?: ReactNode;
}

/** Shared collapsible tree group for Location/Kit/Category trees. */
export function TreeGroup({
  groupKey,
  name,
  items,
  expanded,
  selection,
  search,
  onToggle,
  onSelectGroup,
  isSelectedGroup,
  onSelectItem,
  forceOpen,
  labelClassName,
  emptyText = "No items",
  children
}: Props): JSX.Element | null {
  const matching = search ? items.filter((i) => i.name.toLowerCase().includes(search)) : items;
  if (search && matching.length === 0 && !name.toLowerCase().includes(search)) return null;
  const isOpen = expanded[groupKey] || forceOpen || !!search;

  return (
    <div className="tree-group">
      <div className={isSelectedGroup ? "group-row selected" : "group-row"}>
        <button className="caret" onClick={() => onToggle(groupKey)} type="button" aria-label="Expand">
          {isOpen ? "▾" : "▸"}
        </button>
        {onSelectGroup ? (
          <button className="group-label" onClick={onSelectGroup} type="button">
            <span className="group-name">{name}</span>
            <span className="group-count">{items.length}</span>
          </button>
        ) : (
          <span className={`group-label ${labelClassName ?? ""}`.trim()}>
            <span className="group-name">{name}</span>
            <span className="group-count">{items.length}</span>
          </span>
        )}
      </div>
      {isOpen && (
        <ul className="leaf-list">
          {matching.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              selected={selection.kind === "item" && selection.id === item.id}
              onSelect={() => onSelectItem(item.id)}
            />
          ))}
          {matching.length === 0 && <li className="empty">{emptyText}</li>}
          {children}
        </ul>
      )}
    </div>
  );
}
