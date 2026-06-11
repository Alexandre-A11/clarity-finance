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

// Widget nativo: usa o mesmo fundo dos painéis do dashboard.
// A cor do usuário aparece apenas como detalhe (borda esquerda + glow sutil).
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
  const accent = color || "#a855f7";

  if (compact) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl shadow-lg shadow-black/40 w-full h-auto aspect-[1.58/1] ${className}`}
        style={{ backgroundColor: accent }}
      >
        {/* Matte: escurece a cor escolhida para combinar com o dark mode */}
        <div className="absolute inset-0 bg-black/45" aria-hidden />

        {/* Textura sutil de metal fosco */}
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_70%)]"
          aria-hidden
        />
        <div className="relative h-full flex flex-col justify-between p-3.5 text-white">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[9px] font-medium uppercase tracking-widest text-white/70 truncate">
              {name}
            </p>
            <CardBrandLogo brand={brand} className="h-3 w-auto opacity-70" />
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-3.5 w-5 rounded-[3px] bg-gradient-to-br from-yellow-200/70 to-yellow-600/50"
              aria-hidden
            />
            <p className="font-mono text-xs tracking-widest text-white/85 tabular">
              •••• {masked}
            </p>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-[9px] uppercase tracking-widest text-white/80 truncate font-medium">
              {hidden ? "•••••• ••••" : holder?.trim() || "TITULAR"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Modo padrão (página de cartões): mantém o estilo de cartão físico.
  return (
    <div
      className={`relative overflow-hidden rounded-xl text-white shadow-sm ${className}`}
      style={{ aspectRatio: "1.586 / 1", backgroundColor: accent }}
    >
      <div className="relative h-full flex flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-1.5">
          <p className="uppercase font-medium truncate text-white/85 text-[10px] tracking-[0.2em]">
            {name}
          </p>
          <CardBrandLogo brand={brand} className="h-6 w-auto" />
        </div>
        <div className="space-y-3">
          <div className="rounded h-6 w-8 bg-gradient-to-br from-yellow-200 to-yellow-600/80" aria-hidden />
          <p className="font-mono whitespace-nowrap text-white/95 text-[15px] tracking-[0.18em]">
            •••• {masked}
          </p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="uppercase text-white/50 text-[9px] tracking-[0.25em]">Titular</p>
            <p className="font-medium uppercase truncate text-white/90 text-[12px] tracking-[0.12em]">
              {hidden ? "•••••• ••••••" : holder?.trim() || "SEU NOME AQUI"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
