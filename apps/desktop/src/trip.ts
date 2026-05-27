import type {
  Category,
  GearItem,
  Kit,
  LibraryData,
  LibraryItem,
  LibraryKit,
  PackingList,
  StorageLocation,
  Trip,
  TripItemRef,
  TripKitRef
} from "@pack-attack/shared";

/** Build a synthetic GearItem from a library item + per-trip ref so existing
 *  UI components (which expect GearItem) can render trip data unchanged. */
export function projectItem(lib: LibraryItem, ref: TripItemRef, kitVehicleId?: string): GearItem {
  return {
    id: lib.id,
    name: lib.name,
    categoryId: ref.categoryId ?? lib.defaultCategoryId ?? "",
    kitId: ref.kitId ?? lib.defaultKitId,
    locationId: ref.locationId ?? lib.defaultLocationId,
    vehicleId: ref.vehicleId ?? kitVehicleId,
    quantity: ref.quantity ?? lib.defaultQuantity ?? 1,
    weightGrams: lib.weightGrams,
    volumeMl: lib.volumeMl,
    consumable: lib.consumable,
    consumableUnit: lib.consumableUnit,
    expiresAt: lib.expiresAt,
    perishable: lib.perishable,
    usedTripIds: lib.usedTripIds,
    unusedTripIds: lib.unusedTripIds,
    status: ref.status,
    notes: ref.packingNotes,
    reviewNotes: lib.reviewNotes,
    itemUrl: lib.itemUrl,
    replacementUrl: lib.replacementUrl,
    photoUris: lib.photoUris
  };
}

export function projectKit(libKit: LibraryKit, ref: TripKitRef | undefined, itemIds: string[]): Kit {
  return {
    id: libKit.id,
    name: libKit.name,
    description: libKit.description,
    notes: libKit.notes,
    categoryId: libKit.defaultCategoryId ?? "",
    locationId: ref?.locationId ?? libKit.defaultLocationId,
    vehicleId: ref?.vehicleId,
    itemIds,
    photoUris: libKit.photoUris
  };
}

/** Effective items currently in a trip, projected to GearItem shape. */
export function effectiveItems(trip: Trip, library: LibraryData): GearItem[] {
  const byId = new Map(library.items.map((i) => [i.id, i]));
  const out: GearItem[] = [];
  for (const [id, ref] of Object.entries(trip.itemRefs)) {
    const lib = byId.get(id);
    if (!lib) continue;
    const kitId = ref.kitId ?? lib.defaultKitId;
    const kitVehicleId = kitId ? trip.kitRefs[kitId]?.vehicleId : undefined;
    out.push(projectItem(lib, ref, kitVehicleId));
  }
  return out;
}

/** Effective kits used in a trip (any kit referenced by an item in the trip, or
 *  explicitly added via kitRefs). */
export function effectiveKits(trip: Trip, library: LibraryData, items: GearItem[]): Kit[] {
  const usedKitIds = new Set<string>();
  for (const it of items) if (it.kitId) usedKitIds.add(it.kitId);
  for (const k of Object.keys(trip.kitRefs)) usedKitIds.add(k);
  const byId = new Map(library.kits.map((k) => [k.id, k]));
  const itemsByKit = new Map<string, string[]>();
  for (const it of items) {
    if (!it.kitId) continue;
    const arr = itemsByKit.get(it.kitId) ?? [];
    arr.push(it.id);
    itemsByKit.set(it.kitId, arr);
  }
  return Array.from(usedKitIds)
    .map((id) => {
      const lib = byId.get(id);
      if (!lib) return null;
      return projectKit(lib, trip.kitRefs[id], itemsByKit.get(id) ?? []);
    })
    .filter((x): x is Kit => x !== null);
}

/** Effective categories — all library categories (always available). */
export function effectiveCategories(library: LibraryData): Category[] {
  return library.categories;
}

/** Effective locations — all library locations. */
export function effectiveLocations(library: LibraryData): StorageLocation[] {
  return library.locations;
}

/** Build a PackingList for export/print, optionally filtered to a scope. */
export function buildPackingList(
  trip: Trip,
  library: LibraryData,
  filter?: (item: GearItem) => boolean
): PackingList {
  const items = effectiveItems(trip, library);
  const kits = effectiveKits(trip, library, items);
  const filtered = filter ? items.filter(filter) : items;
  return {
    id: trip.id,
    name: trip.name,
    tripType: trip.tripType,
    categories: library.categories,
    locations: library.locations,
    kits,
    items: filtered,
    updatedAt: trip.updatedAt
  };
}
