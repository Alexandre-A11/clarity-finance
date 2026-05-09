// Lightweight inline SVG/text logos for credit card brands.
// We render brand-recognizable marks without using external assets.

type Props = { brand?: string | null; className?: string };

export function CardBrandLogo({ brand, className = "h-6 w-auto" }: Props) {
  const b = (brand ?? "").toLowerCase();

  if (b.includes("visa")) {
    return (
      <svg viewBox="0 0 64 22" className={className} aria-label="Visa">
        <text
          x="0"
          y="18"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="22"
          fill="#ffffff"
          letterSpacing="-1"
        >
          VISA
        </text>
      </svg>
    );
  }

  if (b.includes("master")) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-label="Mastercard">
        <circle cx="18" cy="15" r="12" fill="#eb001b" />
        <circle cx="30" cy="15" r="12" fill="#f79e1b" />
        <path d="M24 6.5a12 12 0 0 1 0 17 12 12 0 0 1 0-17z" fill="#ff5f00" />
      </svg>
    );
  }

  if (b.includes("amex") || b.includes("american")) {
    return (
      <svg viewBox="0 0 64 24" className={className} aria-label="American Express">
        <rect width="64" height="24" rx="3" fill="#2e77bb" />
        <text
          x="32"
          y="16"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="800"
          fontSize="9"
          fill="#ffffff"
          letterSpacing="0.5"
        >
          AMERICAN
        </text>
        <text
          x="32"
          y="22"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="800"
          fontSize="6"
          fill="#ffffff"
          letterSpacing="0.5"
        >
          EXPRESS
        </text>
      </svg>
    );
  }

  if (b.includes("elo")) {
    return (
      <svg viewBox="0 0 48 24" className={className} aria-label="Elo">
        <rect width="48" height="24" rx="4" fill="#000" />
        <circle cx="24" cy="12" r="6" fill="none" stroke="#fff100" strokeWidth="2.5" />
        <circle cx="24" cy="12" r="2.4" fill="#ef4123" />
      </svg>
    );
  }

  if (b.includes("hiper")) {
    return (
      <svg viewBox="0 0 60 22" className={className} aria-label="Hipercard">
        <text
          x="0"
          y="17"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="900"
          fontSize="14"
          fill="#ffffff"
        >
          Hiper
        </text>
        <circle cx="52" cy="11" r="6" fill="#b3131b" stroke="#fff" strokeWidth="1.5" />
      </svg>
    );
  }

  if (b.includes("diners")) {
    return (
      <svg viewBox="0 0 48 24" className={className} aria-label="Diners Club">
        <circle cx="20" cy="12" r="10" fill="#0079be" />
        <circle cx="28" cy="12" r="10" fill="none" stroke="#0079be" strokeWidth="2" />
      </svg>
    );
  }

  if (b.includes("discover")) {
    return (
      <svg viewBox="0 0 64 22" className={className} aria-label="Discover">
        <text
          x="0"
          y="17"
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="800"
          fontSize="14"
          fill="#ffffff"
        >
          DISCOVER
        </text>
        <circle cx="58" cy="13" r="4" fill="#ff6000" />
      </svg>
    );
  }

  // Fallback: pill with initials
  const label = (brand ?? "Card").slice(0, 8);
  return (
    <span className="text-[11px] font-semibold tracking-widest text-white/90 uppercase">
      {label}
    </span>
  );
}
