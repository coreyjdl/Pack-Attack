import { useEffect, useMemo, useState } from "react";
import {
  exportPackingChecklist,
  exportPackingListToRawCsv,
  exportTripSummary,
  type Category,
  type GearItem,
  type GearStatus,
  type Kit,
  type LibraryData,
  type LibraryItem,
  type LibraryKit,
  type PackingList,
  type Person,
  type StorageLocation,
  type Trip,
  type TripItemRef,
  type TripTask,
  type TripTaskCategory,
  type ItemUsageVerdict,
  type Vehicle
} from "@pack-attack/shared";
import { Lightbox } from "./components/Lightbox";
import { PrintOverlay } from "./components/PrintOverlay";
import { TripSummaryPrint } from "./components/TripSummaryPrint";
import { VehiclesCard } from "./components/Vehicles";
import { LibraryPicker } from "./components/LibraryPicker";
import { ItemChecklist } from "./components/ItemChecklist";
import { AllItemsList, CategoryTree, KitTree, LocationTree } from "./sidebar/Trees";
import { HomePanel } from "./panels/HomePanel";
import { ItemPanel } from "./panels/ItemPanel";
import { KitPanel } from "./panels/KitPanel";
import { LocationPanel } from "./panels/LocationPanel";
import { LibraryPanel } from "./panels/LibraryPanel";
import { TripsPanel } from "./panels/TripsPanel";
import { PeoplePanel } from "./panels/PeoplePanel";
import { ShoppingPanel } from "./panels/ShoppingPanel";
import { MobilePackPanel } from "./panels/MobilePackPanel";
import { TasksPanel } from "./panels/TasksPanel";
import {
  MAX_PHOTO_BYTES,
  STATUS_CYCLE,
  STATUS_FILTERS,
  STORAGE_KEY_V4,
  UNASSIGNED
} from "./constants";
import { loadPersisted, makeFreshState } from "./persistence";
import type { PersistedStateV4, Selection, TopMode, ViewMode } from "./types";
import { downloadTextFile, makeId, readFileAsDataUrl, safeWriteStorage } from "./utils";
import { buildPackingList, effectiveItems, effectiveKits } from "./trip";

interface TripShareBundleV1 {
  kind: "pack-attack-trip-share";
  version: 1;
  exportedAt: string;
  trip: Trip;
  library: LibraryData;
  vehicles: Vehicle[];
}

const SHARED_LIB_FIELDS = new Set<keyof GearItem>([
  "name",
  "itemUrl",
  "replacementUrl",
  "photoUris",
  "reviewNotes",
  "weightGrams",
  "volumeMl",
  "consumable",
  "consumableUnit",
  "expiresAt",
  "perishable"
]);

