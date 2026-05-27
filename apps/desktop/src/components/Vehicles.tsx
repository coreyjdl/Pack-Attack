import { useState, type CSSProperties } from "react";
import type { StorageLocation, Vehicle } from "@pack-attack/shared";
import { DeleteIconButton } from "./DeleteIconButton";
import { LOCATION_KIND_OPTIONS } from "../constants";

const VEHICLE_ACCENTS = [
  "#7f2f44",
  "#2f6d8f",
  "#7a5d24",
  "#3f7c58",
  "#6a4f9e",
  "#9a5a2e"
] as const;

interface SwitcherProps {
  vehicles: Vehicle[];
  activeVehicleId: string;
  onSelect: (id: string) => void;
  onManage: () => void;
}

export function VehicleSwitcher({ vehicles, activeVehicleId, onSelect, onManage }: SwitcherProps): JSX.Element {
  return (
    <div className="vehicle-switcher">
      <select
        className="vehicle-select"
        value={activeVehicleId}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="Active vehicle"
      >
        {vehicles.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <button type="button" className="ghost" onClick={onManage} title="Manage vehicles">
        Manage
      </button>
    </div>
  );
}

interface CardProps {
  vehicles: Vehicle[];
  activeVehicleId: string;
  onSelect: (id: string) => void;
  onAdd: (input: Omit<Vehicle, "id">) => Vehicle | null;
  onUpdate: (id: string, patch: Partial<Vehicle>) => void;
  onDelete: (id: string) => void;
  /** All library storage locations. Filtered per-vehicle inside. */
  locations?: StorageLocation[];
  onAddLocation?: (name: string, kind: StorageLocation["kind"], vehicleId: string) => StorageLocation | null;
  onUpdateLocation?: (id: string, patch: Partial<StorageLocation>) => void;
  onDeleteLocation?: (id: string) => void;
}

export function VehiclesCard({
  vehicles,
  activeVehicleId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  locations = [],
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation
}: CardProps): JSX.Element {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      <div className="panel-actions">
        <button type="button" className="ghost" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "Add vehicle"}
        </button>
      </div>

      {showAdd && (
        <VehicleForm
          onSubmit={(data) => {
            const created = onAdd(data);
            if (created) setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="vehicle-list">
        {vehicles.map((v, index) => {
          const isActive = v.id === activeVehicleId;
          const isEditing = editingId === v.id;
          const isExpanded = expandedId === v.id;
          const accent = VEHICLE_ACCENTS[index % VEHICLE_ACCENTS.length];
          const rowStyle = { "--vehicle-accent": accent } as CSSProperties;
          const subtitle = [v.year, v.make, v.model].filter(Boolean).join(" ");
          return (
            <div
              key={v.id}
              className={[
                "vehicle-row",
                isActive ? "active" : ""
              ].filter(Boolean).join(" ")}
              style={rowStyle}
            >
              {isEditing ? (
                <VehicleForm
                  initial={v}
                  onSubmit={(patch) => { onUpdate(v.id, patch); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="vehicle-info">
                    <div className="vehicle-name-row">
                      <strong>{v.name}</strong>
                      {isActive && <span className="vehicle-badge active">Active</span>}
                    </div>
                    {subtitle && <span className="muted">{subtitle}</span>}
                    {v.notes && <span className="muted">{v.notes}</span>}
                    {onAddLocation && onUpdateLocation && onDeleteLocation && (
                      <VehicleStorageEditor
                        vehicle={v}
                        locations={locations.filter((l) => l.vehicleId === v.id)}
                        onAdd={(name, kind) => onAddLocation(name, kind, v.id)}
                        onUpdate={onUpdateLocation}
                        onDelete={onDeleteLocation}
                      />
                    )}
                    {isExpanded && <VehicleSummary v={v} />}
                  </div>
                  <div className="row-actions">
                    <button type="button" className="ghost" onClick={() => setExpandedId(isExpanded ? null : v.id)}>
                      {isExpanded ? "Hide details" : "Details"}
                    </button>
                    {activeVehicleId !== "" && !isActive && (
                      <button type="button" className="ghost" onClick={() => onSelect(v.id)}>Make active</button>
                    )}
                    <button type="button" className="ghost" onClick={() => setEditingId(v.id)}>Edit</button>
                    <button type="button" className="ghost danger" onClick={() => onDelete(v.id)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- Read-only summary of all service fields ---------------- */

function VehicleSummary({ v }: { v: Vehicle }): JSX.Element {
  return (
    <div className="vehicle-summary">
      <SummaryGroup title="Identification" rows={[
        ["VIN", v.vin],
        ["Plate", v.licensePlate],
        ["Color", v.color],
        ["Purchased", v.purchaseDate]
      ]} />
      <SummaryGroup title="Odometer & Fuel" rows={[
        ["Odometer", v.odometer ? `${v.odometer} ${v.odometerUnit ?? "mi"}`.trim() : undefined],
        ["Fuel", v.fuelType],
        ["Tank", v.fuelTankCapacity]
      ]} />
      <SummaryGroup title="Tires" rows={[
        ["Front size", v.tireSizeFront],
        ["Rear size", v.tireSizeRear],
        ["Front pressure", v.tirePressureFront],
        ["Rear pressure", v.tirePressureRear],
        ["Brand/Model", v.tireBrandModel]
      ]} />
      <SummaryGroup title="Oil & Filters" rows={[
        ["Oil", v.oilType],
        ["Capacity", v.oilCapacity],
        ["Oil filter #", v.oilFilterPart],
        ["Air filter #", v.airFilterPart],
        ["Spark plug", v.sparkPlugPart],
        ["Plug gap", v.sparkPlugGap]
      ]} />
      <SummaryGroup title="Fluids" rows={[
        ["Coolant", v.coolantType],
        ["Brake fluid", v.brakeFluidType],
        ["Fork oil", v.forkOilWeight]
      ]} />
      <SummaryGroup title="Drive" rows={[
        ["Type", v.finalDrive || undefined],
        ["Chain spec", v.chainSpec],
        ["Front sprocket", v.sprocketFront],
        ["Rear sprocket", v.sprocketRear]
      ]} />
      <SummaryGroup title="Electrical" rows={[
        ["Battery", v.batteryType],
        ["Headlight bulb", v.headlightBulb],
        ["Taillight bulb", v.taillightBulb]
      ]} />
      <SummaryGroup title="Service" rows={[
        ["Service interval", v.serviceIntervalMiles],
        ["Valve check", v.valveCheckInterval],
        ["Last service", [v.lastServiceDate, v.lastServiceOdometer].filter(Boolean).join(" @ ") || undefined],
        ["Next service", [v.nextServiceDate, v.nextServiceOdometer].filter(Boolean).join(" @ ") || undefined]
      ]} />
      <SummaryGroup title="Paperwork" rows={[
        ["Insurance", v.insurancePolicy],
        ["Ins. expires", v.insuranceExpires],
        ["Reg. expires", v.registrationExpires]
      ]} />
    </div>
  );
}

function SummaryGroup({ title, rows }: { title: string; rows: Array<[string, string | undefined]> }): JSX.Element | null {
  const filled = rows.filter(([, value]) => value && value.trim());
  if (filled.length === 0) return null;
  return (
    <div className="summary-group">
      <h4>{title}</h4>
      <dl>
        {filled.map(([label, value]) => (
          <div key={label} className="summary-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------------- Vehicle form (add + edit, grouped) ---------------- */

interface FormProps {
  initial?: Vehicle;
  onSubmit: (data: Omit<Vehicle, "id">) => void;
  onCancel: () => void;
}

const SECTIONS: Array<{
  title: string;
  fields: Array<{ key: keyof Vehicle; label: string; placeholder?: string; wide?: boolean; textarea?: boolean }>;
}> = [
  {
    title: "Basics",
    fields: [
      { key: "name", label: "Name *", placeholder: "e.g. Tenere 700" },
      { key: "make", label: "Make", placeholder: "Yamaha" },
      { key: "model", label: "Model", placeholder: "Ténéré 700" },
      { key: "year", label: "Year", placeholder: "2024" },
      { key: "color", label: "Color" }
    ]
  },
  {
    title: "Identification",
    fields: [
      { key: "vin", label: "VIN" },
      { key: "licensePlate", label: "License plate" },
      { key: "purchaseDate", label: "Purchased", placeholder: "yyyy-mm-dd" }
    ]
  },
  {
    title: "Odometer & Fuel",
    fields: [
      { key: "odometer", label: "Odometer" },
      { key: "odometerUnit", label: "Unit", placeholder: "mi" },
      { key: "fuelType", label: "Fuel type", placeholder: "91 octane" },
      { key: "fuelTankCapacity", label: "Tank capacity", placeholder: "4.2 gal" }
    ]
  },
  {
    title: "Tires",
    fields: [
      { key: "tireSizeFront", label: "Front size", placeholder: "90/90-21" },
      { key: "tireSizeRear", label: "Rear size", placeholder: "150/70-18" },
      { key: "tirePressureFront", label: "Front pressure", placeholder: "32 psi" },
      { key: "tirePressureRear", label: "Rear pressure", placeholder: "36 psi" },
      { key: "tireBrandModel", label: "Brand / model", placeholder: "Motoz Tractionator", wide: true }
    ]
  },
  {
    title: "Oil & Filters",
    fields: [
      { key: "oilType", label: "Oil weight / spec", placeholder: "10W-40 full synth" },
      { key: "oilCapacity", label: "Oil capacity", placeholder: "2.4 qt w/ filter" },
      { key: "oilFilterPart", label: "Oil filter #", placeholder: "HF-204" },
      { key: "airFilterPart", label: "Air filter #" },
      { key: "sparkPlugPart", label: "Spark plug #", placeholder: "CR8E" },
      { key: "sparkPlugGap", label: "Plug gap", placeholder: "0.7 mm" }
    ]
  },
  {
    title: "Fluids",
    fields: [
      { key: "coolantType", label: "Coolant" },
      { key: "brakeFluidType", label: "Brake fluid", placeholder: "DOT 4" },
      { key: "forkOilWeight", label: "Fork oil" }
    ]
  },
  {
    title: "Final Drive",
    fields: [
      { key: "finalDrive", label: "Type (chain/belt/shaft)" },
      { key: "chainSpec", label: "Chain spec", placeholder: "525 × 124 links" },
      { key: "sprocketFront", label: "Front sprocket", placeholder: "16T" },
      { key: "sprocketRear", label: "Rear sprocket", placeholder: "45T" }
    ]
  },
  {
    title: "Electrical",
    fields: [
      { key: "batteryType", label: "Battery", placeholder: "YTZ10S" },
      { key: "headlightBulb", label: "Headlight bulb" },
      { key: "taillightBulb", label: "Taillight bulb" }
    ]
  },
  {
    title: "Service",
    fields: [
      { key: "serviceIntervalMiles", label: "Service interval", placeholder: "4000 mi" },
      { key: "valveCheckInterval", label: "Valve check", placeholder: "16000 mi" },
      { key: "lastServiceDate", label: "Last service date", placeholder: "yyyy-mm-dd" },
      { key: "lastServiceOdometer", label: "Last service odo" },
      { key: "nextServiceDate", label: "Next service date", placeholder: "yyyy-mm-dd" },
      { key: "nextServiceOdometer", label: "Next service odo" }
    ]
  },
  {
    title: "Paperwork",
    fields: [
      { key: "insurancePolicy", label: "Insurance policy" },
      { key: "insuranceExpires", label: "Insurance expires", placeholder: "yyyy-mm-dd" },
      { key: "registrationExpires", label: "Registration expires", placeholder: "yyyy-mm-dd" }
    ]
  },
  {
    title: "Notes",
    fields: [
      { key: "notes", label: "Notes", wide: true, textarea: true }
    ]
  }
];

function VehicleForm({ initial, onSubmit, onCancel }: FormProps): JSX.Element {
  const [data, setData] = useState<Partial<Vehicle>>(initial ?? {});
  const [openSection, setOpenSection] = useState<string>("Basics");

  function set<K extends keyof Vehicle>(key: K, value: string): void {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function clean(): Omit<Vehicle, "id"> {
    const out: Partial<Vehicle> = { ...data };
    for (const k of Object.keys(out) as (keyof Vehicle)[]) {
      const v = out[k];
      if (typeof v === "string" && !v.trim()) {
        // Preserve the key as undefined so a spread-merge update clears the
        // previous value instead of leaving the stale one in place.
        (out as Record<string, unknown>)[k] = undefined;
      }
    }
    out.name = (data.name ?? initial?.name ?? "").trim() || (initial?.name ?? "");
    return out as Omit<Vehicle, "id">;
  }

  return (
    <div className="vehicle-editor">
      {SECTIONS.map((section) => {
        const open = openSection === section.title;
        return (
          <div key={section.title} className={open ? "veh-section open" : "veh-section"}>
            <button
              type="button"
              className="veh-section-head"
              onClick={() => setOpenSection(open ? "" : section.title)}
            >
              <span>{section.title}</span>
              <span className="muted">{open ? "−" : "+"}</span>
            </button>
            {open && (
              <div className="veh-section-body">
                {section.fields.map((f) => {
                  const value = (data[f.key] as string | undefined) ?? "";
                  return (
                    <label key={String(f.key)} className={f.wide ? "field wide" : "field"}>
                      <span>{f.label}</span>
                      {f.textarea ? (
                        <textarea
                          rows={2}
                          value={value}
                          onChange={(e) => set(f.key, e.target.value)}
                        />
                      ) : (
                        <input
                          value={value}
                          placeholder={f.placeholder}
                          onChange={(e) => set(f.key, e.target.value)}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div className="row-actions">
        <button
          type="button"
          onClick={() => {
            const out = clean();
            if (!out.name.trim()) return;
            onSubmit(out);
          }}
          disabled={!((data.name ?? initial?.name ?? "").trim())}
        >
          {initial ? "Save" : "Create vehicle"}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ---------------- Storage locations attached to a vehicle ---------------- */

interface StorageEditorProps {
  vehicle: Vehicle;
  locations: StorageLocation[];
  onAdd: (name: string, kind: StorageLocation["kind"]) => StorageLocation | null;
  onUpdate: (id: string, patch: Partial<StorageLocation>) => void;
  onDelete: (id: string) => void;
}

function VehicleStorageEditor({ locations, onAdd, onUpdate, onDelete }: StorageEditorProps): JSX.Element {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<StorageLocation["kind"]>("bag");

  function submit(): void {
    if (!name.trim()) return;
    if (onAdd(name.trim(), kind)) setName("");
  }

  return (
    <div className="vehicle-storage">
      <span className="vehicle-storage-label muted">Storage:</span>
      <ul className="vehicle-storage-list">
        {locations.map((l) => (
          <li key={l.id} className="vehicle-storage-chip">
            <input
              className="chip-name"
              value={l.name}
              onChange={(e) => onUpdate(l.id, { name: e.target.value })}
            />
            <select
              className="chip-kind"
              value={l.kind}
              onChange={(e) => onUpdate(l.id, { kind: e.target.value as StorageLocation["kind"] })}
              aria-label="Kind"
            >
              {LOCATION_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <DeleteIconButton
              onClick={() => onDelete(l.id)}
              label={`Delete storage ${l.name}`}
            />
          </li>
        ))}
        {locations.length === 0 && (
          <li className="vehicle-storage-empty muted">No storage defined yet.</li>
        )}
      </ul>
      <div className="vehicle-storage-add">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Custom storage name…"
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <select value={kind} onChange={(e) => setKind(e.target.value as StorageLocation["kind"])}>
          {LOCATION_KIND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button type="button" className="ghost" onClick={submit} disabled={!name.trim()}>Add</button>
      </div>
    </div>
  );
}
