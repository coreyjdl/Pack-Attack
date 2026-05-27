import type { PackingList, Person, Trip, Vehicle } from "./index";

const G_PER_OZ = 28.3495;
const ML_PER_FL_OZ = 29.5735;
const KM_PER_MI = 1.60934;
const M_PER_FT = 0.3048;

function gramsToOzStr(g?: number): string {
  return g === undefined ? "" : (g / G_PER_OZ).toFixed(2);
}
function mlToFlOzStr(ml?: number): string {
  return ml === undefined ? "" : (ml / ML_PER_FL_OZ).toFixed(2);
}

function csvEscape(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

export function exportPackingListToRawCsv(list: PackingList): string {
  const headers = [
    "list_id",
    "list_name",
    "trip_type",
    "item_id",
    "item_name",
    "category_id",
    "kit_id",
    "location_id",
    "quantity",
    "status",
    "weight_oz",
    "volume_fl_oz",
    "item_url",
    "replacement_url",
    "notes",
    "review_notes",
    "updated_at"
  ];

  const lines = list.items.map((item) => {
    const row = [
      list.id,
      list.name,
      list.tripType,
      item.id,
      item.name,
      item.categoryId,
      item.kitId ?? "",
      item.locationId ?? "",
      String(item.quantity),
      item.status,
      item.weightGrams ? gramsToOzStr(item.weightGrams) : "",
      item.volumeMl ? mlToFlOzStr(item.volumeMl) : "",
      item.itemUrl ?? "",
      item.replacementUrl ?? "",
      item.notes ?? "",
      item.reviewNotes ?? "",
      list.updatedAt
    ];

    return row.map(csvEscape).join(",");
  });

  return [headers.join(","), ...lines].join("\n");
}

export function exportPackingChecklist(list: PackingList, vehicles: Vehicle[] = []): string {
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  // Group items by vehicle id (or "__none__"), then by category id.
  const byVehicle = new Map<string, Map<string, string[]>>();
  const ensureVeh = (vid: string): Map<string, string[]> => {
    let m = byVehicle.get(vid);
    if (!m) {
      m = new Map();
      for (const c of list.categories) m.set(c.id, []);
      byVehicle.set(vid, m);
    }
    return m;
  };

  for (const item of list.items) {
    const vid = item.vehicleId && vehicleById.has(item.vehicleId) ? item.vehicleId : "__none__";
    const byCat = ensureVeh(vid);
    const line = `- [ ] ${item.name} (qty ${item.quantity})`;
    const arr = byCat.get(item.categoryId) ?? [];
    arr.push(line);
    byCat.set(item.categoryId, arr);
  }

  const vehicleOrder: string[] = [];
  for (const v of vehicles) if (byVehicle.has(v.id)) vehicleOrder.push(v.id);
  if (byVehicle.has("__none__")) vehicleOrder.push("__none__");

  const sections = vehicleOrder.map((vid) => {
    const heading = vid === "__none__" ? "Unassigned" : (vehicleById.get(vid)?.name ?? vid);
    const byCat = byVehicle.get(vid)!;
    const blocks = list.categories
      .map((category) => {
        const lines = byCat.get(category.id) ?? [];
        if (lines.length === 0) return null;
        return `### ${category.name}\n${lines.join("\n")}`;
      })
      .filter((b): b is string => b !== null);
    if (blocks.length === 0) return null;
    return [`## ${heading}`, ...blocks].join("\n\n");
  }).filter((s): s is string => s !== null);

  return [`# ${list.name} Checklist`, `Trip type: ${list.tripType}`, "", ...sections].join("\n\n");
}

/** Human-readable trip brief: details, route, vehicles + assigned riders, packing stats. */
export function exportTripSummary(
  trip: Trip,
  list: PackingList,
  vehicles: Vehicle[],
  people: Person[]
): string {
  const personById = new Map(people.map((p) => [p.id, p]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const lines: string[] = [];

  lines.push(`# ${trip.name}`);
  const meta: string[] = [`Type: ${trip.tripType}`];
  if (trip.startDate || trip.endDate) {
    meta.push(`Dates: ${trip.startDate ?? "?"} → ${trip.endDate ?? "?"}`);
  }
  lines.push(meta.join(" · "));

  if (trip.description) lines.push("", trip.description);

  /* ---- Itinerary ---- */
  const itinerary: string[] = [];
  if (trip.origin) itinerary.push(`- **Origin:** ${trip.origin}`);
  if (trip.destination) itinerary.push(`- **Destination:** ${trip.destination}`);
  if (trip.route) {
    const r = trip.route;
    if (r.name) itinerary.push(`- **Route:** ${r.name}`);
    const stats: string[] = [];
    const distKm = r.distanceKm ?? r.gpx?.distanceKm;
    const elevM = r.elevationGainM ?? r.gpx?.elevationGainM;
    if (distKm) stats.push(`${(distKm / KM_PER_MI).toFixed(1)} mi`);
    if (elevM) stats.push(`+${Math.round(elevM / M_PER_FT).toLocaleString()} ft`);
    if (r.difficulty) stats.push(r.difficulty);
    if (r.terrain) stats.push(r.terrain);
    if (stats.length > 0) itinerary.push(`- **Route stats:** ${stats.join(" · ")}`);
    if (r.notes) itinerary.push(`- **Route notes:** ${r.notes}`);
    if (r.gpx) itinerary.push(`- **GPX:** ${r.gpx.filename} (${r.gpx.pointCount ?? "?"} pts)`);
  }
  if (itinerary.length > 0) lines.push("", "## Itinerary", ...itinerary);

  /* ---- Logistics ---- */
  const logistics: string[] = [];
  if (trip.lodging) logistics.push(`- **Lodging:** ${trip.lodging}`);
  if (trip.permits) logistics.push(`- **Permits:** ${trip.permits}`);
  if (trip.budget) logistics.push(`- **Budget:** ${trip.budget}`);
  if (trip.weatherNotes) logistics.push(`- **Weather:** ${trip.weatherNotes}`);
  if (logistics.length > 0) lines.push("", "## Logistics", ...logistics);

  /* ---- Safety ---- */
  const safety: string[] = [];
  if (trip.emergencyContact || trip.emergencyPhone) {
    safety.push(`- **Emergency contact:** ${[trip.emergencyContact, trip.emergencyPhone].filter(Boolean).join(" — ")}`);
  }
  if (safety.length > 0) lines.push("", "## Safety", ...safety);

  /* ---- Vehicles + riders ---- */
  const tripVehicles = trip.vehicleIds.map((id) => vehicleById.get(id)).filter((v): v is Vehicle => !!v);
  if (tripVehicles.length > 0) {
    lines.push("", "## Vehicles & riders");
    for (const v of tripVehicles) {
      const desc = [v.year, v.make, v.model].filter(Boolean).join(" ");
      lines.push(`### ${v.name}${desc ? ` — ${desc}` : ""}`);
      const riderIds = trip.riderAssignments?.[v.id] ?? [];
      const riders = riderIds.map((id) => personById.get(id)).filter((p): p is Person => !!p);
      if (riders.length === 0) {
        lines.push("- (no riders assigned)");
      } else {
        for (const p of riders) {
          const tags: string[] = [];
          if (p.role) tags.push(p.role);
          if (p.phone) tags.push(p.phone);
          lines.push(`- **${p.name}**${tags.length > 0 ? ` — ${tags.join(" · ")}` : ""}`);
        }
      }
    }
  }

  /* ---- Links ---- */
  if (trip.links && trip.links.length > 0) {
    lines.push("", "## Links");
    for (const link of trip.links) {
      lines.push(`- [${link.label || link.url}](${link.url})`);
    }
  }

  /* ---- Packing stats ---- */
  const total = list.items.length;
  const packed = list.items.filter((i) => i.status === "packed").length;
  const missing = list.items.filter((i) => i.status === "missing").length;
  lines.push("", "## Packing");
  lines.push(`- Total items: ${total}`);
  lines.push(`- Packed: ${packed}`);
  if (missing > 0) lines.push(`- Missing: ${missing}`);

  return lines.join("\n");
}

