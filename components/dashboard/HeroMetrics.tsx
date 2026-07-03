"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign, Users, Wallet, Info, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatNumber, formatVariation } from "@/lib/utils";
import type { DailyInsight } from "@/types";
import type { AccountBalance } from "@/app/api/balance/route";

const LOW_BALANCE_THRESHOLD = 100;
const LOW_BALANCE_ACCOUNT_NAME = "BM Saúde";

interface CardDef {
  label: string;
  tooltip?: string;
  value: string;
  prev: number;
  curr: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  higherIsBetter: boolean;
}

interface HeroMetricsProps {
  insights: DailyInsight[];
  previousInsights: DailyInsight[];
  loading?: boolean;
  balances?: AccountBalance[];
  balancesLoading?: boolean;
}

function sumInsights(insights: DailyInsight[]) {
  return {
    spend: insights.reduce((s, i) => s + i.spend, 0),
    leads: insights.reduce((s, i) => s + (i.leads ?? 0), 0),
    revenue: insights.reduce((s, i) => s + (i.revenue ?? 0), 0),
  };
}

export function HeroMetrics({ insights, previousInsights, loading, balances = [], balancesLoading }: HeroMetricsProps) {
  const current = useMemo(() => sumInsights(insights), [insights]);
  const previous = useMemo(() => sumInsights(previousInsights), [previousInsights]);
  const lowBalanceAccounts = useMemo(
    () => balances.filter((b) => b.name === LOW_BALANCE_ACCOUNT_NAME && b.is_prepay && b.value < LOW_BALANCE_THRESHOLD),
    [balances]
  );

  const cardCount = 2 + balances.length;
  const gridCols = cardCount >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3";

  if (loading) {
    return (
      <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
        {Array.from({ length: Math.max(cardCount, 3) }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-28 mb-4" />
              <Skeleton className="h-10 w-40 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const balanceCards: CardDef[] = balances.map((b) => ({
    label: b.is_prepay ? `Saldo — ${b.name}` : `Saldo — ${b.name}`,
    tooltip: b.is_prepay
      ? "Estimativa do saldo pré-pago disponível (a Meta não expõe esse valor de forma exata via API — pode divergir alguns % do Gerenciador de Pagamentos). Buscado em tempo real."
      : "Valor já gasto desde a última cobrança, que será debitado do cartão/boleto cadastrado. Buscado em tempo real.",
    value: balancesLoading ? "…" : formatCurrency(b.value),
    prev: 0,
    curr: b.value,
    icon: Wallet,
    color: b.is_prepay && b.value < LOW_BALANCE_THRESHOLD ? "text-danger" : b.is_prepay ? "text-emerald-500" : "text-amber-500",
    bg: b.is_prepay && b.value < LOW_BALANCE_THRESHOLD ? "bg-danger/10" : b.is_prepay ? "bg-emerald-500/10" : "bg-amber-500/10",
    higherIsBetter: b.is_prepay,
  }));

  const cards: CardDef[] = [
    {
      label: "Valor Gasto",
      value: formatCurrency(current.spend),
      prev: previous.spend,
      curr: current.spend,
      icon: DollarSign,
      color: "text-meta-blue",
      bg: "bg-meta-blue/10",
      higherIsBetter: false,
    },
    {
      label: "Leads",
      value: formatNumber(current.leads),
      prev: previous.leads,
      curr: current.leads,
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      higherIsBetter: true,
    },
    ...balanceCards,
  ];

  return (
    <div className="space-y-3">
      {lowBalanceAccounts.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Saldo baixo em <strong>{LOW_BALANCE_ACCOUNT_NAME}</strong>: {formatCurrency(lowBalanceAccounts[0].value)} disponível
            (abaixo de {formatCurrency(LOW_BALANCE_THRESHOLD)}). Recarregue para evitar pausa nos anúncios.
          </span>
        </div>
      )}
      <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
      {cards.map((card) => {
        const variation = formatVariation(card.curr, card.prev);
        const isPositive = card.higherIsBetter ? variation.positive : !variation.positive;
        const Icon = card.icon;
        return (
          <Card key={card.label} className="overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                  {card.tooltip && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64">
                          <p>{card.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${card.color}`} />
                </div>
              </div>
              <p className="font-mono text-3xl font-bold tracking-tight">{card.value}</p>
              {variation.value !== "—" ? (
                <div className="mt-2 flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-danger" />
                  )}
                  <span className={`text-sm font-medium ${isPositive ? "text-success" : "text-danger"}`}>
                    {variation.value}
                  </span>
                  <span className="text-xs text-muted-foreground">vs período anterior</span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Sem período anterior</p>
              )}
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}
