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
      className={`card-premium relative w-full overflow-hidden rounded-2xl text-white shadow-2xl ring-1 ring-white/10 ${className}`}
      style={{
        aspectRatio: "1.586 / 1",
        background: `radial-gradient(120% 100% at 0% 0%, ${color}cc 0%, ${color}77 35%, #0a0a0a 75%, #050505 100%)`,
      }}
    >
      {/* subtle texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(140% 90% at 0% 0%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(60% 60% at 100% 100%, rgba(255,255,255,0.06), transparent 60%)",
        }}
      />

      <div className={`relative h-full flex flex-col justify-between ${compact ? "p-3" : "p-5"}`}>
        {/* Top: name + brand */}
        <div className="flex items-start justify-between gap-1.5">
          <p className={`uppercase tracking-widest text-white/70 font-medium truncate ${compact ? "text-[9px]" : "text-[10px]"}`}>
            {name}
          </p>
          <CardBrandLogo brand={brand} className={`w-auto shrink-0 ${compact ? "h-4" : "h-6"}`} />
        </div>

        {/* Middle: chip + digits */}
        <div className={compact ? "space-y-1.5" : "space-y-3"}>
          <div className="flex items-center gap-2">
            <div
              className={`rounded-md border border-yellow-200/40 ${compact ? "h-4 w-6" : "h-7 w-9"}`}
              style={{
                background:
                  "linear-gradient(135deg, #d6b65b 0%, #f3e2a5 50%, #b9892d 100%)",
                boxShadow:
                  "inset 0 0 0 1px rgba(0,0,0,0.18), inset 0 -2px 3px rgba(0,0,0,0.3)",
              }}
              aria-hidden
            />
          </div>
          <p className={`font-mono whitespace-nowrap text-white/95 ${compact ? "text-[10px] tracking-widest" : "text-[15px] tracking-widest"}`}>
            •••• •••• •••• {masked}
          </p>
        </div>

        {/* Bottom: holder + mastercard mark */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`uppercase tracking-widest text-white/50 ${compact ? "text-[7px]" : "text-[9px]"}`}>Titular</p>
            <p className={`font-medium uppercase tracking-wide truncate ${compact ? "text-[9px]" : "text-[12px]"}`}>
              {hidden ? "•••••• ••••••" : holder?.trim() || "SEU NOME AQUI"}
            </p>
          </div>
          {/* subtle mastercard-like mark */}
          <div className="relative shrink-0" aria-hidden>
            <div className={`rounded-full bg-red-500/80 ${compact ? "h-3.5 w-3.5" : "h-5 w-5"}`} />
            <div className={`absolute top-0 -right-2 rounded-full bg-amber-400/70 mix-blend-screen ${compact ? "h-3.5 w-3.5" : "h-5 w-5"}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
