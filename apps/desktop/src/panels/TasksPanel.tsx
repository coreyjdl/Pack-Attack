import { useMemo, useState } from "react";
import type { Trip, TripTask } from "@pack-attack/shared";
import { DeleteIconButton } from "../components/DeleteIconButton";
import { STATUS_GLYPH } from "../constants";

interface TaskLine {
  tripId: string;
  tripName: string;
  task: TripTask;
}

interface Props {
  trips: Trip[];
  activeTripId: string;
  today?: string;
  onAddTask: (tripId: string, input: Omit<TripTask, "id" | "createdAt" | "done">) => void;
  onToggleTask: (tripId: string, taskId: string, done: boolean) => void;
  onUpdateTask: (tripId: string, taskId: string, patch: Partial<TripTask>) => void;
  onDeleteTask: (tripId: string, taskId: string) => void;
}

function taskDueLabel(task: TripTask): string {
  if (task.dueDate) return `Due ${task.dueDate}`;
  if (task.dueOffsetDays === undefined) return "";
  if (task.dueOffsetDays === 0) return "Day of trip";
  return task.dueOffsetDays < 0 ? `${-task.dueOffsetDays}d before` : `${task.dueOffsetDays}d after start`;
}

function categoryLabel(category: TripTask["category"]): string {
  if (category === "timeline") return "Tasks";
  return category[0].toUpperCase() + category.slice(1);
}

export function TasksPanel({
  trips,
  activeTripId,
  today,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask
}: Props): JSX.Element {
  const todayIso = today ?? new Date().toISOString().slice(0, 10);
  const [includePast, setIncludePast] = useState(false);
  const [includeDone, setIncludeDone] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<TripTask["category"]>("preflight");
  const [newOffset, setNewOffset] = useState("");

  const editableTrips = useMemo(() => trips.filter((t) => !t.isTemplate), [trips]);
  const targetTripId = editableTrips.some((t) => t.id === activeTripId)
    ? activeTripId
    : (editableTrips[0]?.id ?? "");
  const targetTripName = editableTrips.find((t) => t.id === targetTripId)?.name ?? "";

  const lines = useMemo<TaskLine[]>(() => {
    const upcomingTrips = trips.filter((t) => {
      if (t.isTemplate) return false;
      if (includePast) return true;
      if (!t.startDate && !t.endDate) return true;
      const end = t.endDate ?? t.startDate;
      return !end || end >= todayIso;
    });

    const out: TaskLine[] = [];
    for (const trip of upcomingTrips) {
      for (const task of trip.tasks ?? []) {
        if (!includeDone && task.done) continue;
        out.push({
          tripId: trip.id,
          tripName: trip.name,
          task
        });
      }
    }

    out.sort((a, b) => {
      if (a.task.done !== b.task.done) return a.task.done ? 1 : -1;
      if (a.tripName !== b.tripName) return a.tripName.localeCompare(b.tripName);
      return a.task.title.localeCompare(b.task.title);
    });
    return out;
  }, [trips, includePast, includeDone, todayIso]);

  function submitTask(): void {
    const title = newTitle.trim();
    if (!title || !targetTripId) return;
    onAddTask(targetTripId, {
      title,
      category: newCategory,
      dueOffsetDays: newOffset === "" ? undefined : Number.parseInt(newOffset, 10)
    });
    setNewTitle("");
    setNewOffset("");
  }

  return (
    <div className="panel">
      <header className="panel-header">
        <div>
          <h2>Tasks</h2>
          <p className="panel-sub">Trip prep, timeline, and shopping tasks across {includePast ? "all" : "upcoming"} trips.</p>
        </div>
      </header>

      <section className="card">
        <div className="chip-row">
          <button
            type="button"
            className={includePast ? "chip active" : "chip"}
            aria-pressed={includePast}
            onClick={() => setIncludePast((prev) => !prev)}
          >
            Include past trips
          </button>
          <button
            type="button"
            className={includeDone ? "chip active" : "chip"}
            aria-pressed={includeDone}
            onClick={() => setIncludeDone((prev) => !prev)}
          >
            Show completed
          </button>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          New tasks are added to: <strong>{targetTripName || "(no active trip)"}</strong>
        </p>
        <div className="task-add-row" style={{ marginTop: 10 }}>
          <input
            type="text"
            value={newTitle}
            placeholder="New task…"
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitTask();
            }}
          />
          <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as TripTask["category"])}>
            <option value="preflight">Preflight</option>
            <option value="timeline">Tasks</option>
            <option value="shopping">Shopping</option>
            <option value="other">Other</option>
          </select>
          <input
            type="number"
            placeholder="±days"
            value={newOffset}
            onChange={(e) => setNewOffset(e.target.value)}
            style={{ width: 100 }}
          />
          <button type="button" onClick={submitTask} disabled={!newTitle.trim() || !targetTripId}>
            Add
          </button>
        </div>
      </section>

      <section className="card">
        {lines.length === 0 ? (
          <p className="muted">No tasks found for this filter.</p>
        ) : (
          <ul className="shop-list">
            {lines.map((line) => (
              <li key={`${line.tripId}:${line.task.id}`} className="shop-row">
                <button
                  type="button"
                  className={line.task.done ? "task-toggle status-packed" : "task-toggle status-missing"}
                  onClick={() => onToggleTask(line.tripId, line.task.id, !line.task.done)}
                  aria-label={line.task.done ? `Mark ${line.task.title} not done` : `Mark ${line.task.title} done`}
                  aria-pressed={line.task.done}
                  title={line.task.done ? "Done" : "Missing"}
                >
                  {line.task.done ? STATUS_GLYPH.packed : STATUS_GLYPH.missing}
                </button>
                <span className="shop-name">
                  <input
                    className="task-title"
                    value={line.task.title}
                    onChange={(e) => onUpdateTask(line.tripId, line.task.id, { title: e.target.value })}
                  />
                  <span className="badge">{categoryLabel(line.task.category)}</span>
                </span>
                <span className="muted shop-trips">{line.tripName}{taskDueLabel(line.task) ? ` · ${taskDueLabel(line.task)}` : ""}</span>
                <div className="task-actions">
                  <select
                    value={line.task.category}
                    onChange={(e) => onUpdateTask(line.tripId, line.task.id, { category: e.target.value as TripTask["category"] })}
                  >
                    <option value="preflight">Preflight</option>
                    <option value="timeline">Tasks</option>
                    <option value="shopping">Shopping</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="number"
                    className="task-offset"
                    value={line.task.dueOffsetDays ?? ""}
                    placeholder="±days"
                    onChange={(e) =>
                      onUpdateTask(line.tripId, line.task.id, {
                        dueOffsetDays: e.target.value === "" ? undefined : Number.parseInt(e.target.value, 10)
                      })
                    }
                  />
                  <DeleteIconButton
                    onClick={() => onDeleteTask(line.tripId, line.task.id)}
                    label={`Delete ${line.task.title}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
