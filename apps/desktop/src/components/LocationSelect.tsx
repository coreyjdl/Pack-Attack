import type { StorageLocation, Vehicle } from "@pack-attack/shared";

interface Props {
  value: string | undefined;
  locations: StorageLocation[];
  vehicles: Vehicle[];
  /**
   * Vehicle currently assigned to whatever owns this location (item or kit).
   * When set, the dropdown filters to that vehicle's storage + shared (unbound) locations.
   * When undefined and multiple trip vehicles exist, options are grouped by vehicle.
   */
  vehicleId?: string;
  /** Vehicles to consider "in scope" for grouping when vehicleId is undefined.
   *  Pass the active trip's vehicles for per-trip pickers, or all vehicles for library defaults. */
  scopeVehicles?: Vehicle[];
  onChange: (locationId: string | undefined, inferredVehicleId?: string) => void;
  /** Render an empty value label. */
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Vehicle-aware location picker.
 *
 * - When `vehicleId` is provided: lists that vehicle's locations + shared (unbound).
 * - When `vehicleId` is undefined: groups options by vehicle (optgroups) plus a Shared group.
 * - Calling `onChange` reports the new locationId; if the selected location is bound to a
 *   specific vehicle, `inferredVehicleId` is set so callers can auto-bind ownership.
 */
export function LocationSelect({
  value,
  locations,
  vehicles,
  vehicleId,
  scopeVehicles,
  onChange,
  placeholder = "(no location)",
  className,
  disabled
}: Props): JSX.Element {
  const locById = new Map(locations.map((l) => [l.id, l]));

  // If the current value points to a location bound to a vehicle different from `vehicleId`,
  // still include it so the select stays valid (rendered in an "Other vehicle" group).
  const currentLoc = value ? locById.get(value) : undefined;
  const currentOutOfScope =
    currentLoc &&
    currentLoc.vehicleId !== undefined &&
    vehicleId !== undefined &&
    currentLoc.vehicleId !== vehicleId;

  const handle = (newId: string): void => {
    const id = newId || undefined;
    const loc = id ? locById.get(id) : undefined;
    onChange(id, loc?.vehicleId);
  };

  if (vehicleId !== undefined) {
    const ownLocs = locations.filter((l) => l.vehicleId === vehicleId);
    return (
      <select
        className={className}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => handle(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {ownLocs.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
        {currentOutOfScope && currentLoc && (
          <optgroup label="⚠ Other vehicle">
            <option value={currentLoc.id}>
              {(vehicles.find((v) => v.id === currentLoc.vehicleId)?.name ?? "Other") + " · " + currentLoc.name}
            </option>
          </optgroup>
        )}
      </select>
    );
  }

  // No vehicleId — group by vehicle. If only one vehicle in scope, render flat (no optgroups)
  // so single-vehicle users never see vehicle headings.
  const scope = scopeVehicles ?? vehicles;
  if (scope.length <= 1) {
    const oneVehLocs = scope.length === 1 ? locations.filter((l) => l.vehicleId === scope[0].id) : [];
    return (
      <select
        className={className}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => handle(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {oneVehLocs.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
    );
  }
  // Multi-vehicle: prefix every option label with the vehicle name so the closed select
  // (which only shows the selected option's text, not its optgroup label) is unambiguous
  // when two vehicles share a location name like "Left Pannier".
  return (
    <select
      className={className}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => handle(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {scope.map((v) => {
        const own = locations.filter((l) => l.vehicleId === v.id);
        if (own.length === 0) return null;
        return (
          <optgroup key={v.id} label={v.name}>
            {own.map((l) => (
              <option key={l.id} value={l.id}>{v.name} · {l.name}</option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
