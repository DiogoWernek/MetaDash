"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { useBalance } from "@/lib/use-balance";
import { HeroMetrics } from "@/components/dashboard/HeroMetrics";
import { AlertaCritico } from "@/components/dashboard/AlertaCritico";
import { PerformancePorPeriodo } from "@/components/dashboard/PerformancePorPeriodo";
import { EficienciaPorCampanha } from "@/components/dashboard/EficienciaPorCampanha";
import { JornadaFunil } from "@/components/dashboard/JornadaFunil";
import { RetencoEtapa } from "@/components/dashboard/RetencoEtapa";
import { EficienciaResumo } from "@/components/dashboard/EficienciaResumo";
import { ProximoPasso } from "@/components/dashboard/ProximoPasso";

export default function VisaoGeralPage() {
  const {
    insights,
    previousInsights,
    campaigns,
    loadingInsights,
    loadingCampaigns,
    currentFilters,
  } = useDashboard();
  const { balances, loading: loadingBalances } = useBalance();

  const loading = loadingInsights;

  // Só mostra o(s) card(s) de saldo da(s) conta(s) atualmente selecionada(s) no filtro
  // (BM Saúde sozinha, BM Engenharia sozinha, ou as 2 quando "Todas as Contas" está ativo).
  const visibleBalances = currentFilters
    ? balances.filter((b) => currentFilters.selectedAccountIds.includes(b.account_id))
    : balances;

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6">
      <div className="space-y-5">
        {/* Hero metrics: Gasto / Leads / Saldo da Conta */}
        <HeroMetrics
          insights={insights}
          previousInsights={previousInsights}
          loading={loading}
          balances={visibleBalances}
          balancesLoading={loadingBalances}
        />

        {/* Alert banner */}
        <AlertaCritico
          insights={insights}
          previousInsights={previousInsights}
          balances={visibleBalances}
          loading={loading}
        />

        {/* Daily performance bar chart */}
        <PerformancePorPeriodo insights={insights} loading={loading} />

        {/* Mid-row: funnel + top 5 CPL */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <JornadaFunil insights={insights} loading={loading} />
          <EficienciaPorCampanha campaigns={campaigns} loading={loadingCampaigns} />
        </div>

        {/* Video retention block */}
        <RetencoEtapa insights={insights} loading={loading} />

        {/* Efficiency summary */}
        <EficienciaResumo insights={insights} loading={loading} />

        {/* Navigation suggestion cards */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Explorar seções</p>
          <ProximoPasso />
        </div>
      </div>
    </main>
  );
}
