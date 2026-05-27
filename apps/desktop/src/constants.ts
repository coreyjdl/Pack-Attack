import type { GearItem, GearStatus, StorageLocation } from "@pack-attack/shared";

export const UNASSIGNED = "__unassigned__";
export const STORAGE_KEY = "pack-attack:list:v1";
export const STORAGE_KEY_V2 = "pack-attack:state:v2";
export const STORAGE_KEY_V3 = "pack-attack:state:v3";
export const STORAGE_KEY_V4 = "pack-attack:state:v4";

/** Cycle order for the click-to-toggle status button. */
export const STATUS_CYCLE: GearStatus[] = ["missing", "staged", "packed"];

/** Filter chips order in the All Items view. */
export const STATUS_FILTERS = ["all", "packed", "staged", "missing"] as const;

export const STATUS_LABEL: Record<GearStatus, string> = {
  packed: "Packed",
  staged: "Staged",
  missing: "Missing"
};

/** Glyph rendered inside the round status toggle in the checklist. */
export const STATUS_GLYPH: Record<GearStatus, string> = {
  packed: "✓",
  staged: "•",
  missing: "!"
};

export const LOCATION_KIND_OPTIONS: Array<{ value: StorageLocation["kind"]; label: string }> = [
  { value: "pannier", label: "Pannier" },
  { value: "bag", label: "Bag" },
  { value: "case", label: "Case" },
  { value: "rack", label: "Rack" },
  { value: "other", label: "Other" }
];

/** Fields that are shared across linked item placements (same physical gear in multiple kits/locations or vehicles). */
export const SHARED_ITEM_FIELDS = new Set<keyof GearItem>([
  "name",
  "itemUrl",
  "replacementUrl",
  "photoUris",
  "reviewNotes"
]);

/** Soft cap on a single photo so we don't blow the localStorage quota too fast. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
