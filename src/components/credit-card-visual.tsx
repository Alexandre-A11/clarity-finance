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


// Premium credit card — brushed metal + smoked glass (ISO 7810 ID-1, 1.586:1)
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

  // Cor escolhida pelo usuário como base sólida — overlays adicionam o premium.
  const baseColor = color || "#1a1a1a";

  // Brushed metal stripes (very fine vertical lines)
  const brushed = `repeating-linear-gradient(
    90deg,
    rgba(255,255,255,0.05) 0px,
    rgba(255,255,255,0.05) 1px,
    rgba(0,0,0,0.06) 1px,
    rgba(0,0,0,0.06) 2px
  )`;

  // Micro dot texture for material grain
  const grain = `radial-gradient(rgba(255,255,255,0.05) 0.5px, transparent 0.5px)`;

  return (
    <div
      className={`card-premium relative w-full overflow-hidden rounded-2xl text-white shadow-[0_25px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10 ${className}`}
      style={{
        aspectRatio: "1.586 / 1",
        backgroundColor: baseColor,
      }}
    >
      {/* Reflexo de luz superior esquerdo (mantém a cor escolhida visível) */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.18), transparent 60%)",
        }}
        aria-hidden
      />

      {/* Brushed metal layer */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
        style={{ backgroundImage: brushed }}
        aria-hidden
      />

      {/* Fine grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: grain, backgroundSize: "3px 3px" }}
        aria-hidden
      />

      {/* Vinheta inferior para profundidade */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 120%, rgba(0,0,0,0.45), transparent 60%)",
        }}
        aria-hidden
      />

      {/* Inner border highlight — metallic rim */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
        aria-hidden
      />


      <div className={`relative h-full flex flex-col justify-between ${compact ? "p-3" : "p-5"}`}>
        {/* Top: name + brand */}
        <div className="flex items-start justify-between gap-1.5">
          <p
            className={`uppercase tracking-[0.2em] text-white/80 font-medium truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] ${compact ? "text-[9px]" : "text-[10px]"}`}
          >
            {name}
          </p>
          <div className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
            <CardBrandLogo brand={brand} className={`w-auto shrink-0 ${compact ? "h-4" : "h-6"}`} />
          </div>
        </div>

        {/* Middle: chip + digits */}
        <div className={compact ? "space-y-1.5" : "space-y-3"}>
          <div className="flex items-center gap-2">
            <div
              className={`relative rounded-md ${compact ? "h-4 w-6" : "h-7 w-9"}`}
              style={{
                background:
                  "linear-gradient(135deg, #f3e2a5 0%, #d6b65b 40%, #8a6418 100%)",
                boxShadow:
                  "inset 0 0 0 1px rgba(0,0,0,0.35), inset 0 -2px 3px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.6)",
              }}
              aria-hidden
            >
              {/* Chip contact lines */}
              <div
                className="absolute inset-1 rounded-sm"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0 1px, transparent 1px 3px)",
                  opacity: 0.6,
                }}
              />
            </div>
          </div>
          <p
            className={`font-mono whitespace-nowrap text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)] ${compact ? "text-[10px] tracking-widest" : "text-[15px] tracking-[0.18em]"}`}
          >
            •••• •••• •••• {masked}
          </p>
        </div>

        {/* Bottom: holder + brand mark */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className={`uppercase tracking-[0.25em] text-white/55 ${compact ? "text-[7px]" : "text-[9px]"}`}
            >
              Titular
            </p>
            <p
              className={`font-medium uppercase tracking-[0.12em] truncate text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)] ${compact ? "text-[9px]" : "text-[12px]"}`}
            >
              {hidden ? "•••••• ••••••" : holder?.trim() || "SEU NOME AQUI"}
            </p>
          </div>
          {/* Mastercard-like dual ring */}
          <div className="relative shrink-0" aria-hidden>
            <div
              className={`rounded-full ${compact ? "h-3.5 w-3.5" : "h-5 w-5"}`}
              style={{
                background: "radial-gradient(circle at 30% 30%, #ff6b6b, #c8102e 70%)",
                boxShadow: "inset 0 0 4px rgba(0,0,0,0.4)",
              }}
            />
            <div
              className={`absolute top-0 -right-2 rounded-full mix-blend-screen ${compact ? "h-3.5 w-3.5" : "h-5 w-5"}`}
              style={{
                background: "radial-gradient(circle at 30% 30%, #ffd86b, #e89c1a 70%)",
                boxShadow: "inset 0 0 4px rgba(0,0,0,0.4)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
