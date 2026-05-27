import { useState } from "react";
import type { Trip, Vehicle } from "@pack-attack/shared";

interface Props {
  trips: Trip[];
  activeTripId: string;
  vehicles: Vehicle[];
  onCreate: (input: { name: string; tripType: string; vehicleIds: string[] }) => Trip | null;
  onUpdate: (id: string, patch: Partial<Pick<Trip, "name" | "tripType" | "vehicleIds" | "startDate" | "endDate" | "destination" | "origin">>) => void;
  onDelete: (id: string) => void;
  onClone: (id: string, newName: string) => Trip | null;
  onSetActive: (id: string) => void;
  onSaveAsTemplate: (id: string, templateName: string) => Trip;
  onCreateFromTemplate: (templateId: string, name: string) => Trip | null;
  onShareActiveTrip: () => void;
  onImportSharedTrip: () => void;
}

export function TripsPanel({
  trips,
  activeTripId,
  vehicles,
  onCreate,
  onUpdate,
  onDelete,
  onClone,
  onSetActive,
  onSaveAsTemplate,
  onCreateFromTemplate,
  onShareActiveTrip,
  onImportSharedTrip
}: Props): JSX.Element {
  const [name, setName] = useState("");
  const [tripType, setTripType] = useState("");
  const [vehicleIds, setVehicleIds] = useState<string[]>(vehicles[0] ? [vehicles[0].id] : []);
  const [fromTemplateId, setFromTemplateId] = useState<string>("");

  const realTrips = trips.filter((t) => !t.isTemplate);
  const templates = trips.filter((t) => t.isTemplate);

  function toggleVehicle(id: string): void {
    setVehicleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="panel">
      <header className="panel-header">
        <div>
          <h2>Trips</h2>
          <p className="panel-sub">Save multiple packing plans. Switch between them anytime.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost" onClick={onShareActiveTrip}>
            Share active trip
          </button>
          <button type="button" className="ghost" onClick={onImportSharedTrip}>
            Import trip
          </button>
        </div>
      </header>

      <section className="card">
        <h3>New trip</h3>
        <div className="field-row">
          <label className="field">
            <span>Name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PNW ADV — June" />
          </label>
          <label className="field">
            <span>Trip type</span>
            <input
              value={tripType}
              onChange={(e) => setTripType(e.target.value)}
              placeholder="day, weekend, ADV, commute…"
            />
          </label>
        </div>
        <div className="field">
          <span>Vehicles</span>
          <div className="chip-row">
            {vehicles.map((v) => (
              <button
                key={v.id}
                type="button"
                className={vehicleIds.includes(v.id) ? "chip active" : "chip"}
                aria-pressed={vehicleIds.includes(v.id)}
                onClick={() => toggleVehicle(v.id)}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
        <div className="row-actions">
          <button
            type="button"
            disabled={!name.trim() || vehicleIds.length === 0}
            onClick={() => {
              const created = onCreate({ name, tripType, vehicleIds });
              if (created) {
                setName("");
                setTripType("");
              }
            }}
          >
            Create trip
          </button>
          {templates.length > 0 && (
            <>
              <select value={fromTemplateId} onChange={(e) => setFromTemplateId(e.target.value)}>
                <option value="">…or start from template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.templateName ?? t.name}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!fromTemplateId || !name.trim()}
                onClick={() => {
                  const created = onCreateFromTemplate(fromTemplateId, name.trim());
                  if (created) {
                    setName("");
                    setTripType("");
                    setFromTemplateId("");
                  }
                }}
                title="Create a new trip with all items / tasks copied from the template"
              >
                Create from template
              </button>
            </>
          )}
        </div>
      </section>

      {templates.length > 0 && (
        <section className="card">
          <h3>Templates</h3>
          <p className="muted">Reusable trip skeletons. Items, tasks, and vehicle assignments copy into each new trip.</p>
          <ul className="library-list">
            {templates.map((t) => (
              <li key={t.id} className="vehicle-row">
                <div className="vehicle-info">
                  <input
                    className="library-name"
                    value={t.templateName ?? t.name}
                    onChange={(e) => onUpdate(t.id, { name: e.target.value })}
                  />
                  <span className="muted">
                    {Object.keys(t.itemRefs).length} items · {(t.tasks ?? []).length} tasks
                  </span>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      const n = window.prompt("Name the new trip from this template:", t.templateName ?? t.name);
                      if (n && n.trim()) onCreateFromTemplate(t.id, n.trim());
                    }}
                  >
                    Use template
                  </button>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => {
                      if (confirm(`Delete template "${t.templateName ?? t.name}"?`)) onDelete(t.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>All trips</h3>
        <ul className="library-list">
          {realTrips.map((t) => {
            const isActive = t.id === activeTripId;
            const itemCount = Object.keys(t.itemRefs).length;
            return (
              <li key={t.id} className={isActive ? "vehicle-row active" : "vehicle-row"}>
                <div className="vehicle-info">
                  <div className="library-name" style={{ fontWeight: 600 }}>
                    {t.name}
                    {isActive && <span className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>(active)</span>}
                  </div>
                  <span className="muted" style={{ display: "block", marginTop: 4 }}>
                    {t.tripType ? `${t.tripType} · ` : ""}
                    {t.startDate ? t.startDate : ""}
                    {t.startDate && t.endDate ? ` → ${t.endDate}` : t.endDate ? t.endDate : ""}
                    {t.destination ? ` · ${t.destination}` : ""}
                  </span>
                  <span className="muted" style={{ display: "block", marginTop: 2 }}>
                    {itemCount} items · {t.vehicleIds.length} vehicle{t.vehicleIds.length === 1 ? "" : "s"}
                    {t.route?.distanceKm !== undefined || t.route?.gpx?.distanceKm !== undefined
                      ? ` · ${(t.route?.distanceKm ?? t.route?.gpx?.distanceKm ?? 0).toFixed(1)} km`
                      : ""}
                    {t.route?.gpx ? " · GPX" : ""}
                  </span>
                </div>
                <div className="row-actions">
                  {!isActive && (
                    <button type="button" className="ghost" onClick={() => onSetActive(t.id)}>
                      Make active
                    </button>
                  )}
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      const newName = window.prompt("Name the cloned trip:", `${t.name} (copy)`);
                      if (newName && newName.trim()) onClone(t.id, newName.trim());
                    }}
                  >
                    Clone
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      const tplName = window.prompt("Template name:", `${t.name} template`);
                      if (tplName && tplName.trim()) onSaveAsTemplate(t.id, tplName.trim());
                    }}
                    title="Save this trip's structure as a reusable template"
                  >
                    Save as template
                  </button>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => {
                      if (realTrips.length === 1) {
                        alert("Can't delete the last trip.");
                        return;
                      }
                      if (confirm(`Delete trip "${t.name}"? (Library items are kept.)`)) onDelete(t.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
