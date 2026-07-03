"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { ChannelRow } from "@/lib/kommo";

interface KommoChannelBarsProps {
  title: string;
  rows: ChannelRow[];
  loading?: boolean;
  metric: "conversion" | "revenue";
}

export function KommoChannelBars({ title, rows, loading, metric }: KommoChannelBarsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-4 w-40" /></CardHeader>
        <CardContent><div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}</div></CardContent>
      </Card>
    );
  }

  const sorted = [...rows].sort((a, b) =>
    metric === "conversion" ? b.conversionRate - a.conversionRate : b.revenue - a.revenue
  );
  const max = sorted.reduce((m, r) => Math.max(m, metric === "conversion" ? r.conversionRate : r.revenue), 0) || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Sem dados para o período</p>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((row) => {
              const value = metric === "conversion" ? row.conversionRate : row.revenue;
              const barPct = (value / max) * 100;
              return (
                <div key={row.channel}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium truncate max-w-[55%]">{row.channel}</span>
                    <div className="flex items-center gap-2 font-mono text-muted-foreground shrink-0">
                      <span className="text-[10px]">{row.won}/{row.total} matrículas</span>
                      <span className="font-semibold text-foreground">
                        {metric === "conversion" ? `${row.conversionRate.toFixed(1)}%` : formatCurrency(row.revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${metric === "conversion" ? "bg-emerald-500/75" : "bg-cyan-500/75"}`}
                      style={{ width: `${Math.max(barPct, value > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground">{formatNumber(rows.reduce((s, r) => s + r.total, 0))} leads no Comercial no período</p>
      </CardContent>
    </Card>
  );
}
