import type { StorageLocation } from "@pack-attack/shared";
import { LOCATION_KIND_OPTIONS } from "../constants";

interface Props {
  value: StorageLocation["kind"];
  onChange: (kind: StorageLocation["kind"]) => void;
  title?: string;
}

/** Shared `<select>` for storage-location kinds. */
export function KindSelect({ value, onChange, title }: Props): JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as StorageLocation["kind"])}
      title={title}
    >
      {LOCATION_KIND_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
