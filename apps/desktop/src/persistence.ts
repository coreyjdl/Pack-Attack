import {
  defaultCategories,
  makeDefaultStorageLocations,
  type Category,
  type GearItem,
  type GearStatus,
  type Kit,
  type LibraryData,
  type LibraryItem,
  type LibraryKit,
  type StorageLocation,
  type Trip,
  type Vehicle
} from "@pack-attack/shared";
import { STORAGE_KEY, STORAGE_KEY_V2, STORAGE_KEY_V3, STORAGE_KEY_V4 } from "./constants";
import { makeSeedLibrary, makeSeedTrip, seedVehicles } from "./seedData";
import type {
  PersistedStateV1,
  PersistedStateV2,
  PersistedStateV3,
  PersistedStateV4,
  VehicleData
} from "./types";

export function makeDefaultLibrary(): LibraryData {
  return makeSeedLibrary();
}

export function makeFreshState(): PersistedStateV4 {
  const vehicles = seedVehicles;
  const library = makeSeedLibrary();
  const trip = makeSeedTrip(vehicles.map((v) => v.id));
  return {
    schemaVersion: 4,
    vehicles,
    library,
    trips: [trip],
    activeTripId: trip.id
  };
}

function uniqueById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Map<string, T>();
  for (const x of arr) if (!seen.has(x.id)) seen.set(x.id, x);
  return Array.from(seen.values());
}

/** Promote a v2 GearItem to a LibraryItem (dedupe by linkGroupId or id). */
function libraryItemFromGear(g: GearItem): LibraryItem {
  return {
    id: g.linkGroupId ?? g.id,
    name: g.name,
    photoUris: g.photoUris,
    reviewNotes: g.reviewNotes,
    itemUrl: g.itemUrl,
    replacementUrl: g.replacementUrl,
    defaultCategoryId: g.categoryId,
    defaultKitId: g.kitId,
    defaultLocationId: g.locationId,
    defaultQuantity: g.quantity,
    weightGrams: g.weightGrams,
    volumeMl: g.volumeMl
  };
}

function libraryKitFromKit(k: Kit): LibraryKit {
  return {
    id: k.id,
    name: k.name,
    description: k.description,
    notes: k.notes,
    photoUris: k.photoUris,
    defaultCategoryId: k.categoryId,
    defaultLocationId: k.locationId
  };
}

function normalizeStatus(status: string): GearStatus {
  if (status === "packed" || status === "staged") return status;
  return "missing";
}

function migrateV2ToV3(v2: PersistedStateV2): PersistedStateV3 {
  const allCategories: Category[] = [];
  const allLocations: StorageLocation[] = [];
  const allKits: LibraryKit[] = [];
  const allItems: LibraryItem[] = [];
  const trips: Trip[] = [];
  const now = new Date().toISOString();

  for (const vehicle of v2.vehicles) {
    const data = v2.vehicleData[vehicle.id];
    if (!data) continue;
    allCategories.push(...data.categories);
    allLocations.push(...data.locations);
    allKits.push(...data.kits.map(libraryKitFromKit));

    const itemRefs: Trip["itemRefs"] = {};
    for (const it of data.items) {
      const libId = it.linkGroupId ?? it.id;
      // first sighting wins for canonical library entry
      if (!allItems.some((x) => x.id === libId)) {
        allItems.push({ ...libraryItemFromGear(it), id: libId });
      }
      itemRefs[libId] = {
        status: normalizeStatus(it.status),
        quantity: it.quantity,
        vehicleId: vehicle.id,
        categoryId: it.categoryId,
        kitId: it.kitId,
        locationId: it.locationId,
        packingNotes: it.notes
      };
    }

    trips.push({
      id: `trip-${vehicle.id}`,
      name: `${vehicle.name} — Default`,
      tripType: data.tripType ?? "",
      vehicleIds: [vehicle.id],
      itemRefs,
      kitRefs: {},
      createdAt: now,
      updatedAt: now
    });
  }

  const library: LibraryData = {
    items: uniqueById(allItems),
    kits: uniqueById(allKits),
    categories: uniqueById(allCategories.length ? allCategories : defaultCategories),
    locations: uniqueById(allLocations.length
      ? allLocations
      : makeDefaultStorageLocations(v2.vehicles[0]?.id ?? "vehicle-default")),
    people: []
  };

  return {
    schemaVersion: 3,
    vehicles: v2.vehicles,
    library,
    trips: trips.length > 0 ? trips : [makeSeedTrip(v2.vehicles.map((v) => v.id))],
    activeTripId: trips[0]?.id ?? "trip-default"
  };
}

