export type GearStatus = "packed" | "staged" | "missing";

export interface GearItem {
  id: string;
  name: string;
  categoryId: string;
  kitId?: string;
  locationId?: string;
  /** Which vehicle (in the active trip) is carrying this item. */
  vehicleId?: string;
  quantity: number;
  weightGrams?: number;
  volumeMl?: number;
  status: GearStatus;
  notes?: string;
  reviewNotes?: string;
  itemUrl?: string;
  replacementUrl?: string;
  photoUris?: string[];
  /** Marks this item as a consumable (fuel, CO2, water, food). UI exposes a quantity/units field. */
  consumable?: boolean;
  /** Free-form units for consumables, e.g. "L", "oz", "ct". */
  consumableUnit?: string;
  /** ISO yyyy-mm-dd; preflight/shopping flag when expired or near. */
  expiresAt?: string;
  /** True for perishables (food, batteries) — surfaces in shopping list near departure. */
  perishable?: boolean;
  /** Post-trip usage history (mirrored from LibraryItem). Read-only on GearItem. */
  usedTripIds?: string[];
  unusedTripIds?: string[];
  /** Items that share this id share name, links, review notes, and photos.
   *  Per-placement fields (kit, location, status, quantity, packing notes) remain independent. */
  linkGroupId?: string;
}

export interface Kit {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  categoryId: string;
  locationId?: string;
  /** Vehicle currently carrying this kit (per-trip). */
  vehicleId?: string;
  itemIds: string[];
  photoUris?: string[];
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  parentId?: string;
}

export interface StorageLocation {
  id: string;
  name: string;
  kind: "pannier" | "bag" | "case" | "rack" | "other";
  /** Vehicle this storage belongs to. Every location is owned by exactly one vehicle. */
  vehicleId: string;
}

/** Legacy: sub-section grouping inside a kit (e.g. First Aid → Trauma / Wound Care / Meds).
 *  Still used by the mobile prototype. */
export interface FakSection {
  id: string;
  name: string;
  itemIds: string[];
}

export interface PackingList {
  id: string;
  name: string;
  tripType: string;
  categories: Category[];
  locations: StorageLocation[];
  kits: Kit[];
  items: GearItem[];
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  name: string;
  make?: string;
  model?: string;
  year?: string;
  notes?: string;

  /* Identification */
  vin?: string;
  licensePlate?: string;
  color?: string;
  purchaseDate?: string;

  /* Odometer & fuel */
  odometer?: string;          // free-form so user can write "12,430"
  odometerUnit?: "mi" | "km";
  fuelType?: string;          // e.g. "91 octane premium"
  fuelTankCapacity?: string;  // "4.2 gal" or "16 L"

  /* Tires */
  tireSizeFront?: string;     // e.g. "90/90-21"
  tireSizeRear?: string;      // e.g. "150/70-18"
  tirePressureFront?: string; // e.g. "32 psi"
  tirePressureRear?: string;
  tireBrandModel?: string;    // e.g. "Motoz Tractionator GPS"

  /* Lubrication & filters */
  oilType?: string;           // e.g. "10W-40 full synthetic"
  oilCapacity?: string;       // e.g. "2.4 qt w/ filter"
  oilFilterPart?: string;     // e.g. "HF-204"
  airFilterPart?: string;
  sparkPlugPart?: string;
  sparkPlugGap?: string;

  /* Fluids */
  coolantType?: string;
  brakeFluidType?: string;    // e.g. "DOT 4"
  forkOilWeight?: string;

  /* Final drive */
  finalDrive?: "chain" | "belt" | "shaft" | "";
  chainSpec?: string;         // e.g. "525 × 124 links"
  sprocketFront?: string;     // teeth count
  sprocketRear?: string;

  /* Electrical */
  batteryType?: string;       // e.g. "YTZ10S"
  headlightBulb?: string;
  taillightBulb?: string;

  /* Service intervals */
  serviceIntervalMiles?: string;   // e.g. "4000"
  valveCheckInterval?: string;     // e.g. "16000 mi"
  lastServiceDate?: string;        // ISO yyyy-mm-dd ok
  lastServiceOdometer?: string;
  nextServiceDate?: string;
  nextServiceOdometer?: string;

  /* Paperwork */
  insurancePolicy?: string;
  insuranceExpires?: string;
  registrationExpires?: string;

  /* Trip-side info */
  emergencyContact?: string;
  bloodType?: string;
}

