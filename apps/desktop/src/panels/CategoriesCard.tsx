import { useState } from "react";
import type { Category } from "@pack-attack/shared";
import { DeleteIconButton } from "../components/DeleteIconButton";

interface Props {
  categories: Category[];
  getKitCount: (categoryId: string) => number;
  getItemCount: (categoryId: string) => number;
  onAdd: (name: string) => Category | null;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function CategoriesCard({
  categories,
  getKitCount,
  getItemCount,
  onAdd,
  onRename,
  onDelete
}: Props): JSX.Element {
  const [newName, setNewName] = useState("");
  return (
    <section className="card">
      <h3>Categories <span className="muted">(library)</span></h3>
      <ul className="category-list">
        {categories.map((cat) => {
          const kitCount = getKitCount(cat.id);
          const itemCount = getItemCount(cat.id);
          return (
            <li key={cat.id} className="category-row">
              <input
                className="category-name"
                value={cat.name}
                onChange={(e) => onRename(cat.id, e.target.value)}
              />
              <span className="category-meta">
                {kitCount} kit{kitCount === 1 ? "" : "s"} · {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
              <DeleteIconButton
                onClick={() => onDelete(cat.id)}
                label={`Delete ${cat.name}`}
              />
            </li>
          );
        })}
      </ul>
      <div className="add-row">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category"
          onKeyDown={(e) => {
            if (e.key === "Enter" && onAdd(newName)) setNewName("");
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (onAdd(newName)) setNewName("");
          }}
        >
          Add
        </button>
      </div>
    </section>
  );
}
