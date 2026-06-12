"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { DashboardLineChart } from "@/components/dashboard/LineChart";
import { DashboardBarChart } from "@/components/dashboard/BarChart";
import { BreakdownTable } from "@/components/dashboard/BreakdownTable";
import { CampaignsTable } from "@/components/dashboard/CampaignsTable";
import type { BusinessManager, AdAccount, DailyInsight, Campaign, FilterState } from "@/types";
import { dateToString } from "@/lib/utils";

export default function DashboardPage() {
  const [businessManagers, setBusinessManagers] = useState<BusinessManager[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [insights, setInsights] = useState<DailyInsight[]>([]);
  const [previousInsights, setPreviousInsights] = useState<DailyInsight[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch("/api/accounts");
        const data = await res.json();
        console.log("[page] Contas:", { bms: data.businessManagers?.length, accounts: data.adAccounts?.length });
        setBusinessManagers(data.businessManagers ?? []);
        setAdAccounts(data.adAccounts ?? []);
      } catch (err) {
        console.error("[page] Erro ao carregar contas:", err);
      } finally {
        setLoadingAccounts(false);
      }
    }
    loadAccounts();
  }, []);

  const handleFilterChange = useCallback(async (filters: FilterState) => {
    setCurrentFilters(filters);

    if (filters.selectedAccountIds.length === 0) return;

    const params = new URLSearchParams({
      accountIds: filters.selectedAccountIds.join(","),
      startDate: dateToString(filters.dateRange.from),
      endDate: dateToString(filters.dateRange.to),
    });

    // Load insights and campaigns in parallel, with independent loading states
    setLoadingInsights(true);
    setLoadingCampaigns(true);
    setCampaigns([]);

    const [insightsRes, campaignsRes] = await Promise.allSettled([
      fetch(`/api/insights?${params}`).then((r) => r.json()),
      fetch(`/api/campaigns?${params}`).then((r) => r.json()),
    ]);

    if (insightsRes.status === "fulfilled") {
      const data = insightsRes.value;
      setInsights(data.insights ?? []);
      setPreviousInsights(data.previousInsights ?? []);
    } else {
      console.error("[page] Insights error:", insightsRes.reason);
    }
    setLoadingInsights(false);

    if (campaignsRes.status === "fulfilled") {
      setCampaigns(campaignsRes.value.campaigns ?? []);
    } else {
      console.error("[page] Campaigns error:", campaignsRes.reason);
    }
    setLoadingCampaigns(false);
  }, []);

  async function handleSync() {
    setIsSyncing(true);
    try {
      await fetch("/api/meta/sync", {
        method: "POST",
        headers: { "x-sync-secret": process.env.NEXT_PUBLIC_SYNC_SECRET ?? "" },
      });
      if (currentFilters) await handleFilterChange(currentFilters);
    } catch (err) {
      console.error("Erro ao sincronizar:", err);
    } finally {
      setIsSyncing(false);
    }
  }

  const selectedAccounts = adAccounts.filter((a) =>
    currentFilters?.selectedAccountIds.includes(a.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header
        businessManagers={businessManagers}
        adAccounts={adAccounts}
        onFilterChange={handleFilterChange}
        loading={loadingAccounts}
        onSyncClick={handleSync}
        isSyncing={isSyncing}
      />

      <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6">
        <div className="space-y-6">
          <KpiCards
            insights={insights}
            previousInsights={previousInsights}
            loading={loadingInsights}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DashboardLineChart
                insights={insights}
                accounts={selectedAccounts}
                loading={loadingInsights}
              />
            </div>
            <div>
              <DashboardBarChart
                insights={insights}
                accounts={selectedAccounts}
                loading={loadingInsights}
              />
            </div>
          </div>

          <BreakdownTable insights={insights} loading={loadingInsights} />

          <CampaignsTable
            campaigns={campaigns}
            loading={loadingCampaigns}
            currentFilters={currentFilters}
          />
        </div>
      </main>
    </div>
  );
}