export function App(): JSX.Element {
  const initial = useMemo<PersistedStateV4>(() => loadPersisted(), []);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initial.vehicles);
  const [library, setLibrary] = useState<LibraryData>(initial.library);
  const [trips, setTrips] = useState<Trip[]>(initial.trips);
  const [activeTripId, setActiveTripId] = useState<string>(initial.activeTripId);
  const [mode, setMode] = useState<TopMode>("overview");
  const [viewMode, setViewMode] = useState<ViewMode>("location");
  const [selection, setSelection] = useState<Selection>({ kind: "home" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<GearStatus | "all">("all");
  const [mobileStatusFilter, setMobileStatusFilter] = useState<GearStatus | "all">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [statusText, setStatusText] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [summaryPrintOpen, setSummaryPrintOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Persist
  useEffect(() => {
    const data: PersistedStateV4 = {
      schemaVersion: 4,
      vehicles,
      library,
      trips,
      activeTripId
    };
    const err = safeWriteStorage(STORAGE_KEY_V4, JSON.stringify(data));
    if (err) setStatusText(err);
  }, [vehicles, library, trips, activeTripId]);

  // Reset selection when switching trips
  useEffect(() => {
    setSelection({ kind: "home" });
  }, [activeTripId]);

  const trip = useMemo<Trip>(
    () => trips.find((t) => t.id === activeTripId) ?? trips[0],
    [trips, activeTripId]
  );

  const items = useMemo<GearItem[]>(() => (trip ? effectiveItems(trip, library) : []), [trip, library]);
  const kits = useMemo<Kit[]>(() => (trip ? effectiveKits(trip, library, items) : []), [trip, library, items]);
  const categories = library.categories;
  const locations = library.locations;

  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const kitById = useMemo(() => new Map(kits.map((k) => [k.id, k])), [kits]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  function locationBucketKey(it: GearItem): string {
    return it.locationId && locationById.has(it.locationId) ? it.locationId : UNASSIGNED;
  }

  const itemsByLocation = useMemo(() => {
    const map = new Map<string, GearItem[]>();
    for (const loc of locations) map.set(loc.id, []);
    map.set(UNASSIGNED, []);
    for (const it of items) {
      const key = locationBucketKey(it);
      map.get(key)!.push(it);
    }
    return map;
  }, [items, locations, locationById]);

  const itemsByKit = useMemo(() => {
    const map = new Map<string, GearItem[]>();
    for (const k of kits) map.set(k.id, []);
    for (const it of items) {
      if (it.kitId && map.has(it.kitId)) map.get(it.kitId)!.push(it);
    }
    return map;
  }, [items, kits]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, GearItem[]>();
    for (const c of categories) map.set(c.id, []);
    map.set(UNASSIGNED, []);
    for (const it of items) {
      const key = it.categoryId && categoryById.has(it.categoryId) ? it.categoryId : UNASSIGNED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return map;
  }, [items, categories, categoryById]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, statusFilter]);

  const currentPackingList: PackingList | null = trip ? buildPackingList(trip, library) : null;

  function toggleExpand(key: string): void {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  /* ---------------- Library mutations ---------------- */
  function libUpdateItem(id: string, patch: Partial<LibraryItem>): void {
    setLibrary((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i))
    }));
  }

  function libUpdateKit(id: string, patch: Partial<LibraryKit>): void {
    setLibrary((prev) => ({
      ...prev,
      kits: prev.kits.map((k) => (k.id === id ? { ...k, ...patch } : k))
    }));
  }

  function libAddItem(name: string, extras?: Partial<LibraryItem>): LibraryItem | null {
    const clean = name.trim();
    if (!clean) return null;
    const created: LibraryItem = { id: makeId(clean), name: clean, defaultQuantity: 1, ...extras };
    setLibrary((prev) => ({ ...prev, items: [...prev.items, created] }));
    return created;
  }

  function libAddKit(name: string, extras?: Partial<LibraryKit>): LibraryKit | null {
    const clean = name.trim();
    if (!clean) return null;
    const created: LibraryKit = { id: makeId(clean), name: clean, ...extras };
    setLibrary((prev) => ({ ...prev, kits: [...prev.kits, created] }));
    return created;
  }

  function libDeleteItem(id: string): void {
    setLibrary((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
    // also remove from every trip's itemRefs, postReview, and null out any TripTask.itemId
    setTrips((prev) =>
      prev.map((t) => {
        const touchesRef = id in t.itemRefs;
        const touchesReview = !!t.postReview && id in t.postReview;
        const touchesTask = !!t.tasks?.some((task) => task.itemId === id);
        if (!touchesRef && !touchesReview && !touchesTask) return t;
        const { [id]: _drop, ...restRefs } = t.itemRefs;
        void _drop;
        const next: Trip = { ...t, itemRefs: restRefs, updatedAt: new Date().toISOString() };
        if (touchesReview && t.postReview) {
          const { [id]: _r, ...restReview } = t.postReview;
          void _r;
          next.postReview = restReview;
        }
        if (touchesTask && t.tasks) {
          next.tasks = t.tasks.map((task) => (task.itemId === id ? { ...task, itemId: undefined } : task));
        }
        return next;
      })
    );
  }

  function libDeleteKit(id: string): void {
    setLibrary((prev) => ({
      ...prev,
      kits: prev.kits.filter((k) => k.id !== id),
      // detach items whose default kit is this kit
      items: prev.items.map((i) => (i.defaultKitId === id ? { ...i, defaultKitId: undefined } : i))
    }));
    setTrips((prev) =>
      prev.map((t) => {
        const { [id]: _, ...restKitRefs } = t.kitRefs;
        const itemRefs = { ...t.itemRefs };
        for (const [k, ref] of Object.entries(itemRefs)) {
          if (ref.kitId === id) itemRefs[k] = { ...ref, kitId: undefined };
        }
        return { ...t, kitRefs: restKitRefs, itemRefs };
      })
    );
  }

  function libAddCategory(name: string): Category | null {
    const clean = name.trim();
    if (!clean) return null;
    const created: Category = { id: makeId(clean), name: clean };
    setLibrary((prev) => ({ ...prev, categories: [...prev.categories, created] }));
    return created;
  }

  function libRenameCategory(id: string, name: string): void {
    setLibrary((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, name } : c))
    }));
  }

  function libDeleteCategory(id: string): void {
    setLibrary((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      items: prev.items.map((i) => (i.defaultCategoryId === id ? { ...i, defaultCategoryId: undefined } : i)),
      kits: prev.kits.map((k) => (k.defaultCategoryId === id ? { ...k, defaultCategoryId: undefined } : k))
    }));
    setTrips((prev) =>
      prev.map((t) => {
        const itemRefs = { ...t.itemRefs };
        for (const [k, ref] of Object.entries(itemRefs)) {
          if (ref.categoryId === id) itemRefs[k] = { ...ref, categoryId: undefined };
        }
        return { ...t, itemRefs };
      })
    );
  }

  function libAddLocation(name: string, kind: StorageLocation["kind"], vehicleId: string): StorageLocation | null {
    const clean = name.trim();
    if (!clean || !vehicleId) return null;
    const created: StorageLocation = { id: makeId(clean), name: clean, kind, vehicleId };
    setLibrary((prev) => ({ ...prev, locations: [...prev.locations, created] }));
    return created;
  }

  function libDeleteLocation(id: string): void {
    setLibrary((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l.id !== id),
      items: prev.items.map((i) => (i.defaultLocationId === id ? { ...i, defaultLocationId: undefined } : i)),
      kits: prev.kits.map((k) => (k.defaultLocationId === id ? { ...k, defaultLocationId: undefined } : k))
    }));
    setTrips((prev) =>
      prev.map((t) => {
        const itemRefs = { ...t.itemRefs };
        for (const [k, ref] of Object.entries(itemRefs)) {
          if (ref.locationId === id) itemRefs[k] = { ...ref, locationId: undefined };
        }
        const kitRefs = { ...t.kitRefs };
        for (const [k, ref] of Object.entries(kitRefs)) {
          if (ref.locationId === id) kitRefs[k] = { ...ref, locationId: undefined };
        }
        return { ...t, itemRefs, kitRefs };
      })
    );
  }

  function libUpdateLocation(id: string, patch: Partial<StorageLocation>): void {
    setLibrary((prev) => ({
      ...prev,
      locations: prev.locations.map((l) => (l.id === id ? { ...l, ...patch } : l))
    }));
  }

  /* ---------------- Vehicle mutations (library-level) ---------------- */
  function addVehicle(input: Omit<Vehicle, "id">): Vehicle | null {
    const clean = input.name?.trim();
    if (!clean) return null;
    const created: Vehicle = { ...input, id: makeId(clean), name: clean };
    setVehicles((prev) => [...prev, created]);
    return created;
  }

  function updateVehicle(id: string, patch: Partial<Vehicle>): void {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function deleteVehicle(id: string): void {
    if (vehicles.length <= 1) {
      alert("You need at least one vehicle.");
      return;
    }
    if (!confirm("Delete this vehicle? Its storage locations will be removed too.")) return;
    // Collect ids of locations bound to this vehicle so we can cascade-clear references.
    const removedLocIds = new Set(library.locations.filter((l) => l.vehicleId === id).map((l) => l.id));
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    setLibrary((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l.vehicleId !== id),
      items: prev.items.map((i) =>
        i.defaultLocationId && removedLocIds.has(i.defaultLocationId) ? { ...i, defaultLocationId: undefined } : i
      ),
      kits: prev.kits.map((k) =>
        k.defaultLocationId && removedLocIds.has(k.defaultLocationId) ? { ...k, defaultLocationId: undefined } : k
      )
    }));
    setTrips((prev) =>
      prev.map((t) => {
        const { [id]: _removed, ...restAssign } = t.riderAssignments ?? {};
        void _removed;
        const itemRefs = Object.fromEntries(
          Object.entries(t.itemRefs).map(([k, ref]) => {
            const next = { ...ref };
            if (next.vehicleId === id) next.vehicleId = undefined;
            if (next.locationId && removedLocIds.has(next.locationId)) next.locationId = undefined;
            return [k, next];
          })
        );
        const kitRefs = Object.fromEntries(
          Object.entries(t.kitRefs).map(([k, ref]) => {
            const next = { ...ref };
            if (next.vehicleId === id) next.vehicleId = undefined;
            if (next.locationId && removedLocIds.has(next.locationId)) next.locationId = undefined;
            return [k, next];
          })
        );
        return {
          ...t,
          vehicleIds: t.vehicleIds.filter((vid) => vid !== id),
          riderAssignments: restAssign,
          itemRefs,
          kitRefs,
          tasks: t.tasks?.map((task) => (task.vehicleId === id ? { ...task, vehicleId: undefined } : task))
        };
      })
    );
  }

  /* ---------------- People (library) ---------------- */
  function libAddPerson(input: Omit<Person, "id">): Person | null {
    const clean = input.name?.trim();
    if (!clean) return null;
    const created: Person = { ...input, id: makeId(clean), name: clean };
    setLibrary((prev) => ({ ...prev, people: [...prev.people, created] }));
    return created;
  }
  function libUpdatePerson(id: string, patch: Partial<Person>): void {
    setLibrary((prev) => ({
      ...prev,
      people: prev.people.map((p) => (p.id === id ? { ...p, ...patch } : p))
    }));
  }
  function libDeletePerson(id: string): void {
    if (!confirm("Delete this person? They will be unassigned from every trip.")) return;
    setLibrary((prev) => ({ ...prev, people: prev.people.filter((p) => p.id !== id) }));
    setTrips((prev) =>
      prev.map((t) => ({
        ...t,
        riderAssignments: Object.fromEntries(
          Object.entries(t.riderAssignments ?? {}).map(([vid, pids]) => [vid, pids.filter((pid) => pid !== id)])
        ),
        tasks: t.tasks?.map((task) => (task.personId === id ? { ...task, personId: undefined } : task))
      }))
    );
  }

  /* ---------------- Trip-level rider assignment ---------------- */
  function tripAssignRider(vehicleId: string, personId: string): void {
    patchActiveTrip((t) => {
      const current = t.riderAssignments ?? {};
      const existing = current[vehicleId] ?? [];
      if (existing.includes(personId)) return t;
      return { ...t, riderAssignments: { ...current, [vehicleId]: [...existing, personId] } };
    });
  }
  function tripUnassignRider(vehicleId: string, personId: string): void {
    patchActiveTrip((t) => {
      const current = t.riderAssignments ?? {};
      const existing = current[vehicleId] ?? [];
      return {
        ...t,
        riderAssignments: { ...current, [vehicleId]: existing.filter((p) => p !== personId) }
      };
    });
  }

  /* ---------------- Trip-level tasks (timeline / preflight / shopping) ---------------- */
  function tripAddTask(input: Omit<TripTask, "id" | "createdAt" | "done">): TripTask {
    const task: TripTask = {
      ...input,
      id: makeId("task"),
      done: false,
      createdAt: new Date().toISOString()
    };
    patchActiveTrip((t) => ({ ...t, tasks: [...(t.tasks ?? []), task] }));
    return task;
  }
  function tripUpdateTask(id: string, patch: Partial<TripTask>): void {
    patchActiveTrip((t) => ({
      ...t,
      tasks: (t.tasks ?? []).map((x) =>
        x.id === id
          ? {
              ...x,
              ...patch,
              completedAt:
                patch.done === true ? new Date().toISOString() : patch.done === false ? undefined : x.completedAt
            }
          : x
      )
    }));
  }
  function tripDeleteTask(id: string): void {
    patchActiveTrip((t) => ({ ...t, tasks: (t.tasks ?? []).filter((x) => x.id !== id) }));
  }

  /* ---------------- Trip schedule (start/end date) ---------------- */
  function tripSetSchedule(patch: Partial<Pick<Trip, "startDate" | "endDate">>): void {
    patchActiveTrip((t) => ({ ...t, ...patch }));
  }

  /* ---------------- Post-trip review ---------------- */
  function tripSetReview(libraryItemId: string, verdict: ItemUsageVerdict | undefined): void {
    patchActiveTrip((t) => {
      const next = { ...(t.postReview ?? {}) };
      if (verdict) next[libraryItemId] = verdict;
      else delete next[libraryItemId];
      return { ...t, postReview: next };
    });
    /* Mirror the verdict onto the LibraryItem usage history so we can flag "unused 3 trips in a row". */
    if (!trip) return;
    const tripId = trip.id;
    setLibrary((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.id !== libraryItemId) return it;
        const used = (it.usedTripIds ?? []).filter((x) => x !== tripId);
        const unused = (it.unusedTripIds ?? []).filter((x) => x !== tripId);
        if (verdict === "used") used.push(tripId);
        else if (verdict === "unused") unused.push(tripId);
        return { ...it, usedTripIds: used, unusedTripIds: unused };
      })
    }));
  }

  /* ---------------- Templates ---------------- */
  function tripSaveAsTemplate(sourceTripId: string, templateName: string): Trip {
    const source = trips.find((x) => x.id === sourceTripId);
    if (!source) throw new Error("trip not found");
    const now = new Date().toISOString();
    const tpl: Trip = {
      ...source,
      id: makeId("tpl"),
      name: templateName,
      templateName,
      isTemplate: true,
      /* Reset per-trip state — keep structure (vehicles, items, kits, tasks). */
      postReview: {},
      startDate: undefined,
      endDate: undefined,
      createdAt: now,
      updatedAt: now
    };
    setTrips((prev) => [...prev, tpl]);
    return tpl;
  }
  function tripCreateFromTemplate(templateId: string, name: string): Trip | null {
    const tpl = trips.find((x) => x.id === templateId && x.isTemplate);
    if (!tpl) return null;
    const now = new Date().toISOString();
    const fresh: Trip = {
      ...tpl,
      id: makeId("trip"),
      name,
      isTemplate: false,
      templateName: undefined,
      /* Reset task completion and any post-review when materializing from template. */
      tasks: (tpl.tasks ?? []).map((task) => ({ ...task, id: makeId("task"), done: false, completedAt: undefined, createdAt: now })),
      postReview: {},
      createdAt: now,
      updatedAt: now
    };
    setTrips((prev) => [...prev, fresh]);
    setActiveTripId(fresh.id);
    return fresh;
  }

  /* ---------------- Trip mutations ---------------- */
  function patchActiveTrip(patch: Partial<Trip> | ((t: Trip) => Trip)): void {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const next = typeof patch === "function" ? patch(t) : { ...t, ...patch };
        return { ...next, updatedAt: new Date().toISOString() };
      })
    );
  }

  function updateTripById(id: string, patch: Partial<Pick<Trip, "name" | "tripType" | "vehicleIds">>): void {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t))
    );
  }

  function tripUpdateItemRef(itemId: string, patch: Partial<TripItemRef>): void {
    patchActiveTrip((t) => {
      const existing = t.itemRefs[itemId];
      if (!existing) return t;
      return { ...t, itemRefs: { ...t.itemRefs, [itemId]: { ...existing, ...patch } } };
    });
  }

  function tripAddItem(libraryItemId: string, ref?: Partial<TripItemRef>): void {
    patchActiveTrip((t) => {
      if (t.itemRefs[libraryItemId]) return t;
      const lib = library.items.find((i) => i.id === libraryItemId);
      if (!lib) return t;
      return {
        ...t,
        itemRefs: {
          ...t.itemRefs,
          [libraryItemId]: {
            status: "missing",
            quantity: lib.defaultQuantity ?? 1,
            vehicleId: t.vehicleIds[0],
            ...ref
          }
        }
      };
    });
  }

  function tripRemoveItem(libraryItemId: string): void {
    patchActiveTrip((t) => {
      const { [libraryItemId]: _, ...rest } = t.itemRefs;
      return { ...t, itemRefs: rest };
    });
  }

  /** Add a library kit to the active trip: registers the kitRef AND adds every
   *  library item whose defaultKitId matches (skipping items already in the trip).
   *  Returns the count of items added. */
  function tripAddKit(libraryKitId: string): number {
    const lib = library.kits.find((k) => k.id === libraryKitId);
    if (!lib) return 0;
    const memberIds = library.items.filter((i) => i.defaultKitId === libraryKitId).map((i) => i.id);
    let added = 0;
    patchActiveTrip((t) => {
      const itemRefs = { ...t.itemRefs };
      for (const id of memberIds) {
        if (itemRefs[id]) continue;
        const libItem = library.items.find((i) => i.id === id);
        itemRefs[id] = {
          status: "missing",
          quantity: libItem?.defaultQuantity ?? 1,
          vehicleId: t.vehicleIds[0]
        };
        added++;
      }
      return {
        ...t,
        itemRefs,
        kitRefs: { ...t.kitRefs, [libraryKitId]: t.kitRefs[libraryKitId] ?? {} }
      };
    });
    return added;
  }

  /** Remove a kit (and its member items) from the active trip. */
  function tripRemoveKit(libraryKitId: string): void {
    const memberIds = library.items.filter((i) => i.defaultKitId === libraryKitId).map((i) => i.id);
    patchActiveTrip((t) => {
      const itemRefs = { ...t.itemRefs };
      for (const id of memberIds) delete itemRefs[id];
      const { [libraryKitId]: _omit, ...restKitRefs } = t.kitRefs;
      return { ...t, itemRefs, kitRefs: restKitRefs };
    });
  }

  function tripCycleStatus(libraryItemId: string): void {
    const ref = trip?.itemRefs[libraryItemId];
    if (!ref) return;
    const idx = STATUS_CYCLE.indexOf(ref.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    tripUpdateItemRef(libraryItemId, { status: next });
  }

  /* ---------------- Routed mutations from panels ---------------- */
  /** ItemPanel.onUpdate — splits patch into library-shared vs trip-ref fields. */
  function routeItemUpdate(itemId: string, patch: Partial<GearItem>): void {
    const libPatch: Partial<LibraryItem> = {};
    const refPatch: Partial<TripItemRef> = {};
    for (const key of Object.keys(patch) as Array<keyof GearItem>) {
      const value = patch[key];
      if (SHARED_LIB_FIELDS.has(key)) {
        (libPatch as Record<string, unknown>)[key] = value;
      } else if (key === "status") refPatch.status = value as GearStatus;
      else if (key === "quantity") refPatch.quantity = value as number;
      else if (key === "categoryId") refPatch.categoryId = value as string | undefined;
      else if (key === "kitId") refPatch.kitId = value as string | undefined;
      else if (key === "locationId") refPatch.locationId = value as string | undefined;
      else if (key === "notes") refPatch.packingNotes = value as string | undefined;
    }
    if (Object.keys(libPatch).length > 0) libUpdateItem(itemId, libPatch);
    if (Object.keys(refPatch).length > 0) tripUpdateItemRef(itemId, refPatch);
  }

  /** KitPanel.onUpdate — kits are mostly library-level, location/vehicle overrides per-trip. */
  function routeKitUpdate(kitId: string, patch: Partial<Kit>): void {
    const libPatch: Partial<LibraryKit> = {};
    if (patch.name !== undefined) libPatch.name = patch.name;
    if (patch.description !== undefined) libPatch.description = patch.description;
    if (patch.notes !== undefined) libPatch.notes = patch.notes;
    if (patch.photoUris !== undefined) libPatch.photoUris = patch.photoUris;
    if (patch.categoryId !== undefined) libPatch.defaultCategoryId = patch.categoryId;
    if (Object.keys(libPatch).length > 0) libUpdateKit(kitId, libPatch);
    if (patch.locationId !== undefined) {
      patchActiveTrip((t) => ({
        ...t,
        kitRefs: { ...t.kitRefs, [kitId]: { ...(t.kitRefs[kitId] ?? {}), locationId: patch.locationId } }
      }));
      // Cascade: also set every trip item in this kit to this location (per-trip override).
      patchActiveTrip((t) => {
        const itemRefs = { ...t.itemRefs };
        for (const [iid, ref] of Object.entries(itemRefs)) {
          if (ref.kitId === kitId || library.items.find((x) => x.id === iid)?.defaultKitId === kitId) {
            itemRefs[iid] = { ...ref, locationId: patch.locationId };
          }
        }
        return { ...t, itemRefs };
      });
    }
    if (patch.vehicleId !== undefined) {
      patchActiveTrip((t) => ({
        ...t,
        kitRefs: { ...t.kitRefs, [kitId]: { ...(t.kitRefs[kitId] ?? {}), vehicleId: patch.vehicleId } }
      }));
      // Cascade vehicle to items in this kit too.
      patchActiveTrip((t) => {
        const itemRefs = { ...t.itemRefs };
        for (const [iid, ref] of Object.entries(itemRefs)) {
          if (ref.kitId === kitId || library.items.find((x) => x.id === iid)?.defaultKitId === kitId) {
            itemRefs[iid] = { ...ref, vehicleId: patch.vehicleId };
          }
        }
        return { ...t, itemRefs };
      });
    }
  }

  /* ---------------- Photos ---------------- */
  async function addPhotoToItem(itemId: string, file: File): Promise<void> {
    if (file.size > MAX_PHOTO_BYTES) {
      setStatusText(`Photo too large (${Math.round(file.size / 1024)} KB).`);
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setLibrary((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.id === itemId ? { ...i, photoUris: [...(i.photoUris ?? []), dataUrl] } : i
      )
    }));
  }
  function removePhotoFromItem(itemId: string, idx: number): void {
    setLibrary((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.id === itemId
          ? { ...i, photoUris: (i.photoUris ?? []).filter((_, x) => x !== idx) }
          : i
      )
    }));
  }
  async function addPhotoToKit(kitId: string, file: File): Promise<void> {
    if (file.size > MAX_PHOTO_BYTES) {
      setStatusText(`Photo too large (${Math.round(file.size / 1024)} KB).`);
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setLibrary((prev) => ({
      ...prev,
      kits: prev.kits.map((k) =>
        k.id === kitId ? { ...k, photoUris: [...(k.photoUris ?? []), dataUrl] } : k
      )
    }));
  }
  function removePhotoFromKit(kitId: string, idx: number): void {
    setLibrary((prev) => ({
      ...prev,
      kits: prev.kits.map((k) =>
        k.id === kitId ? { ...k, photoUris: (k.photoUris ?? []).filter((_, x) => x !== idx) } : k
      )
    }));
  }

  /* ---------------- Trip CRUD ---------------- */
  function createTrip(input: { name: string; tripType: string; vehicleIds: string[] }): Trip | null {
    const clean = input.name.trim();
    if (!clean || input.vehicleIds.length === 0) return null;
    const now = new Date().toISOString();
    const created: Trip = {
      id: makeId(clean),
      name: clean,
      tripType: input.tripType.trim(),
      vehicleIds: input.vehicleIds,
      riderAssignments: {},
      itemRefs: {},
      kitRefs: {},
      createdAt: now,
      updatedAt: now
    };
    setTrips((prev) => [...prev, created]);
    setActiveTripId(created.id);
    setMode("trip");
    return created;
  }
  function deleteTrip(id: string): void {
    if (trips.length <= 1) {
      alert("You need at least one trip.");
      return;
    }
    setTrips((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) return prev;
      if (id === activeTripId) setActiveTripId(next[0].id);
      return next;
    });
  }
  function cloneTrip(id: string, newName: string): Trip | null {
    const src = trips.find((t) => t.id === id);
    if (!src) return null;
    const now = new Date().toISOString();
    const created: Trip = {
      ...src,
      id: makeId(newName),
      name: newName,
      riderAssignments: { ...(src.riderAssignments ?? {}) },
      itemRefs: { ...src.itemRefs },
      kitRefs: { ...src.kitRefs },
      createdAt: now,
      updatedAt: now
    };
    setTrips((prev) => [...prev, created]);
    return created;
  }

  /* ---------------- Add-item shortcuts (Quick add) ---------------- */
  function quickAddItem(name: string, extras?: Partial<LibraryItem>): GearItem | null {
    const lib = libAddItem(name, extras);
    if (!lib) return null;
    tripAddItem(lib.id, {
      categoryId: extras?.defaultCategoryId,
      kitId: extras?.defaultKitId,
      locationId: extras?.defaultLocationId
    });
    return {
      id: lib.id,
      name: lib.name,
      categoryId: lib.defaultCategoryId ?? "",
      kitId: lib.defaultKitId,
      locationId: lib.defaultLocationId,
      quantity: lib.defaultQuantity ?? 1,
      status: "missing",
      photoUris: lib.photoUris,
      itemUrl: lib.itemUrl,
      replacementUrl: lib.replacementUrl,
      reviewNotes: lib.reviewNotes
    };
  }

  /* ---------------- Exports ---------------- */
  function exportScope(filter?: (it: GearItem) => boolean, suffix = ""): void {
    if (!trip) return;
    const list = buildPackingList(trip, library, filter);
    const safeName = (trip.name || "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadTextFile(`${safeName}${suffix}-checklist.md`, exportPackingChecklist(list, vehicles), "text/markdown;charset=utf-8");
  }
  function exportTripCsv(): void {
    if (!currentPackingList) return;
    const safeName = (trip.name || "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadTextFile(`${safeName}-raw.csv`, exportPackingListToRawCsv(currentPackingList), "text/csv;charset=utf-8");
  }
  function exportTripJson(): void {
    if (!trip) return;
    const safeName = (trip.name || "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadTextFile(
      `${safeName}-state.json`,
      JSON.stringify({ schemaVersion: 3, trip, library, vehicles }, null, 2),
      "application/json;charset=utf-8"
    );
  }

  function exportTripShareBundleTxt(): void {
    if (!trip) return;

    const itemIds = new Set(Object.keys(trip.itemRefs));
    const kitIds = new Set(Object.keys(trip.kitRefs));
    const locationIds = new Set<string>();
    const categoryIds = new Set<string>();
    const vehicleIds = new Set(trip.vehicleIds);
    const personIds = new Set<string>();

    for (const [vehicleId, ids] of Object.entries(trip.riderAssignments ?? {})) {
      vehicleIds.add(vehicleId);
      for (const pid of ids) personIds.add(pid);
    }

    for (const task of trip.tasks ?? []) {
      if (task.itemId) itemIds.add(task.itemId);
      if (task.vehicleId) vehicleIds.add(task.vehicleId);
      if (task.personId) personIds.add(task.personId);
    }

    for (const ref of Object.values(trip.itemRefs)) {
      if (ref.kitId) kitIds.add(ref.kitId);
      if (ref.locationId) locationIds.add(ref.locationId);
      if (ref.categoryId) categoryIds.add(ref.categoryId);
      if (ref.vehicleId) vehicleIds.add(ref.vehicleId);
    }
    for (const ref of Object.values(trip.kitRefs)) {
      if (ref.locationId) locationIds.add(ref.locationId);
      if (ref.vehicleId) vehicleIds.add(ref.vehicleId);
    }

    const shareItems = library.items.filter((it) => itemIds.has(it.id));
    for (const it of shareItems) {
      if (it.defaultKitId) kitIds.add(it.defaultKitId);
      if (it.defaultLocationId) locationIds.add(it.defaultLocationId);
      if (it.defaultCategoryId) categoryIds.add(it.defaultCategoryId);
    }

    const shareKits = library.kits.filter((k) => kitIds.has(k.id));
    for (const k of shareKits) {
      if (k.defaultLocationId) locationIds.add(k.defaultLocationId);
      if (k.defaultCategoryId) categoryIds.add(k.defaultCategoryId);
    }

    const shareLocations = library.locations.filter((l) => locationIds.has(l.id));
    for (const l of shareLocations) vehicleIds.add(l.vehicleId);

    const shareCategories = library.categories.filter((c) => categoryIds.has(c.id));
    const shareVehicles = vehicles.filter((v) => vehicleIds.has(v.id));
    const sharePeople = library.people.filter((p) => personIds.has(p.id));

    const bundle: TripShareBundleV1 = {
      kind: "pack-attack-trip-share",
      version: 1,
      exportedAt: new Date().toISOString(),
      trip,
      library: {
        items: shareItems,
        kits: shareKits,
        categories: shareCategories,
        locations: shareLocations,
        people: sharePeople
      },
      vehicles: shareVehicles
    };

    const safeName = (trip.name || "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadTextFile(
      `${safeName}-share.txt`,
      JSON.stringify(bundle, null, 2),
      "text/plain;charset=utf-8"
    );
  }

  function importTripShareBundleFromText(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setStatusText("Import failed: file is not valid JSON.");
      return;
    }

    const maybeBundle = parsed as Partial<TripShareBundleV1> & {
      trip?: Trip;
      library?: LibraryData;
      vehicles?: Vehicle[];
    };

    const incomingTrip = maybeBundle.trip;
    const incomingLibrary = maybeBundle.library;
    const incomingVehicles = maybeBundle.vehicles;

    if (!incomingTrip || !incomingLibrary || !incomingVehicles) {
      setStatusText("Import failed: file does not contain a trip share bundle.");
      return;
    }

    const vehicleUsed = new Set(vehicles.map((v) => v.id));
    const personUsed = new Set(library.people.map((p) => p.id));
    const categoryUsed = new Set(library.categories.map((c) => c.id));
    const locationUsed = new Set(library.locations.map((l) => l.id));
    const kitUsed = new Set(library.kits.map((k) => k.id));
    const itemUsed = new Set(library.items.map((i) => i.id));
    const tripUsed = new Set(trips.map((t) => t.id));

    function remapId(oldId: string, used: Set<string>): string {
      if (!used.has(oldId)) {
        used.add(oldId);
        return oldId;
      }
      let n = 1;
      let next = `${oldId}-import-${n}`;
      while (used.has(next)) {
        n += 1;
        next = `${oldId}-import-${n}`;
      }
      used.add(next);
      return next;
    }

    const vehicleMap = new Map<string, string>();
    const personMap = new Map<string, string>();
    const categoryMap = new Map<string, string>();
    const locationMap = new Map<string, string>();
    const kitMap = new Map<string, string>();
    const itemMap = new Map<string, string>();

    const mergedVehicles = incomingVehicles.map((v) => {
      const id = remapId(v.id, vehicleUsed);
      vehicleMap.set(v.id, id);
      return { ...v, id };
    });

    const mergedPeople = incomingLibrary.people.map((p) => {
      const id = remapId(p.id, personUsed);
      personMap.set(p.id, id);
      return { ...p, id };
    });

    const mergedCategories = incomingLibrary.categories.map((c) => {
      const id = remapId(c.id, categoryUsed);
      categoryMap.set(c.id, id);
      return { ...c, id };
    });

    const mergedLocations = incomingLibrary.locations.map((l) => {
      const id = remapId(l.id, locationUsed);
      locationMap.set(l.id, id);
      return {
        ...l,
        id,
        vehicleId: vehicleMap.get(l.vehicleId) ?? l.vehicleId
      };
    });

    const mergedKits = incomingLibrary.kits.map((k) => {
      const id = remapId(k.id, kitUsed);
      kitMap.set(k.id, id);
      return {
        ...k,
        id,
        defaultCategoryId: k.defaultCategoryId ? categoryMap.get(k.defaultCategoryId) ?? k.defaultCategoryId : undefined,
        defaultLocationId: k.defaultLocationId ? locationMap.get(k.defaultLocationId) ?? k.defaultLocationId : undefined
      };
    });

    const mergedItems = incomingLibrary.items.map((it) => {
      const id = remapId(it.id, itemUsed);
      itemMap.set(it.id, id);
      return {
        ...it,
        id,
        defaultCategoryId: it.defaultCategoryId ? categoryMap.get(it.defaultCategoryId) ?? it.defaultCategoryId : undefined,
        defaultKitId: it.defaultKitId ? kitMap.get(it.defaultKitId) ?? it.defaultKitId : undefined,
        defaultLocationId: it.defaultLocationId ? locationMap.get(it.defaultLocationId) ?? it.defaultLocationId : undefined
      };
    });

    const nextTripId = remapId(incomingTrip.id, tripUsed);

    const nextItemRefs: Record<string, TripItemRef> = {};
    for (const [itemId, ref] of Object.entries(incomingTrip.itemRefs)) {
      const nextItemId = itemMap.get(itemId);
      if (!nextItemId) continue;
      nextItemRefs[nextItemId] = {
        ...ref,
        categoryId: ref.categoryId ? categoryMap.get(ref.categoryId) ?? ref.categoryId : undefined,
        kitId: ref.kitId ? kitMap.get(ref.kitId) ?? ref.kitId : undefined,
        locationId: ref.locationId ? locationMap.get(ref.locationId) ?? ref.locationId : undefined,
        vehicleId: ref.vehicleId ? vehicleMap.get(ref.vehicleId) ?? ref.vehicleId : undefined
      };
    }

    const nextKitRefs: Record<string, typeof incomingTrip.kitRefs[string]> = {};
    for (const [kitId, ref] of Object.entries(incomingTrip.kitRefs)) {
      const nextKitId = kitMap.get(kitId);
      if (!nextKitId) continue;
      nextKitRefs[nextKitId] = {
        ...ref,
        locationId: ref.locationId ? locationMap.get(ref.locationId) ?? ref.locationId : undefined,
        vehicleId: ref.vehicleId ? vehicleMap.get(ref.vehicleId) ?? ref.vehicleId : undefined
      };
    }

    const nextRiderAssignments: Record<string, string[]> = {};
    for (const [vehicleId, ids] of Object.entries(incomingTrip.riderAssignments ?? {})) {
      const nextVehicleId = vehicleMap.get(vehicleId) ?? vehicleId;
      const nextPeople = ids
        .map((id) => personMap.get(id) ?? id)
        .filter((id, idx, arr) => arr.indexOf(id) === idx);
      if (nextPeople.length > 0) nextRiderAssignments[nextVehicleId] = nextPeople;
    }

    const nextPostReview: Record<string, ItemUsageVerdict> = {};
    for (const [itemId, verdict] of Object.entries(incomingTrip.postReview ?? {})) {
      const nextItemId = itemMap.get(itemId);
      if (!nextItemId) continue;
      nextPostReview[nextItemId] = verdict;
    }

    const nextTasks = (incomingTrip.tasks ?? []).map((task) => ({
      ...task,
      id: makeId(task.title || "task"),
      personId: task.personId ? personMap.get(task.personId) ?? task.personId : undefined,
      vehicleId: task.vehicleId ? vehicleMap.get(task.vehicleId) ?? task.vehicleId : undefined,
      itemId: task.itemId ? itemMap.get(task.itemId) ?? task.itemId : undefined
    }));

    const nextVehicleIds = Array.from(new Set(
      incomingTrip.vehicleIds
        .map((id) => vehicleMap.get(id) ?? id)
        .filter(Boolean)
    ));

    const fallbackVehicleId = nextVehicleIds[0] ?? mergedVehicles[0]?.id ?? vehicles[0]?.id;

    const nextTrip: Trip = {
      ...incomingTrip,
      id: nextTripId,
      name: incomingTrip.name.trim() ? incomingTrip.name : "Imported Trip",
      vehicleIds: fallbackVehicleId ? (nextVehicleIds.length > 0 ? nextVehicleIds : [fallbackVehicleId]) : [],
      itemRefs: nextItemRefs,
      kitRefs: nextKitRefs,
      riderAssignments: nextRiderAssignments,
      postReview: nextPostReview,
      tasks: nextTasks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (nextTrip.vehicleIds.length === 0) {
      setStatusText("Import failed: no vehicles available to attach the imported trip.");
      return;
    }

    setVehicles((prev) => [...prev, ...mergedVehicles]);
    setLibrary((prev) => ({
      ...prev,
      people: [...prev.people, ...mergedPeople],
      categories: [...prev.categories, ...mergedCategories],
      locations: [...prev.locations, ...mergedLocations],
      kits: [...prev.kits, ...mergedKits],
      items: [...prev.items, ...mergedItems]
    }));
    setTrips((prev) => [...prev, nextTrip]);
    setActiveTripId(nextTrip.id);
    setMode("overview");
    setSelection({ kind: "home" });
    setStatusText(`Imported "${nextTrip.name}" (${Object.keys(nextTrip.itemRefs).length} items).`);
  }

  function importTripShareBundleDialog(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.json,text/plain,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        importTripShareBundleFromText(text);
      } catch {
        setStatusText("Import failed: could not read file.");
      }
    };
    input.click();
  }

  function exportTripSummaryFile(): void {
    if (!trip || !currentPackingList) return;
    const safeName = (trip.name || "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadTextFile(
      `${safeName}-summary.md`,
      exportTripSummary(trip, currentPackingList, vehicles, library.people),
      "text/markdown;charset=utf-8"
    );
  }

  if (!trip) {
    return (
      <div className="empty-state-full">
        <p>No trips found. Resetting…</p>
        <button
          type="button"
          onClick={() => {
            const fresh = makeFreshState();
            setVehicles(fresh.vehicles);
            setLibrary(fresh.library);
            setTrips(fresh.trips);
            setActiveTripId(fresh.activeTripId);
          }}
        >
          Create starter data
        </button>
      </div>
    );
  }

  const selectedItem = selection.kind === "item" ? items.find((i) => i.id === selection.id) : undefined;
  const selectedKit = selection.kind === "kit" ? kits.find((k) => k.id === selection.id) : undefined;
  const selectedLocation: StorageLocation | undefined = selection.kind === "location"
    ? selection.id === UNASSIGNED
      ? { id: UNASSIGNED, name: "Unassigned location", kind: "other", vehicleId: trip.vehicleIds[0] ?? "" }
      : locations.find((l) => l.id === selection.id)
    : undefined;
  const tripVehicles = vehicles.filter((v) => trip.vehicleIds.includes(v.id));
  const totalCount = items.length;
  const packedCount = items.filter((i) => i.status === "packed").length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="brand">
          <h1>Pack Attack</h1>
        </header>

        <div className="sidebar-priority-actions">
          <button
            type="button"
            className={mode === "overview" ? "priority-nav-btn active" : "priority-nav-btn"}
            onClick={() => setMode("overview")}
            title="Trip overview — home"
          >
            Trip Overview
          </button>
          <button
            type="button"
            className={mode === "mobile-pack" ? "priority-nav-btn active" : "priority-nav-btn"}
            onClick={() => {
              setSelection({ kind: "home" });
              setMode("mobile-pack");
            }}
            title="One-handed checklist and tasks for phone use"
          >
            Quick Pack
          </button>
        </div>

        <nav className="mode-tabs" aria-label="Workspace">
          <button
            type="button"
            className={mode === "trip" ? "tab active" : "tab"}
            onClick={() => setMode("trip")}
            title="Pack the currently active trip"
          >
            Packing
          </button>
          <button
            type="button"
            className={mode === "trips" ? "tab active" : "tab"}
            onClick={() => setMode("trips")}
            title="Create, clone, or switch trips"
          >
            Trips
          </button>
          <button
            type="button"
            className={mode === "library" ? "tab active" : "tab"}
            onClick={() => setMode("library")}
            title="Shared gear catalog across all trips"
          >
            Gear Library
          </button>
          <button
            type="button"
            className={mode === "vehicles" ? "tab active" : "tab"}
            onClick={() => setMode("vehicles")}
            title="Manage vehicles"
          >
            Vehicles
          </button>
          <button
            type="button"
            className={mode === "people" ? "tab active" : "tab"}
            onClick={() => setMode("people")}
            title="People — drivers, passengers, crew"
          >
            People
          </button>
          <button
            type="button"
            className={mode === "shopping" ? "tab active" : "tab"}
            onClick={() => setMode("shopping")}
            title="Shopping list — missing items across upcoming trips"
          >
            Shopping
          </button>
          <button
            type="button"
            className={mode === "tasks" ? "tab active" : "tab"}
            onClick={() => setMode("tasks")}
            title="Task list across trips"
          >
            Tasks
          </button>
        </nav>

        <div className="sidebar-summary-actions">
          <button type="button" className="ghost" onClick={() => setSummaryPrintOpen(true)}>
            Print Trip Summary
          </button>
        </div>

        {mode === "trip" && (
          <>
            <div className="progress-card">
              <div className="progress-text">
                {packedCount}/{totalCount} packed
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: totalCount === 0 ? "0%" : `${Math.round((packedCount / totalCount) * 100)}%` }}
                />
              </div>
            </div>

            <div className="view-tabs" role="tablist" aria-label="Group items by">
              {(["location", "kit", "category", "all"] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={viewMode === m ? "tab active" : "tab"}
                  onClick={() => setViewMode(m)}
                >
                  {m === "all" ? "All" : m[0].toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            <input
              className="search"
              type="search"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="tree-scroll">
              {viewMode === "location" && (
                <LocationTree
                  locations={locations}
                  itemsByLocation={itemsByLocation}
                  expanded={expanded}
                  selection={selection}
                  search={search.trim().toLowerCase()}
                  tripVehicles={tripVehicles}
                  onSelect={setSelection}
                  onToggle={toggleExpand}
                />
              )}
              {viewMode === "kit" && (
                <KitTree
                  kits={kits}
                  categories={categories}
                  itemsByKit={itemsByKit}
                  expanded={expanded}
                  selection={selection}
                  search={search.trim().toLowerCase()}
                  onSelect={setSelection}
                  onToggle={toggleExpand}
                  importableKits={library.kits
                    .filter((k) => !kits.some((existing) => existing.id === k.id))
                    .map((k) => ({ id: k.id, name: k.name }))}
                  onImportKit={(id) => {
                    const n = tripAddKit(id);
                    setStatusText(n > 0
                      ? `Imported kit + ${n} item${n === 1 ? "" : "s"}.`
                      : "Kit imported (no new items).");
                  }}
                />
              )}
              {viewMode === "category" && (
                <CategoryTree
                  categories={categories}
                  itemsByCategory={itemsByCategory}
                  expanded={expanded}
                  selection={selection}
                  search={search.trim().toLowerCase()}
                  onSelect={setSelection}
                  onToggle={toggleExpand}
                />
              )}
              {viewMode === "all" && (
                <AllItemsList
                  items={filteredItems}
                  selection={selection}
                  statusFilter={statusFilter}
                  onStatusFilter={setStatusFilter}
                  onSelect={(id) => setSelection({ kind: "item", id })}
                />
              )}
            </div>

            <footer className="sidebar-footer">
              <button type="button" className="primary" onClick={() => setPickerOpen(true)}>
                + From library
              </button>
              {statusText && (
                <p className="status-text" onClick={() => setStatusText(null)} title="Click to dismiss">
                  {statusText}
                </p>
              )}
            </footer>
          </>
        )}
      </aside>

      <main className="main">
        {mode === "library" && (
          <LibraryPanel
            library={library}
            vehicles={vehicles}
            onAddCategory={libAddCategory}
            onRenameCategory={libRenameCategory}
            onDeleteCategory={libDeleteCategory}
            onAddItem={(n) => libAddItem(n)}
            onUpdateItem={libUpdateItem}
            onDeleteItem={(id) => {
              if (confirm("Delete this library asset (and remove from every trip)?")) libDeleteItem(id);
            }}
            onAddItemPhoto={(id, file) => void addPhotoToItem(id, file)}
            onRemoveItemPhoto={removePhotoFromItem}
            onAddKit={(n) => libAddKit(n)}
            onUpdateKit={libUpdateKit}
            onDeleteKit={(id) => {
              if (confirm("Delete this kit?")) libDeleteKit(id);
            }}
            onViewPhoto={setLightboxSrc}
            onPhotoReject={setStatusText}
            onAddToActiveTrip={(id) => {
              tripAddItem(id);
              setStatusText("Added to active trip.");
            }}
            onRemoveFromActiveTrip={(id) => {
              tripRemoveItem(id);
              setStatusText("Removed from active trip.");
            }}
            onAddKitToActiveTrip={(id) => {
              const n = tripAddKit(id);
              setStatusText(n > 0
                ? `Added kit + ${n} item${n === 1 ? "" : "s"} to active trip.`
                : "Kit added to trip (no new items).");
              return n;
            }}
            onRemoveKitFromActiveTrip={(id) => {
              tripRemoveKit(id);
              setStatusText("Removed kit from active trip.");
            }}
            activeTripItemIds={new Set(Object.keys(trip.itemRefs))}
            activeTripKitIds={new Set(Object.keys(trip.kitRefs))}
          />
        )}

        {mode === "trips" && (
          <TripsPanel
            trips={trips}
            activeTripId={trip.id}
            vehicles={vehicles}
            onCreate={createTrip}
            onUpdate={updateTripById}
            onDelete={deleteTrip}
            onClone={cloneTrip}
            onSetActive={(id) => {
              setActiveTripId(id);
              setMode("trip");
            }}
            onSaveAsTemplate={tripSaveAsTemplate}
            onCreateFromTemplate={tripCreateFromTemplate}
            onShareActiveTrip={exportTripShareBundleTxt}
            onImportSharedTrip={importTripShareBundleDialog}
          />
        )}

        {mode === "overview" && (
          <HomePanel
            trip={trip}
            kits={kits}
            locations={locations}
            items={items}
            vehicles={vehicles}
            people={library.people}
            onSelect={(s) => { setSelection(s); if (s.kind === "location" || s.kind === "kit" || s.kind === "item") setMode("trip"); }}
            onSwitchView={(m) => { setViewMode(m); setMode("trip"); }}
            onOpenTrips={() => setMode("trips")}
            onSetReview={tripSetReview}
          />
        )}

        {mode === "mobile-pack" && (
          <MobilePackPanel
            trip={trip}
            items={items}
            onSelectItem={(id) => {
              setSelection({ kind: "item", id });
              setMode("trip");
            }}
            onCycleStatus={tripCycleStatus}
            onSetGroupStatus={(itemIds, status) => {
              patchActiveTrip((t) => {
                const itemRefs = { ...t.itemRefs };
                for (const id of itemIds) {
                  if (itemRefs[id]) itemRefs[id] = { ...itemRefs[id], status };
                }
                return { ...t, itemRefs };
              });
            }}
            statusFilter={mobileStatusFilter}
            onStatusFilter={setMobileStatusFilter}
            kitLookup={(id?: string): string | undefined =>
              id ? kits.find((k) => k.id === id)?.name : undefined
            }
            locationLookup={(id?: string): string | undefined =>
              id ? locations.find((l) => l.id === id)?.name : undefined
            }
            categoryLookup={(id: string): string | undefined =>
              categories.find((c) => c.id === id)?.name
            }
          />
        )}

        {mode === "trip" && selection.kind === "home" && (() => {
          const stagedCount = items.filter((i) => i.status === "staged").length;
          const missingCount = items.filter((i) => i.status === "missing").length;
          const remaining = items
            .filter((i) => i.status !== "packed")
            .sort((a, b) => {
              const order: Record<string, number> = { missing: 0, staged: 1, packed: 2 };
              const oa = order[a.status] ?? 99;
              const ob = order[b.status] ?? 99;
              if (oa !== ob) return oa - ob;
              return a.name.localeCompare(b.name);
            });
          const locProgress = locations
            .map((loc) => {
              const ls = itemsByLocation.get(loc.id) ?? [];
              const packed = ls.filter((i) => i.status === "packed").length;
              return { loc, total: ls.length, packed };
            })
            .filter((x) => x.total > 0)
            .sort((a, b) => a.packed / Math.max(a.total, 1) - b.packed / Math.max(b.total, 1));
          const kitLookup = (id?: string): string | undefined =>
            id ? kits.find((k) => k.id === id)?.name : undefined;
          const locationLookup = (id?: string): string | undefined =>
            id ? locations.find((l) => l.id === id)?.name : undefined;
          const categoryLookup = (id: string): string | undefined =>
            categories.find((c) => c.id === id)?.name;
          const pct = totalCount === 0 ? 0 : Math.round((packedCount / totalCount) * 100);
          return (
            <div className="panel">
              <header className="panel-header">
                <div>
                  <h2>Packing — {trip.name}</h2>
                  <p className="panel-sub">
                    {totalCount === 0
                      ? "No items on this trip yet. Use the picker in Trip Overview to add gear from your library."
                      : `${packedCount} packed · ${stagedCount} staged · ${missingCount} missing · ${pct}% complete`}
                  </p>
                </div>
                <div className="header-actions">
                  <button type="button" className="ghost" onClick={() => setPrintOpen(true)}>
                    Print Checklist
                  </button>
                </div>
              </header>

              {totalCount > 0 && (
                <div className="progress-card">
                  <div className="progress-text">{packedCount}/{totalCount} packed</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              {locProgress.length > 0 && (
                <section className="panel-section">
                  <h3>By location</h3>
                  <div className="loc-progress-grid">
                    {locProgress.map(({ loc, total, packed }) => {
                      const p = Math.round((packed / total) * 100);
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          className="loc-progress-card"
                          onClick={() => setSelection({ kind: "location", id: loc.id })}
                        >
                          <div className="loc-progress-head">
                            <strong>{loc.name}</strong>
                            <span className="muted">{packed}/{total}</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${p}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {remaining.length > 0 && (
                <section className="panel-section">
                  <h3>Still to pack ({remaining.length})</h3>
                  <ItemChecklist
                    items={remaining}
                    onSelectItem={(id) => setSelection({ kind: "item", id })}
                    onCycleStatus={tripCycleStatus}
                    kitLookup={kitLookup}
                    locationLookup={locationLookup}
                    categoryLookup={categoryLookup}
                  />
                </section>
              )}

              {totalCount > 0 && remaining.length === 0 && (
                <div className="empty-state-full muted">
                  Everything is packed. Nice.
                </div>
              )}
            </div>
          );
        })()}

        {mode === "trip" && selectedLocation && (
          <LocationPanel
            location={selectedLocation}
            items={itemsByLocation.get(selectedLocation.id) ?? []}
            kits={kits}
            categories={categories}
            onSelectItem={(id) => setSelection({ kind: "item", id })}
            onCycleStatus={tripCycleStatus}
            onSetGroupStatus={(itemIds, status) => {
              patchActiveTrip((t) => {
                const itemRefs = { ...t.itemRefs };
                for (const id of itemIds) {
                  if (itemRefs[id]) itemRefs[id] = { ...itemRefs[id], status };
                }
                return { ...t, itemRefs };
              });
            }}
            onExportScope={() =>
              exportScope((it) => locationBucketKey(it) === selectedLocation.id, `-${selectedLocation.name}`)
            }
          />
        )}

        {mode === "trip" && selectedKit && (
          <KitPanel
            kit={selectedKit}
            items={itemsByKit.get(selectedKit.id) ?? []}
            categories={categories}
            locations={locations}
            tripVehicles={tripVehicles}
            onUpdate={(patch) => routeKitUpdate(selectedKit.id, patch)}
            onSelectItem={(id) => setSelection({ kind: "item", id })}
            onCycleStatus={tripCycleStatus}
            onSetAllStatus={(status) => {
              const kitItemIds = (itemsByKit.get(selectedKit.id) ?? []).map((i) => i.id);
              patchActiveTrip((t) => {
                const itemRefs = { ...t.itemRefs };
                for (const id of kitItemIds) {
                  if (itemRefs[id]) itemRefs[id] = { ...itemRefs[id], status };
                }
                return { ...t, itemRefs };
              });
            }}
            onExportScope={() =>
              exportScope((it) => it.kitId === selectedKit.id, `-${selectedKit.name}`)
            }
          />
        )}

        {mode === "trip" && selectedItem && (
          <ItemPanel
            item={selectedItem}
            categories={categories}
            locations={locations}
            kits={kits}
            onUpdate={(patch) => routeItemUpdate(selectedItem.id, patch)}
            onRemoveFromTrip={() => {
              tripRemoveItem(selectedItem.id);
              setSelection({ kind: "home" });
            }}
            onDeleteFromLibrary={() => {
              if (confirm("Delete this library asset and remove from every trip?")) {
                libDeleteItem(selectedItem.id);
                setSelection({ kind: "home" });
              }
            }}
            onAddPhoto={(file) => void addPhotoToItem(selectedItem.id, file)}
            onRemovePhoto={(idx) => removePhotoFromItem(selectedItem.id, idx)}
            onViewPhoto={setLightboxSrc}
            onPhotoReject={setStatusText}
            tripVehicles={tripVehicles}
            carriedByVehicleId={trip.itemRefs[selectedItem.id]?.vehicleId}
            onSetCarriedBy={(vid) => tripUpdateItemRef(selectedItem.id, { vehicleId: vid })}
          />
        )}

        {mode === "vehicles" && (
          <div className="panel">
            <header className="panel-header">
              <div>
                <h2>Vehicles</h2>
                <p className="panel-sub">
                  Define each vehicle once. Storage locations and service info travel with the vehicle and show up on every trip.
                </p>
              </div>
            </header>
            <VehiclesCard
              vehicles={vehicles}
              activeVehicleId=""
              onSelect={() => {}}
              onAdd={addVehicle}
              onUpdate={updateVehicle}
              onDelete={deleteVehicle}
              locations={library.locations}
              onAddLocation={(name, kind, vehicleId) => libAddLocation(name, kind, vehicleId)}
              onUpdateLocation={libUpdateLocation}
              onDeleteLocation={libDeleteLocation}
            />
          </div>
        )}

        {mode === "people" && (
          <PeoplePanel
            people={library.people}
            onAdd={libAddPerson}
            onUpdate={libUpdatePerson}
            onDelete={libDeletePerson}
          />
        )}

        {mode === "shopping" && (
          <ShoppingPanel
            trips={trips}
            libraryItems={library.items}
            activeTripId={activeTripId}
            onCollectItem={(libraryItemId, tripIds, scope) => {
              setTrips((prev) =>
                prev.map((t) => {
                  if (t.isTemplate) return t;
                  if (scope === "active" && t.id !== activeTripId) return t;
                  if (scope === "shown" && !tripIds.includes(t.id)) return t;
                  const ref = t.itemRefs[libraryItemId];
                  if (!ref || ref.status !== "missing") return t;
                  return {
                    ...t,
                    itemRefs: {
                      ...t.itemRefs,
                      [libraryItemId]: { ...ref, status: "staged" },
                    },
                    updatedAt: new Date().toISOString(),
                  };
                })
              );
            }}
          />
        )}

        {mode === "tasks" && (
          <TasksPanel
            trips={trips}
            activeTripId={activeTripId}
            onAddTask={(tripId, input) => {
              const task: TripTask = {
                ...input,
                id: makeId("task"),
                done: false,
                createdAt: new Date().toISOString()
              };
              setTrips((prev) =>
                prev.map((t) => {
                  if (t.id !== tripId) return t;
                  return {
                    ...t,
                    tasks: [...(t.tasks ?? []), task],
                    updatedAt: new Date().toISOString(),
                  };
                })
              );
            }}
            onToggleTask={(tripId, taskId, done) => {
              setTrips((prev) =>
                prev.map((t) => {
                  if (t.id !== tripId) return t;
                  return {
                    ...t,
                    tasks: (t.tasks ?? []).map((task) =>
                      task.id === taskId
                        ? {
                            ...task,
                            done,
                            completedAt: done ? new Date().toISOString() : undefined
                          }
                        : task
                    ),
                    updatedAt: new Date().toISOString(),
                  };
                })
              );
            }}
            onUpdateTask={(tripId, taskId, patch) => {
              setTrips((prev) =>
                prev.map((t) => {
                  if (t.id !== tripId) return t;
                  return {
                    ...t,
                    tasks: (t.tasks ?? []).map((task) =>
                      task.id === taskId
                        ? {
                            ...task,
                            ...patch,
                            completedAt:
                              patch.done === true
                                ? new Date().toISOString()
                                : patch.done === false
                                  ? undefined
                                  : task.completedAt
                          }
                        : task
                    ),
                    updatedAt: new Date().toISOString(),
                  };
                })
              );
            }}
            onDeleteTask={(tripId, taskId) => {
              setTrips((prev) =>
                prev.map((t) => {
                  if (t.id !== tripId) return t;
                  return {
                    ...t,
                    tasks: (t.tasks ?? []).filter((task) => task.id !== taskId),
                    updatedAt: new Date().toISOString(),
                  };
                })
              );
            }}
          />
        )}
      </main>

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      {printOpen && currentPackingList && (
        <PrintOverlay
          list={currentPackingList}
          kits={kits}
          locations={locations}
          categories={categories}
          items={items}
          vehicles={vehicles}
          onClose={() => setPrintOpen(false)}
        />
      )}
      {summaryPrintOpen && trip && (
        <TripSummaryPrint
          trip={trip}
          vehicles={vehicles}
          people={library.people}
          totalItems={items.length}
          packedItems={items.filter((i) => i.status === "packed").length}
          missingItems={items.filter((i) => i.status === "missing").length}
          totalGrams={items.reduce((sum, it) => sum + (it.weightGrams ?? 0) * (it.quantity ?? 1), 0)}
          onClose={() => setSummaryPrintOpen(false)}
        />
      )}
      {pickerOpen && (
        <LibraryPicker
          items={library.items}
          excludeIds={new Set(Object.keys(trip.itemRefs))}
          onPick={(ids) => {
            for (const id of ids) tripAddItem(id);
            setStatusText(`Added ${ids.length} item${ids.length === 1 ? "" : "s"} to trip.`);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/* Suppress unused-import warning for STATUS_FILTERS — re-exported indirectly via AllItemsList. */
void STATUS_FILTERS;
