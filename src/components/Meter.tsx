type Props = { value: number; label: string };

/** A progress bar in 0..1. */
export function Meter({ value, label }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
