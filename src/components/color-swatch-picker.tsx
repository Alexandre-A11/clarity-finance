import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export const SWATCH_COLORS = [
  "#0f172a", "#3b82f6", "#0ea5e9", "#06b6d4", "#14b8a6",
  "#22c55e", "#84cc16", "#eab308", "#f59e0b", "#f97316",
  "#ef4444", "#ec4899", "#a855f7", "#8b5cf6", "#6366f1",
  "#64748b",
];

export function ColorSwatchPicker({
  value,
  onChange,
  colors = SWATCH_COLORS,
}: {
  value: string;
  onChange: (c: string) => void;
  colors?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => {
        const active = value?.toLowerCase() === c.toLowerCase();
        return (
          <button
            type="button"
            key={c}
            onClick={() => onChange(c)}
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center transition-transform",
              "ring-offset-2 ring-offset-background hover:scale-110",
              active && "ring-2 ring-foreground"
            )}
            style={{ background: c }}
            aria-label={`Selecionar cor ${c}`}
          >
            {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
          </button>
        );
      })}
    </div>
  );
}
