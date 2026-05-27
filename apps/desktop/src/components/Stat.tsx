interface Props {
  label: string;
  value: number;
  tone: "ok" | "warn" | "bad" | "neutral";
}

export function Stat({ label, value, tone }: Props): JSX.Element {
  return (
    <div className={`stat stat-${tone}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
