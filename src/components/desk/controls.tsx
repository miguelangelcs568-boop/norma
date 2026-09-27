import type { ButtonHTMLAttributes } from "react";

type Tone = "ink" | "ghost" | "accent";

const TONE: Record<Tone, string> = {
  ink: "bg-ink text-sheet shadow-sm",
  ghost: "border border-line bg-sheet text-ink shadow-sm",
  accent: "bg-accent text-on-accent shadow-sm",
};

export function Button({
  tone = "ghost",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium tracking-tight transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${TONE[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  value,
  min,
  max,
  step,
  unit,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const shown = Number.isInteger(step) ? Math.round(value).toString() : value.toFixed(step < 0.1 ? 2 : 1);
  return (
    <label className="block py-1">
      <span className="flex items-baseline justify-between gap-3 text-[12px]">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-ink">
          {shown}
          {unit ? ` ${unit}` : ""}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 disabled:opacity-40"
      />
    </label>
  );
}
