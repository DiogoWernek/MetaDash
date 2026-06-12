"use client";

import { useState, useEffect } from "react";
import { CalendarIcon, ChevronDown, RefreshCw, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeToggle } from "./ThemeToggle";
import { cn, getDateRange, dateToString } from "@/lib/utils";
import type { BusinessManager, AdAccount, FilterState, DateRange } from "@/types";

interface HeaderProps {
  businessManagers: BusinessManager[];
  adAccounts: AdAccount[];
  onFilterChange: (filters: FilterState) => void;
  loading?: boolean;
  onSyncClick?: () => void;
  isSyncing?: boolean;
}

const DATE_PRESETS = [
  { label: "Hoje", value: "today" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
] as const;

const ALL_BMS = "__all__";

export function Header({
  businessManagers,
  adAccounts,
  onFilterChange,
  loading,
  onSyncClick,
  isSyncing,
}: HeaderProps) {
  const [selectedBmId, setSelectedBmId] = useState<string>(ALL_BMS);
  const [activePreset, setActivePreset] = useState<string>("30d");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange("30d"));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [bmDropdownOpen, setBmDropdownOpen] = useState(false);

  // Accounts that belong to the selected BM (or all accounts if "Todas")
  const activeAccountIds = selectedBmId === ALL_BMS
    ? adAccounts.map((a) => a.id)
    : adAccounts.filter((a) => a.bm_id === selectedBmId).map((a) => a.id);

  // Fire filter change whenever BM selection or date changes
  useEffect(() => {
    if (activeAccountIds.length > 0) {
      onFilterChange({ selectedBmId, selectedAccountIds: activeAccountIds, dateRange });
    }
  }, [selectedBmId, dateRange, adAccounts.length, onFilterChange]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleBmSelect(bmId: string) {
    setSelectedBmId(bmId);
    setBmDropdownOpen(false);
  }

  function handlePreset(preset: string) {
    setActivePreset(preset);
    setDateRange(getDateRange(preset));
  }

  function handleCalendarSelect(range: { from?: Date; to?: Date } | undefined) {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
      setActivePreset("custom");
      setCalendarOpen(false);
    } else if (range?.from) {
      setDateRange({ from: range.from, to: range.from });
    }
  }

  const selectedBm = businessManagers.find((bm) => bm.id === selectedBmId);
  const bmLabel = selectedBmId === ALL_BMS ? "Todas as BMs" : (selectedBm?.name ?? "Business Manager");

  const dateLabel =
    activePreset !== "custom"
      ? DATE_PRESETS.find((p) => p.value === activePreset)?.label
      : `${format(dateRange.from, "dd/MM/yy", { locale: ptBR })} – ${format(dateRange.to, "dd/MM/yy", { locale: ptBR })}`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-meta-blue">
              <span className="text-xs font-bold text-white">N</span>
            </div>
            <span className="text-base font-bold tracking-tight">NaviDash</span>
          </div>

          {/* Filters */}
          <div className="flex flex-1 items-center justify-center gap-2 overflow-x-auto">
            {/* BM Selector */}
            <Popover open={bmDropdownOpen} onOpenChange={setBmDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium min-w-0 max-w-[200px]"
                  disabled={loading}
                >
                  <span className="truncate">{bmLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1" align="start">
                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Business Manager
                </p>

                {/* Todas as BMs */}
                <button
                  onClick={() => handleBmSelect(ALL_BMS)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                    selectedBmId === ALL_BMS && "text-meta-blue font-medium"
                  )}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-meta-blue shrink-0" />
                  <span className="flex-1 text-left">Todas as BMs</span>
                  {selectedBmId === ALL_BMS && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>

                <div className="my-1 border-t border-border/50" />

                {businessManagers.map((bm) => (
                  <button
                    key={bm.id}
                    onClick={() => handleBmSelect(bm.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                      selectedBmId === bm.id && "text-meta-blue font-medium"
                    )}
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                    <span className="flex-1 text-left truncate">{bm.name}</span>
                    {selectedBmId === bm.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}

                {/* Account count hint */}
                <p className="px-2 pt-2 pb-1 text-[10px] text-muted-foreground">
                  {activeAccountIds.length} conta{activeAccountIds.length !== 1 ? "s" : ""} ativa{activeAccountIds.length !== 1 ? "s" : ""}
                </p>
              </PopoverContent>
            </Popover>

            {/* Date Presets */}
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePreset(preset.value)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-all",
                    activePreset === preset.value
                      ? "bg-meta-blue text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={activePreset === "custom" ? "meta" : "outline"}
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {activePreset === "custom" ? dateLabel : "Período"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={handleCalendarSelect}
                  disabled={(date) => date > new Date()}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 shrink-0">
            {onSyncClick && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSyncClick}
                disabled={isSyncing}
                className="h-9 w-9"
                title="Sincronizar dados"
              >
                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
