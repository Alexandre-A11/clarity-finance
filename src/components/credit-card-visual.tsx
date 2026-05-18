import { CardBrandLogo } from "@/components/card-brand-logo";

type Props = {
  name: string;
  brand?: string | null;
  color: string;
  holder?: string | null;
  lastFour?: string | null;
  hidden?: boolean;
  className?: string;
  compact?: boolean;
};

// Realistic credit card visual (ISO 7810 ID-1 ratio = 1.586:1).
export function CreditCardVisual({
  name,
  brand,
  color,
  holder,
  lastFour,
  hidden = false,
  className = "",
  compact = false,
}: Props) {
  const digits = lastFour && /^\d{4}$/.test(lastFour) ? lastFour : "0000";
  const masked = hidden ? "••••" : digits;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl text-white shadow-md ${className}`}
      style={{
        aspectRatio: "1.586 / 1",
        background: `linear-gradient(135deg, ${color} 0%, ${color}d9 55%, #00000055 100%)`,
      }}
    >
      {/* shine */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.25), transparent 55%), radial-gradient(60% 60% at 100% 100%, rgba(255,255,255,0.1), transparent 60%)",
        }}
      />

      <div className={`relative h-full flex flex-col justify-between ${compact ? "p-2" : "p-3.5"}`}>
        {/* Top: name + brand */}
        <div className="flex items-start justify-between gap-1.5">
          <p className={`uppercase tracking-[0.16em] text-white/85 font-medium truncate ${compact ? "text-[8px]" : "text-[10px]"}`}>
            {name}
          </p>
          <CardBrandLogo brand={brand} className={`w-auto shrink-0 ${compact ? "h-3" : "h-5"}`} />
        </div>

        {/* Middle: chip + digits */}
        <div className={compact ? "space-y-1" : "space-y-2"}>
          <div className="flex items-center gap-1.5">
            {/* simulated chip */}
            <div
              className={`rounded-md border border-yellow-200/40 ${compact ? "h-3.5 w-5" : "h-6 w-8"}`}
              style={{
                background:
                  "linear-gradient(135deg, #d6b65b 0%, #f3e2a5 50%, #b9892d 100%)",
                boxShadow:
                  "inset 0 0 0 1px rgba(0,0,0,0.15), inset 0 -2px 3px rgba(0,0,0,0.25)",
              }}
              aria-hidden
            />
            {!compact && (
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 7.5a10 10 0 0 1 0 9" />
                <path d="M9 9.5a6 6 0 0 1 0 5" />
                <path d="M13 11.5a2 2 0 0 1 0 1" />
              </svg>
            )}
          </div>
          <p className={`font-mono tabular whitespace-nowrap ${compact ? "text-[9px] tracking-[0.06em]" : "text-[13px] tracking-[0.12em]"}`}>
            •••• •••• •••• {masked}
          </p>
        </div>

        {/* Bottom: holder */}
        <div className="flex items-end justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <p className={`uppercase tracking-[0.16em] text-white/60 ${compact ? "text-[6px]" : "text-[8px]"}`}>Titular</p>
            <p className={`font-medium uppercase tracking-wide truncate ${compact ? "text-[8px]" : "text-[12px]"}`}>
              {hidden ? "•••••• ••••••" : holder?.trim() || "SEU NOME AQUI"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
