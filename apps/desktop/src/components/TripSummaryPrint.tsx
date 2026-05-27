import { useEffect } from "react";
import type { Person, Trip, Vehicle } from "@pack-attack/shared";
import { fmtFt, fmtMi, gramsToLb } from "../units";

interface Props {
  trip: Trip;
  vehicles: Vehicle[];
  people: Person[];
  totalItems: number;
  packedItems: number;
  missingItems: number;
  totalGrams: number;
  onClose: () => void;
}

/** Aesthetic printable trip summary — cover sheet, itinerary, vehicles, riders, logistics. */
export function TripSummaryPrint({
  trip,
  vehicles,
  people,
  totalItems,
  packedItems,
  missingItems,
  totalGrams,
  onClose
}: Props): JSX.Element {
  useEffect(() => {
    document.body.classList.add("printing");
    const onKey = (e: KeyboardEvent): void => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("printing");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const personById = new Map(people.map((p) => [p.id, p]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const tripVehicles = trip.vehicleIds.map((id) => vehicleById.get(id)).filter((v): v is Vehicle => !!v);

  const route = trip.route;
  const distKm = route?.distanceKm ?? route?.gpx?.distanceKm;
  const elevM = route?.elevationGainM ?? route?.gpx?.elevationGainM;

  const dateRange = (() => {
    if (trip.startDate && trip.endDate) return `${formatDate(trip.startDate)} → ${formatDate(trip.endDate)}`;
    if (trip.startDate) return formatDate(trip.startDate);
    if (trip.endDate) return formatDate(trip.endDate);
    return null;
  })();

  return (
    <div className="print-overlay trip-print" role="dialog" aria-label="Print trip summary">
      <div className="print-toolbar no-print">
        <strong>Trip summary preview</strong>
        <span className="muted">Press Esc to close</span>
        <span className="spacer" />
        <button type="button" onClick={() => window.print()}>Print</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>

      <div className="print-page trip-summary">
        <header className="ts-cover">
          <div className="ts-eyebrow">{trip.tripType || "Trip"}</div>
          <h1 className="ts-title">{trip.name}</h1>
          {dateRange && <div className="ts-dates">{dateRange}</div>}
          {(trip.origin || trip.destination) && (
            <div className="ts-route">
              {trip.origin && <span>{trip.origin}</span>}
              {trip.origin && trip.destination && <span className="ts-arrow"> ⇢ </span>}
              {trip.destination && <span>{trip.destination}</span>}
            </div>
          )}
          {trip.description && <p className="ts-desc">{trip.description}</p>}
        </header>

        <div className="ts-stats">
          <Stat label="Vehicles" value={String(tripVehicles.length)} />
          <Stat label="Riders" value={String(countRiders(trip))} />
          <Stat label="Items" value={`${packedItems}/${totalItems}`} sub="packed" />
          {missingItems > 0 && <Stat label="Missing" value={String(missingItems)} />}
          {totalGrams > 0 && <Stat label="Weight" value={`${gramsToLb(totalGrams).toFixed(1)} lb`} />}
          {distKm !== undefined && <Stat label="Distance" value={`${fmtMi(distKm) ?? "?"} mi`} />}
          {elevM !== undefined && <Stat label="Elev gain" value={`${fmtFt(elevM) ?? "?"} ft`} />}
        </div>

        {(route?.name || route?.notes || route?.difficulty || route?.terrain || route?.gpx) && (
          <Section title="Route">
            {route.name && <div className="ts-row"><dt>Name</dt><dd>{route.name}</dd></div>}
            {route.difficulty && <div className="ts-row"><dt>Difficulty</dt><dd>{route.difficulty}</dd></div>}
            {route.terrain && <div className="ts-row"><dt>Terrain</dt><dd>{route.terrain}</dd></div>}
            {route.gpx && (
              <div className="ts-row">
                <dt>GPX</dt>
                <dd>{route.gpx.filename}{route.gpx.pointCount ? ` (${route.gpx.pointCount} pts)` : ""}</dd>
              </div>
            )}
            {route.notes && <p className="ts-notes">{route.notes}</p>}
          </Section>
        )}

        {(trip.lodging || trip.permits || trip.budget || trip.weatherNotes) && (
          <Section title="Logistics">
            {trip.lodging && <div className="ts-row"><dt>Lodging</dt><dd>{trip.lodging}</dd></div>}
            {trip.permits && <div className="ts-row"><dt>Permits</dt><dd>{trip.permits}</dd></div>}
            {trip.budget && <div className="ts-row"><dt>Budget</dt><dd>{trip.budget}</dd></div>}
            {trip.weatherNotes && <div className="ts-row"><dt>Weather</dt><dd>{trip.weatherNotes}</dd></div>}
          </Section>
        )}

        {(trip.emergencyContact || trip.emergencyPhone) && (
          <Section title="Emergency">
            <div className="ts-row">
              <dt>Contact</dt>
              <dd>{[trip.emergencyContact, trip.emergencyPhone].filter(Boolean).join(" — ")}</dd>
            </div>
          </Section>
        )}

        {tripVehicles.length > 0 && (
          <Section title="Vehicles & riders">
            <div className="ts-vehicles">
              {tripVehicles.map((v) => {
                const desc = [v.year, v.make, v.model].filter(Boolean).join(" ");
                const riderIds = trip.riderAssignments?.[v.id] ?? [];
                const riders = riderIds.map((id) => personById.get(id)).filter((p): p is Person => !!p);
                return (
                  <div className="ts-vehicle" key={v.id}>
                    <div className="ts-vehicle-head">
                      <h3>{v.name}</h3>
                      {desc && <span className="muted">{desc}</span>}
                    </div>
                    {riders.length === 0 ? (
                      <p className="muted">No riders assigned</p>
                    ) : (
                      <ul className="ts-riders">
                        {riders.map((p) => (
                          <li key={p.id}>
                            <strong>{p.name}</strong>
                            {p.role && <span className="muted"> · {p.role}</span>}
                            {p.phone && <span className="muted"> · {p.phone}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {trip.tasks && trip.tasks.length > 0 && (
          <Section title="Tasks">
            <ul className="ts-tasks">
              {trip.tasks.map((t) => (
                <li key={t.id} className={t.done ? "done" : ""}>
                  <span className="ts-check">{t.done ? "☑" : "☐"}</span>
                  <span>{t.title}</span>
                  {t.dueDate && <span className="muted"> · due {formatDate(t.dueDate)}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {trip.links && trip.links.length > 0 && (
          <Section title="Links">
            <ul className="ts-links">
              {trip.links.map((l, i) => (
                <li key={i}>{l.label ? `${l.label} — ` : ""}{l.url}</li>
              ))}
            </ul>
          </Section>
        )}

        <footer className="ts-foot">
          <span>Pack Attack · trip summary</span>
          <span>{new Date().toLocaleString()}</span>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }): JSX.Element {
  return (
    <div className="ts-stat">
      <div className="ts-stat-value">{value}{sub && <span className="ts-stat-sub"> {sub}</span>}</div>
      <div className="ts-stat-label">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="ts-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function countRiders(trip: Trip): number {
  if (!trip.riderAssignments) return 0;
  const all = new Set<string>();
  for (const arr of Object.values(trip.riderAssignments)) for (const id of arr) all.add(id);
  return all.size;
}

function formatDate(iso: string): string {
  // Accept yyyy-mm-dd or full ISO; render as e.g. May 26, 2026.
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