/* ---------------------------------------------------------------------------
 * People — riders / passengers / crew. Stored in the library so they can be
 * reused across trips. Assigned to vehicles on a per-trip basis.
 * ------------------------------------------------------------------------- */

export interface Person {
  id: string;
  name: string;
  nickname?: string;
  role?: string;            // "Rider", "Passenger", "Support", etc.

  /* Contact */
  phone?: string;
  email?: string;
  address?: string;

  /* Personal */
  dateOfBirth?: string;     // yyyy-mm-dd
  age?: string;             // free-form if DOB not given
  height?: string;
  weight?: string;
  licenseNumber?: string;
  licenseExpires?: string;
  passportNumber?: string;
  passportExpires?: string;

  /* Medical */
  bloodType?: string;
  allergies?: string;
  medications?: string;
  conditions?: string;      // diabetes, asthma, etc.
  insuranceProvider?: string;
  insurancePolicy?: string;
  preferredHospital?: string;

  /* Emergency contact */
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;

  /* Gear sizing — handy on trips */
  helmetSize?: string;
  jacketSize?: string;
  gloveSize?: string;
  bootSize?: string;

  notes?: string;
}

/* ---------------------------------------------------------------------------
 * Trip / Library model (v3)
 * Library = canonical, shared catalog of items / kits / categories / locations.
 * Trip    = a packing plan that REFERENCES library entries and adds per-trip
 *           status, quantity, and optional overrides (vehicle / kit / location /
 *           category / packing notes).
 * ------------------------------------------------------------------------- */

export interface LibraryItem {
  id: string;
  name: string;
  photoUris?: string[];
  reviewNotes?: string;
  itemUrl?: string;
  replacementUrl?: string;
  defaultCategoryId?: string;
  defaultKitId?: string;
  defaultLocationId?: string;
  defaultQuantity?: number;
  weightGrams?: number;
  volumeMl?: number;

  /** Marks consumables (fuel, CO2, water, food). Surfaces a quantity field on the trip. */
  consumable?: boolean;
  /** Free-form units for consumable quantity, e.g. "L", "oz", "ct". */
  consumableUnit?: string;
  /** ISO yyyy-mm-dd. Used by trip preflight to warn / surface in shopping list. */
  expiresAt?: string;
  /** True for groceries / food / batteries that should appear on the perishable shopping list near departure. */
  perishable?: boolean;

  /** Post-trip review history. tripIds in chronological order where item was marked "used". */
  usedTripIds?: string[];
  /** tripIds where the item was reviewed but unused. Used for the "3 trips unused" flag. */
  unusedTripIds?: string[];
}

export interface LibraryKit {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  photoUris?: string[];
  defaultCategoryId?: string;
  defaultLocationId?: string;
}

export interface TripItemRef {
  status: GearStatus;
  quantity: number;
  /** Which vehicle (in this trip) carries it. Optional. */
  vehicleId?: string;
  /** Per-trip overrides (otherwise the library default is used). */
  locationId?: string;
  kitId?: string;
  categoryId?: string;
  packingNotes?: string;
}

export interface TripKitRef {
  status?: GearStatus;
  vehicleId?: string;
  locationId?: string;
}

/* ---------------------------------------------------------------------------
 * Trip-level tasks: covers timeline prep (book hotel, get passport),
 * preflight (TCLOCK, fuel bottles full), and shopping (grab perishables).
 * Unified shape so a single panel can group by category and sort by due date.
 * ------------------------------------------------------------------------- */

export type TripTaskCategory = "timeline" | "preflight" | "shopping" | "other";

export interface TripTask {
  id: string;
  title: string;
  notes?: string;
  category: TripTaskCategory;
  done: boolean;
  /** Days relative to trip start. Negative = before (e.g. -60 = 60 days before), 0 = day of, positive = during/after. */
  dueOffsetDays?: number;
  /** Optional explicit due date (ISO yyyy-mm-dd) that overrides dueOffsetDays for this trip. */
  dueDate?: string;
  /** Optional links to a person, vehicle, or item this task is about. */
  personId?: string;
  vehicleId?: string;
  itemId?: string;
  createdAt: string;
  completedAt?: string;
}

/** Per-trip review answer for a single item. */
export type ItemUsageVerdict = "used" | "unused" | "unsure";

/** Difficulty rating for a trip. */
export type TripDifficulty = "easy" | "moderate" | "hard" | "expert";