function migrateV1ToV2(v1: PersistedStateV1): PersistedStateV2 {
  const vehicleId = "vehicle-default";
  return {
    schemaVersion: 2,
    vehicles: [{ id: vehicleId, name: "My Vehicle" }],
    activeVehicleId: vehicleId,
    vehicleData: {
      [vehicleId]: {
        listName: "Packing List",
        tripType: "",
        categories: v1.categories,
        locations: v1.locations,
        kits: v1.kits,
        items: v1.items
      }
    }
  };
}

/** Normalize a parsed v3 object — ensures all required collections exist. */
function normalizeV3(raw: PersistedStateV3): PersistedStateV3 {
  const fallbackVehicleId = raw.vehicles?.[0]?.id ?? "vehicle-default";
  return {
    schemaVersion: 3,
    vehicles: raw.vehicles ?? [],
    library: {
      items: raw.library?.items ?? [],
      kits: raw.library?.kits ?? [],
      categories: raw.library?.categories ?? defaultCategories,
      locations: raw.library?.locations ?? makeDefaultStorageLocations(fallbackVehicleId),
      people: raw.library?.people ?? []
    },
    trips: (raw.trips ?? []).map((t) => ({ ...t, riderAssignments: t.riderAssignments ?? {} })),
    activeTripId:
      raw.activeTripId && raw.trips?.some((t) => t.id === raw.activeTripId)
        ? raw.activeTripId
        : raw.trips?.[0]?.id ?? "trip-default"
  };
}

/** Migrate v3 → v4: tighten StorageLocation.vehicleId, prune orphan postReview entries,
 *  null out TripTask FKs that point at missing entities, clear ref.locationId values
 *  whose location belongs to a different vehicle, and drop the legacy Vehicle.rider field.
 *  Also enforces the minimum invariants: ≥1 vehicle and ≥1 trip. */
