import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseLocalDate, toLocalISODate } from "@/lib/finance";

type Props = {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
  allowClear?: boolean;
  /** Earliest year for the year dropdown (default: current year - 10) */
  fromYear?: number;
  /** Latest year for the year dropdown (default: current year + 5) */
  toYear?: number;
};

/**
 * DatePicker (pt-BR / dd-MM-yyyy) with month & year dropdowns inside the
 * popover so users can jump years/months without spamming the chevrons.
 * Reads/writes ISO local-date strings ("YYYY-MM-DD").
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Selecionar data",
  className,
  disabled,
  fromDate,
  toDate,
  allowClear,
  fromYear,
  toYear,
}: Props) {
  const date = parseLocalDate(value) ?? undefined;
  const currentYear = new Date().getFullYear();
  const startYear = fromYear ?? currentYear - 10;
  const endYear = toYear ?? currentYear + 5;
  const [month, setMonth] = useState<Date>(date ?? new Date());

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
          {date ? (
            format(date, "dd/MM/yyyy", { locale: ptBR })
          ) : (
            <span>{placeholder}</span>
          )}
          {allowClear && date ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              limpar
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={date}
          month={month}
          onMonthChange={setMonth}
          captionLayout="dropdown"
          fromYear={startYear}
          toYear={endYear}
          onSelect={(d) => {
            if (d) onChange(toLocalISODate(d));
          }}
          fromDate={fromDate}
          toDate={toDate}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
