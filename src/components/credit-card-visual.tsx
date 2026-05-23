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

// Clean credit card — usa estritamente a cor escolhida pelo usuário.
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
  const baseColor = color || "#1a1a1a";

  return (
    <div
      className={`relative overflow-hidden text-white shadow-sm ${compact ? "rounded-lg" : "rounded-xl"} ${className}`}
      style={{
        aspectRatio: "1.586 / 1",
        backgroundColor: baseColor,
        width: compact ? 210 : undefined,
      }}
    >
      <div className={`relative h-full flex flex-col justify-between ${compact ? "p-3" : "p-5"}`}>
        {/* Top: name + brand */}
        <div className="flex items-start justify-between gap-1.5">
          <p
            className={`uppercase font-medium truncate text-white/85 ${compact ? "text-[8px] tracking-wider" : "text-[10px] tracking-[0.2em]"}`}
          >
            {name}
          </p>
          <CardBrandLogo brand={brand} className={`w-auto shrink-2 ${compact ? "h-3" : "h-6"}`} />
        </div>

        {/* Middle: chip + digits */}
        <div className={compact ? "space-y-1" : "space-y-3"}>
          <div
            className={`rounded bg-gradient-to-br from-yellow-200 to-yellow-600/80 ${compact ? "h-3 w-5" : "h-6 w-8"}`}
            aria-hidden
          />
          <p
            className={`font-mono whitespace-nowrap text-white/95 ${compact ? "text-[10px] tracking-wider" : "text-[15px] tracking-[0.18em]"}`}
          >
            •••• {masked}
          </p>
        </div>

        {/* Bottom: holder */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`uppercase text-white/50 ${compact ? "text-[6px] tracking-wider" : "text-[9px] tracking-[0.25em]"}`}>
              Titular
            </p>
            <p
              className={`font-medium uppercase truncate text-white/90 ${compact ? "text-[8px] tracking-wide" : "text-[12px] tracking-[0.12em]"}`}
            >
              {hidden ? "•••••• ••••••" : holder?.trim() || "SEU NOME AQUI"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
