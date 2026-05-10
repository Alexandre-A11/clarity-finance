import { CardBrandLogo } from "@/components/card-brand-logo";

type Props = {
  name: string;
  brand?: string | null;
  color: string;
  holder?: string | null;
  lastFour?: string | null;
  hidden?: boolean;
  className?: string;
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
}: Props) {
  const digits = lastFour && /^\d{4}$/.test(lastFour) ? lastFour : "0000";
  const masked = hidden ? "••••" : digits;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl text-white shadow-lg ${className}`}
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

      <div className="relative h-full p-3.5 flex flex-col justify-between">
        {/* Top: name + brand */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/85 font-medium truncate">
            {name}
          </p>
          <CardBrandLogo brand={brand} className="h-5 w-auto shrink-0" />
        </div>

        {/* Middle: chip + digits */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {/* simulated chip */}
            <div
              className="h-6 w-8 rounded-md border border-yellow-200/40"
              style={{
                background:
                  "linear-gradient(135deg, #d6b65b 0%, #f3e2a5 50%, #b9892d 100%)",
                boxShadow:
                  "inset 0 0 0 1px rgba(0,0,0,0.15), inset 0 -2px 3px rgba(0,0,0,0.25)",
              }}
              aria-hidden
            >
              <div className="grid grid-cols-3 grid-rows-3 gap-px h-full w-full p-0.5 opacity-60">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="bg-yellow-900/40 rounded-[1px]" />
                ))}
              </div>
            </div>
            {/* contactless icon */}
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 7.5a10 10 0 0 1 0 9" />
              <path d="M9 9.5a6 6 0 0 1 0 5" />
              <path d="M13 11.5a2 2 0 0 1 0 1" />
            </svg>
          </div>
          <p className="font-mono text-[13px] tracking-[0.12em] tabular whitespace-nowrap">
            •••• •••• •••• {masked}
          </p>
        </div>

        {/* Bottom: holder */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[8px] uppercase tracking-[0.18em] text-white/60">Titular</p>
            <p className="text-[12px] font-medium uppercase tracking-wide truncate">
              {hidden ? "•••••• ••••••" : holder?.trim() || "SEU NOME AQUI"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
