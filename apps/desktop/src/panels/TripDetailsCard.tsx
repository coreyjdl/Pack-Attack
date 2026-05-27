import { useRef, useState } from "react";
import type { Trip, TripDifficulty, TripLink, TripRoute, TripTerrain } from "@pack-attack/shared";
import { parseGpx } from "../gpx";
import { fmtMi, fmtFt, miToKm, ftToM } from "../units";
import { DeleteIconButton } from "../components/DeleteIconButton";

interface Props {
  trip: Trip;
  onUpdateTrip: (patch: Partial<Trip>) => void;
}

const DIFFICULTIES: TripDifficulty[] = ["easy", "moderate", "hard", "expert"];
const TERRAINS: TripTerrain[] = ["pavement", "gravel", "mixed", "offroad", "technical", "trail", "water"];

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "route", label: "Route & GPX" },
  { id: "logistics", label: "Logistics" },
  { id: "safety", label: "Safety" },
  { id: "links", label: "Links" }
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function TripDetailsCard({ trip, onUpdateTrip }: Props): JSX.Element {
  const [open, setOpen] = useState<SectionId | null>("overview");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const route: TripRoute = trip.route ?? {};
  const links = trip.links ?? [];
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  function patchRoute(patch: Partial<TripRoute>): void {
    onUpdateTrip({ route: { ...route, ...patch } });
  }

  async function handleGpxUpload(file: File): Promise<void> {
    const xml = await file.text();
    const parsed = parseGpx(xml, file.name);
    patchRoute({
      gpx: parsed,
      // If user hasn't filled overrides, pre-populate from parse.
      distanceKm: route.distanceKm ?? parsed.distanceKm,
      elevationGainM: route.elevationGainM ?? parsed.elevationGainM,
      name: route.name ?? parsed.trackNames?.[0]
    });
  }

  function addLink(): void {
    const label = newLinkLabel.trim();
    const url = newLinkUrl.trim();
    if (!label || !url) return;
    const link: TripLink = { id: crypto.randomUUID(), label, url };
    onUpdateTrip({ links: [...links, link] });
    setNewLinkLabel("");
    setNewLinkUrl("");
  }

  function updateLink(id: string, patch: Partial<TripLink>): void {
    onUpdateTrip({ links: links.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  }

  function deleteLink(id: string): void {
    onUpdateTrip({ links: links.filter((l) => l.id !== id) });
  }

  const gpx = route.gpx;
  const effectiveDistance = route.distanceKm ?? gpx?.distanceKm;
  const effectiveElevation = route.elevationGainM ?? gpx?.elevationGainM;

  return (
    <section className="card">
      <h3>Trip details</h3>
      <div className="accordion">
        {SECTIONS.map((s) => {
          const isOpen = open === s.id;
          return (
            <div key={s.id} className={isOpen ? "acc-section open" : "acc-section"}>
              <button
                type="button"
                className="acc-head"
                onClick={() => setOpen(isOpen ? null : s.id)}
              >
                <span className="acc-caret">{isOpen ? "▾" : "▸"}</span>
                {s.label}
              </button>
              {isOpen && <div className="acc-body">{renderSection(s.id)}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );

  function renderSection(id: SectionId): JSX.Element {
    if (id === "overview") {
      return (
        <div className="field-col">
          <label className="field">
            <span>Description</span>
            <textarea
              rows={3}
              value={trip.description ?? ""}
              placeholder="What's the plan? Why this trip?"
              onChange={(e) => onUpdateTrip({ description: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Origin</span>
              <input
                value={trip.origin ?? ""}
                placeholder="Where you start"
                onChange={(e) => onUpdateTrip({ origin: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Destination</span>
              <input
                value={trip.destination ?? ""}
                placeholder="Where you're headed"
                onChange={(e) => onUpdateTrip({ destination: e.target.value })}
              />
            </label>
          </div>
        </div>
      );
    }

    if (id === "route") {
      return (
        <div className="field-col">
          <label className="field">
            <span>Route name</span>
            <input
              value={route.name ?? ""}
              placeholder="e.g. Sierras Loop"
              onChange={(e) => patchRoute({ name: e.target.value || undefined })}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Distance (mi)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={fmtMi(route.distanceKm) || ""}
                placeholder={gpx?.distanceKm ? `${fmtMi(gpx.distanceKm)} (GPX)` : ""}
                onChange={(e) => patchRoute({
                  distanceKm: e.target.value === "" ? undefined : miToKm(Number.parseFloat(e.target.value))
                })}
              />
            </label>
            <label className="field">
              <span>Elevation gain (ft)</span>
              <input
                type="number"
                min={0}
                value={fmtFt(route.elevationGainM) || ""}
                placeholder={gpx?.elevationGainM ? `${fmtFt(gpx.elevationGainM)} (GPX)` : ""}
                onChange={(e) => patchRoute({
                  elevationGainM: e.target.value === "" ? undefined : ftToM(Number.parseInt(e.target.value, 10))
                })}
              />
            </label>
            <label className="field">
              <span>Difficulty</span>
              <select
                value={route.difficulty ?? ""}
                onChange={(e) => patchRoute({ difficulty: (e.target.value || undefined) as TripDifficulty | undefined })}
              >
                <option value="">—</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Terrain</span>
              <select
                value={route.terrain ?? ""}
                onChange={(e) => patchRoute({ terrain: (e.target.value || undefined) as TripTerrain | undefined })}
              >
                <option value="">—</option>
                {TERRAINS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Route notes</span>
            <textarea
              rows={2}
              value={route.notes ?? ""}
              placeholder="Waypoints, fuel stops, hazards…"
              onChange={(e) => patchRoute({ notes: e.target.value || undefined })}
            />
          </label>

          <div className="gpx-block">
            <div className="gpx-head">
              <strong>GPX</strong>
              <input
                ref={fileRef}
                type="file"
                accept=".gpx,application/gpx+xml,text/xml,application/xml"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleGpxUpload(f);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
              <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
                {gpx ? "Replace GPX…" : "Upload GPX…"}
              </button>
              {gpx && (
                <>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      const blob = new Blob([gpx.xml], { type: "application/gpx+xml" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = gpx.filename;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => patchRoute({ gpx: undefined })}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
            {gpx ? (
              <ul className="gpx-meta">
                <li><span className="muted">File:</span> {gpx.filename}</li>
                {gpx.pointCount !== undefined && (
                  <li><span className="muted">Points:</span> {gpx.pointCount.toLocaleString()}</li>
                )}
                {gpx.distanceKm !== undefined && (
                  <li><span className="muted">Distance:</span> {fmtMi(gpx.distanceKm)} mi
                    ({gpx.distanceKm.toFixed(2)} km)</li>
                )}
                {gpx.elevationGainM !== undefined && (
                  <li><span className="muted">Elevation gain:</span> {fmtFt(gpx.elevationGainM)} ft
                    ({gpx.elevationGainM.toLocaleString()} m)</li>
                )}
                {gpx.bounds && (
                  <li>
                    <span className="muted">Bounds:</span> {gpx.bounds.minLat.toFixed(4)},
                    {gpx.bounds.minLon.toFixed(4)} → {gpx.bounds.maxLat.toFixed(4)},
                    {gpx.bounds.maxLon.toFixed(4)}
                  </li>
                )}
                {gpx.trackNames && gpx.trackNames.length > 0 && (
                  <li><span className="muted">Tracks:</span> {gpx.trackNames.join(", ")}</li>
                )}
                <li className="muted" style={{ fontSize: 12 }}>
                  Uploaded {new Date(gpx.uploadedAt).toLocaleString()}
                </li>
              </ul>
            ) : (
              <p className="muted">No GPX attached. Upload a .gpx file to auto-fill distance + elevation.</p>
            )}
          </div>

          {(effectiveDistance !== undefined || effectiveElevation !== undefined) && (
            <p className="muted" style={{ fontSize: 13 }}>
              Effective: {effectiveDistance !== undefined ? `${fmtMi(effectiveDistance)} mi` : "— mi"}
              {" · "}
              {effectiveElevation !== undefined ? `${fmtFt(effectiveElevation)} ft gain` : "— elevation"}
            </p>
          )}
        </div>
      );
    }

    if (id === "logistics") {
      return (
        <div className="field-col">
          <label className="field">
            <span>Lodging / camping</span>
            <textarea
              rows={2}
              value={trip.lodging ?? ""}
              placeholder="Campground reservation, hotel name + confirmation #"
              onChange={(e) => onUpdateTrip({ lodging: e.target.value || undefined })}
            />
          </label>
          <label className="field">
            <span>Permits / reservations</span>
            <textarea
              rows={2}
              value={trip.permits ?? ""}
              placeholder="Backcountry permits, ferry bookings, fees"
              onChange={(e) => onUpdateTrip({ permits: e.target.value || undefined })}
            />
          </label>
          <label className="field">
            <span>Budget</span>
            <input
              value={trip.budget ?? ""}
              placeholder="$400 fuel + camp"
              onChange={(e) => onUpdateTrip({ budget: e.target.value || undefined })}
            />
          </label>
          <label className="field">
            <span>Weather notes</span>
            <textarea
              rows={2}
              value={trip.weatherNotes ?? ""}
              placeholder="Forecast, seasonal notes, what to pack for"
              onChange={(e) => onUpdateTrip({ weatherNotes: e.target.value || undefined })}
            />
          </label>
        </div>
      );
    }

    if (id === "safety") {
      return (
        <div className="field-col">
          <div className="field-row">
            <label className="field">
              <span>Emergency contact</span>
              <input
                value={trip.emergencyContact ?? ""}
                placeholder="Name"
                onChange={(e) => onUpdateTrip({ emergencyContact: e.target.value || undefined })}
              />
            </label>
            <label className="field">
              <span>Emergency phone</span>
              <input
                type="tel"
                value={trip.emergencyPhone ?? ""}
                placeholder="+1 555 555 5555"
                onChange={(e) => onUpdateTrip({ emergencyPhone: e.target.value || undefined })}
              />
            </label>
          </div>
        </div>
      );
    }

    /* links */
    return (
      <div className="field-col">
        <ul className="link-list">
          {links.map((l) => (
            <li key={l.id} className="link-row">
              <input
                value={l.label}
                onChange={(e) => updateLink(l.id, { label: e.target.value })}
                placeholder="Label"
              />
              <input
                value={l.url}
                onChange={(e) => updateLink(l.id, { url: e.target.value })}
                placeholder="https://"
              />
              <a className="ghost" href={l.url} target="_blank" rel="noreferrer">Open</a>
                <DeleteIconButton
                  onClick={() => deleteLink(l.id)}
                  label={`Delete link ${l.label || l.url}`}
                />
            </li>
          ))}
        </ul>
        <div className="link-add">
          <input
            value={newLinkLabel}
            onChange={(e) => setNewLinkLabel(e.target.value)}
            placeholder="Label (e.g. Route on RWGPS)"
          />
          <input
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="https://"
            onKeyDown={(e) => { if (e.key === "Enter") addLink(); }}
          />
          <button type="button" onClick={addLink} disabled={!newLinkLabel.trim() || !newLinkUrl.trim()}>
            Add link
          </button>
        </div>
      </div>
    );
  }
}