/** Predominant terrain for a trip. */
export type TripTerrain = "pavement" | "gravel" | "mixed" | "offroad" | "technical" | "water" | "trail";

/** A single reference link attached to a trip (route page, forum thread, booking, etc.). */
export interface TripLink {
  id: string;
  label: string;
  url: string;
}

/** Parsed metadata extracted from an uploaded GPX file. */
export interface TripGpx {
  /** Original filename, e.g. "loop.gpx". */
  filename: string;
  /** Raw GPX XML content (kept so it can be re-exported or re-parsed). */
  xml: string;
  /** Number of track / route points parsed. */
  pointCount?: number;
  /** Bounding box of the route. */
  bounds?: { minLat: number; minLon: number; maxLat: number; maxLon: number };
  /** Computed great-circle distance summed across track points (km). */
  distanceKm?: number;
  /** Computed cumulative elevation gain (meters). */
  elevationGainM?: number;
  /** Discovered track / route names from inside the GPX. */
  trackNames?: string[];
  /** ISO timestamp the file was uploaded. */
  uploadedAt: string;
}

/** Planned route information for a trip. Distances may be manually entered or
 *  computed from an attached GPX file. */
export interface TripRoute {
  name?: string;
  notes?: string;
  /** Manual override (km). When undefined the UI falls back to gpx.distanceKm. */
  distanceKm?: number;
  /** Manual override (meters). */
  elevationGainM?: number;
  difficulty?: TripDifficulty;
  terrain?: TripTerrain;
  gpx?: TripGpx;
}

export interface Trip {
  id: string;
  name: string;
  tripType: string;
  vehicleIds: string[];
  /** Per-trip person→vehicle assignments. vehicleId -> personIds[] */
  riderAssignments?: Record<string, string[]>;
  itemRefs: Record<string, TripItemRef>;
  kitRefs: Record<string, TripKitRef>;
  /** ISO yyyy-mm-dd. Drives timeline task due dates & post-trip review surfacing. */
  startDate?: string;
  endDate?: string;
  /** Trip-level tasks (timeline / preflight / shopping). */
  tasks?: TripTask[];
  /** Post-trip review verdicts keyed by libraryItemId. */
  postReview?: Record<string, ItemUsageVerdict>;
  /** True if this Trip is saved as a reusable template (hidden from regular trip list). */
  isTemplate?: boolean;
  /** Display name for the template (defaults to trip.name when isTemplate). */
  templateName?: string;

  /* ---------------- Rich trip details (all optional) ---------------- */
  /** Free-form summary or pitch for the trip. */
  description?: string;
  /** Starting point — city, trailhead, address. */
  origin?: string;
  /** Primary destination. */
  destination?: string;
  /** Planned route + optional GPX. */
  route?: TripRoute;
  /** Forecast notes / seasonal considerations. */
  weatherNotes?: string;
  /** Lodging / camping plan. */
  lodging?: string;
  /** Permits, reservations, fees. */
  permits?: string;
  /** Budget note (free text — e.g. "$400 fuel + camp"). */
  budget?: string;
  /** Emergency contact name + phone (free text). */
  emergencyContact?: string;
  emergencyPhone?: string;
  /** External reference links (route page, booking, weather, etc.). */
  links?: TripLink[];

  createdAt: string;
  updatedAt: string;
}

export interface LibraryData {
  items: LibraryItem[];
  kits: LibraryKit[];
  categories: Category[];
  locations: StorageLocation[];
  people: Person[];
}

export const defaultCategories: Category[] = [
  { id: "docs", name: "Docs + Admin" },
  { id: "vehicle", name: "Vehicle + Tool Roll" },
  { id: "camp", name: "Camp + Sleep" },
  { id: "kitchen", name: "Kitchen + Water" },
  { id: "layers", name: "Riding Layers" },
  { id: "fak", name: "First Aid Kit" }
];

/** Factory: build the default storage locations bound to a given vehicle. */
export function makeDefaultStorageLocations(vehicleId: string): StorageLocation[] {
  return [
    { id: "left-pannier", name: "Left Pannier", kind: "pannier", vehicleId },
    { id: "right-pannier", name: "Right Pannier", kind: "pannier", vehicleId },
    { id: "tank-bag", name: "Tank Bag", kind: "bag", vehicleId },
    { id: "tail-bag", name: "Tail Bag", kind: "bag", vehicleId }
  ];
}

export * from "./sync";
export * from "./exporters";
