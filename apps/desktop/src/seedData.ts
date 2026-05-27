import {
  defaultCategories,
  makeDefaultStorageLocations,
  type LibraryData,
  type LibraryItem,
  type LibraryKit,
  type Person,
  type Trip,
  type TripTask,
  type Vehicle
} from "@pack-attack/shared";

/* ---------------------------------------------------------------------------
 * Fresh-install seed.
 * Minimalist mock that exercises every link in the data model:
 *   1 Vehicle  →  4 default Locations (left/right pannier, tank, tail)
 *   1 Person   →  assigned as rider of the vehicle on the seed Trip
 *   2 Kits     →  Tool Roll (vehicle) + First Aid (FAK)
 *   6 Items    →  span categories, kits, locations, statuses, and one
 *                 consumable + one perishable so all chip filters have content.
 *   1 Trip     →  near-future dates, riderAssignment populated, mixed statuses,
 *                 one preflight task, one prior post-trip review verdict.
 * ------------------------------------------------------------------------- */

export const seedVehicles: Vehicle[] = [
  { id: "vehicle-default", name: "KTM 890 Adventure" }
];

export const seedPeople: Person[] = [
  { id: "person-me", name: "Me", role: "Rider" }
];

export const seedLibraryKits: LibraryKit[] = [
  { id: "tool-roll", name: "Tool Roll", description: "Field-repair essentials.", defaultCategoryId: "vehicle", defaultLocationId: "left-pannier" },
  { id: "first-aid", name: "First Aid Kit", description: "Trauma + meds.", defaultCategoryId: "fak", defaultLocationId: "right-pannier" }
];

export const seedLibraryItems: LibraryItem[] = [
  // Tool Roll
  { id: "socket-set", name: "1/4 Socket Set", defaultCategoryId: "vehicle", defaultKitId: "tool-roll", defaultLocationId: "left-pannier", defaultQuantity: 1 },
  { id: "tire-plugs", name: "Tubeless Plug Kit", defaultCategoryId: "vehicle", defaultKitId: "tool-roll", defaultLocationId: "left-pannier", defaultQuantity: 1 },
  // First Aid Kit
  { id: "tourniquet", name: "CAT Tourniquet", defaultCategoryId: "fak", defaultKitId: "first-aid", defaultLocationId: "right-pannier", defaultQuantity: 1 },
  { id: "ibuprofen", name: "Ibuprofen", defaultCategoryId: "fak", defaultKitId: "first-aid", defaultLocationId: "right-pannier", defaultQuantity: 12, perishable: true, expiresAt: "2027-06-01" },
  // Standalone (no kit) — show that's valid
  { id: "headlamp", name: "Headlamp", defaultCategoryId: "camp", defaultLocationId: "tank-bag", defaultQuantity: 1 },
  { id: "fuel-bottle", name: "Reserve Fuel (1L)", defaultCategoryId: "vehicle", defaultLocationId: "tail-bag", defaultQuantity: 1, consumable: true, consumableUnit: "L" }
];

export function makeSeedLibrary(): LibraryData {
  return {
    items: seedLibraryItems,
    kits: seedLibraryKits,
    categories: defaultCategories,
    locations: makeDefaultStorageLocations(seedVehicles[0].id),
    people: seedPeople
  };
}

/** Build the seed Trip — exercises riderAssignments, mixed statuses, a task, and a prior review. */
export function makeSeedTrip(vehicleIds: string[]): Trip {
  const now = new Date().toISOString();
  const vehicleId = vehicleIds[0];

  // Mixed statuses so the user immediately sees how the chips light up.
  const statusByItem: Record<string, "packed" | "staged" | "missing"> = {
    "socket-set": "packed",
    "tire-plugs": "packed",
    "tourniquet": "staged",
    "ibuprofen": "staged",
    "headlamp": "missing",
    "fuel-bottle": "missing"
  };

  const itemRefs: Trip["itemRefs"] = {};
  for (const it of seedLibraryItems) {
    itemRefs[it.id] = {
      status: statusByItem[it.id] ?? "missing",
      quantity: it.defaultQuantity ?? 1,
      vehicleId
    };
  }

  const kitRefs: Trip["kitRefs"] = {
    "tool-roll": { vehicleId, locationId: "left-pannier" },
    "first-aid": { vehicleId, locationId: "right-pannier" }
  };

  // Trip starts ~10 days out so the timeline panel has something to surface.
  const start = new Date();
  start.setDate(start.getDate() + 10);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  const iso = (d: Date): string => d.toISOString().slice(0, 10);

  const tasks: TripTask[] = [
    {
      id: "task-tclock",
      title: "TCLOCK (tires, controls, lights, oil, chassis, kickstand)",
      category: "preflight",
      done: false,
      dueOffsetDays: -1,
      vehicleId,
      createdAt: now
    }
  ];

  return {
    id: "trip-default",
    name: "Weekend Shakedown",
    tripType: "overland",
    vehicleIds,
    riderAssignments: { [vehicleId]: [seedPeople[0].id] },
    itemRefs,
    kitRefs,
    startDate: iso(start),
    endDate: iso(end),
    tasks,
    // One prior post-trip verdict so the "used 1×" badge on Tourniquet is visible.
    postReview: { tourniquet: "unused" },
    createdAt: now,
    updatedAt: now
  };
}
