import { useState, type ChangeEvent } from "react";
import { pickImageFiles } from "../utils";
import { MAX_PHOTO_BYTES } from "../constants";
import { DeleteIconButton } from "./DeleteIconButton";

interface Props {
  photos: string[];
  alt: string;
  onAdd: (file: File) => void;
  onRemove: (idx: number) => void;
  onView: (src: string) => void;
  /** Called with a friendly message when a file is rejected (too big, not an image, etc.). */
  onReject?: (message: string) => void;
}

/** Reusable photo grid with drag-drop, click-to-zoom, file-size guard, and MIME validation on both drop + picker. */
export function PhotoGrid({ photos, alt, onAdd, onRemove, onView, onReject }: Props): JSX.Element {
  const [dragOver, setDragOver] = useState(false);

  function intake(files: File[]): void {
    for (const f of files) {
      if (f.size > MAX_PHOTO_BYTES) {
        onReject?.(`"${f.name}" is too large (${Math.round(f.size / 1024)} KB). Max ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`);
        continue;
      }
      onAdd(f);
    }
  }

  function onPickerChange(e: ChangeEvent<HTMLInputElement>): void {
    const files = e.target.files;
    if (!files) return;
    intake(pickImageFiles(files));
    e.target.value = "";
  }

  return (
    <div
      className={dragOver ? "photo-grid drag-over" : "photo-grid"}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        const related = e.relatedTarget as Node | null;
        if (related && e.currentTarget.contains(related)) return;
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        intake(pickImageFiles(e.dataTransfer.files));
      }}
    >
      {photos.map((src, idx) => (
        <div key={`${idx}-${src.slice(-32)}`} className="photo-tile">
          <img
            src={src}
            alt={`${alt} ${idx + 1}`}
            onClick={() => onView(src)}
            style={{ cursor: "zoom-in" }}
          />
          <DeleteIconButton
            className="photo-remove"
            onClick={() => onRemove(idx)}
            label="Delete photo"
          />
        </div>
      ))}
      <label className="photo-add">
        <input type="file" accept="image/*" multiple onChange={onPickerChange} />
        <span>+ Add photo</span>
      </label>
    </div>
  );
}
