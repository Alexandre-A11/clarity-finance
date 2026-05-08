import { cn } from "@/lib/utils";
import {
  Utensils, Home, Wifi, CreditCard, Car, Gamepad2, Heart, MoreHorizontal,
  Briefcase, Laptop, TrendingUp, ShoppingCart, Plane, Book, Coffee, Gift,
  Dumbbell, Music, Smartphone, Zap, Droplet, Bus, GraduationCap, PawPrint,
  Shirt, Stethoscope, Wrench, PiggyBank, DollarSign, Receipt,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils, home: Home, wifi: Wifi, "credit-card": CreditCard, car: Car,
  "gamepad-2": Gamepad2, heart: Heart, "more-horizontal": MoreHorizontal,
  briefcase: Briefcase, laptop: Laptop, "trending-up": TrendingUp,
  "shopping-cart": ShoppingCart, plane: Plane, book: Book, coffee: Coffee,
  gift: Gift, dumbbell: Dumbbell, music: Music, smartphone: Smartphone,
  zap: Zap, droplet: Droplet, bus: Bus, "graduation-cap": GraduationCap,
  "paw-print": PawPrint, shirt: Shirt, stethoscope: Stethoscope, wrench: Wrench,
  "piggy-bank": PiggyBank, "dollar-sign": DollarSign, receipt: Receipt,
};

export const ICON_KEYS = Object.keys(ICON_MAP);

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICON_MAP[name]) || MoreHorizontal;
  return <Icon className={className} />;
}

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5 max-h-44 overflow-y-auto p-1">
      {ICON_KEYS.map((k) => {
        const Icon = ICON_MAP[k];
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={cn(
              "h-8 w-8 rounded-md flex items-center justify-center border transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-muted border-border"
            )}
            aria-label={k}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