function migrateV3ToV4(v3: PersistedStateV3): PersistedStateV4 {
  const v3n = normalizeV3(v3);

  // Drop deprecated Vehicle.rider (cast away the legacy optional field).
  let vehicles: Vehicle[] = v3n.vehicles.map((v) => {
    const { rider: _drop, ...rest } = v as Vehicle & { rider?: string };
    void _drop;
    return rest;
  });

  // Invariant: at least one vehicle. Seed a default if the stored state somehow lost them all.
  if (vehicles.length === 0) vehicles = [{ id: "vehicle-default", name: "My Vehicle" }];
  const fallbackVehicleId = vehicles[0].id;

  // Backfill orphan locations onto the first vehicle.
  const locations: StorageLocation[] = v3n.library.locations.map((l) =>
    l.vehicleId ? l : { ...l, vehicleId: fallbackVehicleId }
  );

  const itemIds = new Set(v3n.library.items.map((i) => i.id));
  const personIds = new Set(v3n.library.people.map((p) => p.id));
  const vehicleIds = new Set(vehicles.map((v) => v.id));
  const locVehicle = new Map(locations.map((l) => [l.id, l.vehicleId]));

  const trips: Trip[] = v3n.trips.map((t) => {
    // Prune postReview entries that no longer reference a library item.
    const postReview = t.postReview
      ? Object.fromEntries(Object.entries(t.postReview).filter(([k]) => itemIds.has(k)))
      : undefined;

    // Null out TripTask FKs that point at deleted entities.
    const tasks = t.tasks?.map((task) => {
      const next = { ...task };
      if (next.personId && !personIds.has(next.personId)) next.personId = undefined;
      if (next.vehicleId && !vehicleIds.has(next.vehicleId)) next.vehicleId = undefined;
      if (next.itemId && !itemIds.has(next.itemId)) next.itemId = undefined;
      return next;
    });

    // Clear locationId on item/kit refs whose location belongs to a different vehicle than the ref.
    const itemRefs = { ...t.itemRefs };
    for (const [k, ref] of Object.entries(itemRefs)) {
      const normalizedStatus = normalizeStatus(ref.status);
      if (!ref.locationId) {
        if (ref.status !== normalizedStatus) itemRefs[k] = { ...ref, status: normalizedStatus };
        continue;
      }
      const lv = locVehicle.get(ref.locationId);
      if (!lv) {
        itemRefs[k] = { ...ref, status: normalizedStatus, locationId: undefined };
      } else if (ref.vehicleId && lv !== ref.vehicleId) {
        itemRefs[k] = { ...ref, status: normalizedStatus, locationId: undefined };
      } else if (ref.status !== normalizedStatus) {
        itemRefs[k] = { ...ref, status: normalizedStatus };
      }
    }
    const kitRefs = { ...t.kitRefs };
    for (const [k, ref] of Object.entries(kitRefs)) {
      if (!ref.locationId) continue;
      const lv = locVehicle.get(ref.locationId);
      if (!lv) {
        kitRefs[k] = { ...ref, locationId: undefined };
      } else if (ref.vehicleId && lv !== ref.vehicleId) {
        kitRefs[k] = { ...ref, locationId: undefined };
      }
    }

    return { ...t, postReview, tasks, itemRefs, kitRefs };
  });

  return {
    schemaVersion: 4,
    vehicles,
    library: { ...v3n.library, locations },
    // Invariant: at least one trip.
    trips: trips.length > 0 ? trips : [makeSeedTrip(vehicles.map((v) => v.id))],
    activeTripId: trips.length > 0 ? v3n.activeTripId : "trip-default"
  };
}

export function loadPersisted(): PersistedStateV4 {
  // v4
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V4);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedStateV4;
      if (parsed.schemaVersion === 4 && parsed.library && parsed.trips?.length && parsed.vehicles?.length) {
        return migrateV3ToV4(parsed as unknown as PersistedStateV3);
      }
    }
  } catch {
    /* fall through */
  }
  // v3 → v4
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V3);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedStateV3;
      if (parsed.schemaVersion === 3 && parsed.library && parsed.trips?.length) {
        return migrateV3ToV4(parsed);
      }
    }
  } catch {
    /* fall through */
  }
  // v2 → v3 → v4
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedStateV2 & {
        bikes?: Vehicle[];
        activeBikeId?: string;
        bikeData?: Record<string, VehicleData>;
      };
      const vehicles = parsed.vehicles ?? parsed.bikes;
      const activeVehicleId = parsed.activeVehicleId ?? parsed.activeBikeId;
      const vehicleData = parsed.vehicleData ?? parsed.bikeData;
      if (vehicles?.length && vehicleData && activeVehicleId) {
        return migrateV3ToV4(migrateV2ToV3({ schemaVersion: 2, vehicles, activeVehicleId, vehicleData }));
      }
    }
  } catch {
    /* fall through */
  }
  // v1 → v2 → v3 → v4
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v1 = JSON.parse(raw) as PersistedStateV1;
      if (v1.categories && v1.locations && v1.kits && v1.items) {
        return migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(v1)));
      }
    }
  } catch {
    /* fall through */
  }
  return makeFreshState();
}
