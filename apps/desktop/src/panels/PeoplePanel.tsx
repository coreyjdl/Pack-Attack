import { useState } from "react";
import type { Person } from "@pack-attack/shared";

interface Props {
  people: Person[];
  onAdd: (input: Omit<Person, "id">) => Person | null;
  onUpdate: (id: string, patch: Partial<Person>) => void;
  onDelete: (id: string) => void;
}

const SECTIONS: Array<{
  title: string;
  fields: Array<{ key: keyof Person; label: string; placeholder?: string; wide?: boolean; textarea?: boolean }>;
}> = [
  {
    title: "Basics",
    fields: [
      { key: "name", label: "Name *" },
      { key: "nickname", label: "Nickname / call sign" },
      { key: "role", label: "Role", placeholder: "Driver, Passenger, Crew…" }
    ]
  },
  {
    title: "Contact",
    fields: [
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address", wide: true, textarea: true }
    ]
  },
  {
    title: "Personal",
    fields: [
      { key: "dateOfBirth", label: "Date of birth", placeholder: "yyyy-mm-dd" },
      { key: "age", label: "Age (if no DOB)" },
      { key: "height", label: "Height" },
      { key: "weight", label: "Weight" },
      { key: "licenseNumber", label: "Driver license #" },
      { key: "licenseExpires", label: "License expires", placeholder: "yyyy-mm-dd" },
      { key: "passportNumber", label: "Passport #" },
      { key: "passportExpires", label: "Passport expires", placeholder: "yyyy-mm-dd" }
    ]
  },
  {
    title: "Medical",
    fields: [
      { key: "bloodType", label: "Blood type", placeholder: "O+" },
      { key: "allergies", label: "Allergies", wide: true, textarea: true },
      { key: "medications", label: "Medications", wide: true, textarea: true },
      { key: "conditions", label: "Conditions", wide: true, textarea: true },
      { key: "insuranceProvider", label: "Health insurance" },
      { key: "insurancePolicy", label: "Policy #" },
      { key: "preferredHospital", label: "Preferred hospital" }
    ]
  },
  {
    title: "Emergency Contact",
    fields: [
      { key: "emergencyName", label: "Name" },
      { key: "emergencyPhone", label: "Phone" },
      { key: "emergencyRelation", label: "Relation" }
    ]
  },
  {
    title: "Gear Sizing",
    fields: [
      { key: "helmetSize", label: "Helmet" },
      { key: "jacketSize", label: "Jacket" },
      { key: "gloveSize", label: "Gloves" },
      { key: "bootSize", label: "Boots" }
    ]
  },
  {
    title: "Notes",
    fields: [{ key: "notes", label: "Notes", wide: true, textarea: true }]
  }
];

export function PeoplePanel({ people, onAdd, onUpdate, onDelete }: Props): JSX.Element {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="panel">
      <header className="panel-header">
        <div>
          <h2>People</h2>
          <p className="panel-sub">
            Anyone on the trip — drivers, passengers, crew. Stored once here; assign them to vehicles per‑trip from the trip overview.
          </p>
        </div>
        <button type="button" className="ghost" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "Add person"}
        </button>
      </header>

      {showAdd && (
        <PersonForm
          onSubmit={(data) => {
            const created = onAdd(data);
            if (created) setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {people.length === 0 && !showAdd && (
        <div className="empty-state-full muted">No people yet. Add your first one.</div>
      )}

      <div className="vehicle-list">
        {people.map((p) => {
          const isEditing = editingId === p.id;
          const isExpanded = expandedId === p.id;
          const subtitle = [p.role, p.nickname && `“${p.nickname}”`].filter(Boolean).join(" · ");
          return (
            <div key={p.id} className="vehicle-row">
              {isEditing ? (
                <PersonForm
                  initial={p}
                  onSubmit={(patch) => { onUpdate(p.id, patch); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="vehicle-info">
                    <strong>{p.name}</strong>
                    {subtitle && <span className="muted">{subtitle}</span>}
                    {(p.phone || p.email) && (
                      <span className="muted">{[p.phone, p.email].filter(Boolean).join(" · ")}</span>
                    )}
                    {p.bloodType && <span className="muted">Blood: {p.bloodType}</span>}
                    {isExpanded && <PersonSummary p={p} />}
                  </div>
                  <div className="row-actions">
                    <button type="button" className="ghost" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                      {isExpanded ? "Hide details" : "Details"}
                    </button>
                    <button type="button" className="ghost" onClick={() => setEditingId(p.id)}>Edit</button>
                    <button type="button" className="ghost danger" onClick={() => onDelete(p.id)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PersonSummary({ p }: { p: Person }): JSX.Element {
  return (
    <div className="vehicle-summary">
      {SECTIONS.map((section) => {
        const rows = section.fields
          .map((f) => [f.label, p[f.key]] as [string, unknown])
          .filter(([, v]) => typeof v === "string" && v.trim());
        if (rows.length === 0) return null;
        return (
          <div key={section.title} className="summary-group">
            <h4>{section.title}</h4>
            <dl>
              {rows.map(([label, value]) => (
                <div key={label} className="summary-row">
                  <dt>{label}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

interface FormProps {
  initial?: Person;
  onSubmit: (data: Omit<Person, "id">) => void;
  onCancel: () => void;
}

function PersonForm({ initial, onSubmit, onCancel }: FormProps): JSX.Element {
  const [data, setData] = useState<Partial<Person>>(initial ?? {});
  const [openSection, setOpenSection] = useState<string>("Basics");

  function set<K extends keyof Person>(key: K, value: string): void {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function clean(): Omit<Person, "id"> {
    const out: Partial<Person> = { ...data };
    for (const k of Object.keys(out) as (keyof Person)[]) {
      const v = out[k];
      if (typeof v === "string" && !v.trim()) {
        // Preserve the key as undefined so a spread-merge update clears the
        // previous value instead of leaving the stale one in place.
        (out as Record<string, unknown>)[k] = undefined;
      }
    }
    out.name = (data.name ?? initial?.name ?? "").trim() || (initial?.name ?? "");
    return out as Omit<Person, "id">;
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
                        <textarea rows={2} value={value} onChange={(e) => set(f.key, e.target.value)} />
                      ) : (
                        <input value={value} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
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
          {initial ? "Save" : "Create person"}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
