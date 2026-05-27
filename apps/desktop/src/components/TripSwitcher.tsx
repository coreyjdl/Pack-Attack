import type { Trip } from "@pack-attack/shared";

interface Props {
  trips: Trip[];
  activeTripId: string;
  onSelect: (id: string) => void;
  onManage: () => void;
}

export function TripSwitcher({ trips, activeTripId, onSelect, onManage }: Props): JSX.Element {
  return (
    <div className="vehicle-switcher">
      <select
        className="vehicle-select"
        value={activeTripId}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="Active trip"
      >
        {trips.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.tripType ? ` — ${t.tripType}` : ""}
          </option>
        ))}
      </select>
      <button type="button" className="ghost" onClick={onManage} title="Manage trips">
        Trips
      </button>
    </div>
  );
}
