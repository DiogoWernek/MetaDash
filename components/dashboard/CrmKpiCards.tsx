"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface CrmKpi {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

interface CrmKpiCardsProps {
  kpis: CrmKpi[];
  loading?: boolean;
  cols?: 2 | 3 | 4;
}

export function CrmKpiCards({ kpis, loading, cols = 3 }: CrmKpiCardsProps) {
  const gridCols = cols === 2 ? "sm:grid-cols-2" : cols === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3";

  if (loading) {
    return (
      <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
        {Array.from({ length: cols }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="font-mono text-2xl font-bold tracking-tight">{kpi.value}</p>
              {kpi.sub && <p className="mt-1 text-[11px] text-muted-foreground">{kpi.sub}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
