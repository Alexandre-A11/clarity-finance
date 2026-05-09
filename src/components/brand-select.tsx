import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardBrandLogo } from "@/components/card-brand-logo";

export const CARD_BRANDS = [
  { value: "Mastercard" },
  { value: "Visa" },
  { value: "American Express" },
  { value: "Elo" },
  { value: "Hipercard" },
  { value: "Diners Club" },
  { value: "Discover" },
  { value: "Outro" },
] as const;

export function BrandSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Selecione a bandeira" /></SelectTrigger>
      <SelectContent>
        {CARD_BRANDS.map((b) => (
          <SelectItem key={b.value} value={b.value}>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-9 rounded bg-slate-900">
                <CardBrandLogo brand={b.value} className="h-3.5 w-auto" />
              </span>
              {b.value}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
