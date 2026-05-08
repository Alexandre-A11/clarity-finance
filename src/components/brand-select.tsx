import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const CARD_BRANDS = [
  { value: "Mastercard", emoji: "💳", color: "#eb001b" },
  { value: "Visa", emoji: "💳", color: "#1a1f71" },
  { value: "American Express", emoji: "💳", color: "#2e77bb" },
  { value: "Elo", emoji: "💳", color: "#fff100" },
  { value: "Hipercard", emoji: "💳", color: "#b3131b" },
  { value: "Diners Club", emoji: "💳", color: "#0079be" },
  { value: "Discover", emoji: "💳", color: "#ff6000" },
  { value: "Outro", emoji: "💳", color: "#64748b" },
] as const;

export function BrandSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Selecione a bandeira" /></SelectTrigger>
      <SelectContent>
        {CARD_BRANDS.map((b) => (
          <SelectItem key={b.value} value={b.value}>
            <span className="inline-flex items-center gap-2">
              <span
                className="h-4 w-6 rounded-sm border border-border/60"
                style={{ background: b.color }}
                aria-hidden
              />
              {b.value}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
