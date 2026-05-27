import { useState } from "react";
import type { Trip, Vehicle } from "@pack-attack/shared";
import { TripDetailsCard } from "./TripDetailsCard";

interface Props {
  trip: Trip;
  vehicles: Vehicle[];
  isActive: boolean;
  onUpdate: (patch: Partial<Trip>) => void;
  onDelete: () => void;
  onSetActive: () => void;
  onClose: () => void;
  onClone: (newName: string) => void;
  onSaveAsTemplate: (templateName: string) => void;
}

export function TripEditPanel({
  trip,
  vehicles,
  isActive,
  onUpdate,
  onDelete,
  onSetActive,
  onClose,
  onClone,
  onSaveAsTemplate
}: Props): JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleVehicle(id: string): void {
    const next = trip.vehicleIds.includes(id)
      ? trip.vehicleIds.filter((x) => x !== id)
      : [...trip.vehicleIds, id];
    onUpdate({ vehicleIds: next });
  }

  const isTemplate = !!trip.isTemplate;

  return (
    <div className="panel">
      <header className="panel-header">
        <div>
          <span className="crumb">
            <button type="button" className="ghost" onClick={onClose}>← Back to Trips</button>
          </span>
          <h2>
            Edit {isTemplate ? "template" : "trip"}: <em>{trip.name || "(unnamed)"}</em>
          </h2>
          <p className="panel-sub">
            All trip metadata lives here. Packing happens on the Trip dashboard.
          </p>
        </div>
        <div className="row-actions">
          {!isActive && !isTemplate && (
            <button type="button" onClick={onSetActive}>Make active</button>
          )}
          <button
            type="button"
            className="ghost"
            onClick={() => {
              const n = window.prompt("Name the cloned trip:", `${trip.name} (copy)`);
              if (n && n.trim()) onClone(n.trim());
            }}
          >
            Clone
          </button>
          {!isTemplate && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const n = window.prompt("Template name:", `${trip.name} template`);
                if (n && n.trim()) onSaveAsTemplate(n.trim());
              }}
            >
              Save as template
            </button>
          )}
        </div>
      </header>

      <section className="card">
        <h3>Basics</h3>
        <div className="field-row">
          <label className="field">
            <span>{isTemplate ? "Template name" : "Trip name"}</span>
            <input value={trip.name} onChange={(e) => onUpdate({ name: e.target.value })} />
          </label>
          <label className="field">
            <span>Trip type</span>
            <input
              value={trip.tripType}
              placeholder="day, weekend, ADV, commute…"
              onChange={(e) => onUpdate({ tripType: e.target.value })}
            />
          </label>
          {!isTemplate && (
            <>
              <label className="field">
                <span>Start date</span>
                <input
                  type="date"
                  value={trip.startDate ?? ""}
                  onChange={(e) => onUpdate({ startDate: e.target.value || undefined })}
                />
              </label>
              <label className="field">
                <span>End date</span>
                <input
                  type="date"
                  value={trip.endDate ?? ""}
                  onChange={(e) => onUpdate({ endDate: e.target.value || undefined })}
                />
              </label>
            </>
          )}
        </div>

        <div className="field">
          <span>Vehicles in this {isTemplate ? "template" : "trip"}</span>
          <div className="chip-row">
            {vehicles.map((v) => (
              <button
                key={v.id}
                type="button"
                className={trip.vehicleIds.includes(v.id) ? "chip active" : "chip"}
                aria-pressed={trip.vehicleIds.includes(v.id)}
                onClick={() => toggleVehicle(v.id)}
              >
                {v.name}
              </button>
            ))}
            {vehicles.length === 0 && (
              <span className="muted">No vehicles yet. Add some in the Vehicles tab.</span>
            )}
          </div>
        </div>
      </section>

      <TripDetailsCard trip={trip} onUpdateTrip={onUpdate} />

      <section className="card">
        <h3>Danger zone</h3>
        {confirmDelete ? (
          <div className="row-actions">
            <span className="muted">
              Delete {isTemplate ? "template" : "trip"} "{trip.name}"? Library assets are kept.
            </span>
            <button
              type="button"
              className="ghost danger"
              onClick={() => { onDelete(); onClose(); }}
            >
              Confirm delete
            </button>
            <button type="button" className="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="ghost danger" onClick={() => setConfirmDelete(true)}>
            Delete {isTemplate ? "template" : "trip"}
          </button>
        )}
      </section>
    </div>
  );
}
