import type {
  Category,
  GearItem,
  Kit,
  LibraryData,
  StorageLocation,
  Trip,
  Vehicle
} from "@pack-attack/shared";

export type TopMode = "overview" | "trip" | "mobile-pack" | "library" | "trips" | "trip-edit" | "vehicles" | "people" | "shopping" | "tasks";

export type ViewMode = "location" | "kit" | "category" | "all";

export type Selection =
  | { kind: "home" }
  | { kind: "location"; id: string }
  | { kind: "kit"; id: string }
  | { kind: "item"; id: string };

/** Legacy: per-vehicle data shape (v2). Kept for back-compat loading only. */
export interface VehicleData {
  listName: string;
  tripType: string;
  categories: Category[];
  locations: StorageLocation[];
  kits: Kit[];
  items: GearItem[];
}

/** Legacy v1 — flat single-list shape. */
export interface PersistedStateV1 {
  categories: Category[];
  locations: StorageLocation[];
  kits: Kit[];
  items: GearItem[];
}

/** Legacy v2 — multi-vehicle. */
export interface PersistedStateV2 {
  schemaVersion: 2;
  vehicles: Vehicle[];
  activeVehicleId: string;
  vehicleData: Record<string, VehicleData>;
}

/** Legacy v3 — library + trips with optional vehicleId on storage locations. */
export interface PersistedStateV3 {
  schemaVersion: 3;
  vehicles: Vehicle[];
  library: LibraryData;
  trips: Trip[];
  activeTripId: string;
}

/** Current persisted state (v4): tightened — every StorageLocation has a required vehicleId,
 *  Trip.tasks references are pruned, orphan postReview entries removed, Vehicle.rider gone. */
export interface PersistedStateV4 {
  schemaVersion: 4;
  vehicles: Vehicle[];
  library: LibraryData;
  trips: Trip[];
  activeTripId: string;
}
