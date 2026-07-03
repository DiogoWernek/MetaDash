"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import type { CountRow } from "@/lib/kommo";

interface KommoBarListProps {
  title: string;
  rows: CountRow[];
  loading?: boolean;
  colorClass?: string;
  maxRows?: number;
}

const DEFAULT_COLOR = "bg-meta-blue/75";

export function KommoBarList({ title, rows, loading, colorClass = DEFAULT_COLOR, maxRows = 8 }: KommoBarListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-4 w-40" /></CardHeader>
        <CardContent><div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}</div></CardContent>
      </Card>
    );
  }

  const visible = rows.slice(0, maxRows);
  const max = visible.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Sem dados para o período</p>
        ) : (
          <div className="space-y-2.5">
            {visible.map((row) => {
              const pct = total > 0 ? (row.count / total) * 100 : 0;
              const barPct = (row.count / max) * 100;
              return (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium truncate max-w-[65%]">{row.label}</span>
                    <div className="flex items-center gap-2 font-mono text-muted-foreground shrink-0">
                      <span className="text-[10px]">{pct.toFixed(1)}%</span>
                      <span className="font-semibold text-foreground">{formatNumber(row.count)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${Math.max(barPct, row.count > 0 ? 2 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
