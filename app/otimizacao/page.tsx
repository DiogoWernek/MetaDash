"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatPercent, normalizeSegment } from "@/lib/utils";
import type { DailyInsight, BreakdownItem, Campaign } from "@/types";

function aggregateBreakdown(
  insights: DailyInsight[],
  field: "breakdown_platform" | "breakdown_device"
): BreakdownItem[] {
  const map = new Map<string, BreakdownItem>();
  for (const insight of insights) {
    for (const item of (insight[field] ?? [])) {
      const seg = normalizeSegment(item.segment);
      const spend = Number(item.spend) || 0;
      const impressions = Number(item.impressions) || 0;
      const clicks = Number(item.clicks) || 0;
      const leads = Number(item.leads) || 0;
      const ex = map.get(seg);
      if (ex) {
        ex.spend += spend;
        ex.impressions += impressions;
        ex.clicks += clicks;
        ex.leads = (ex.leads ?? 0) + leads;
      } else {
        map.set(seg, { ...item, segment: seg, spend, impressions, clicks, leads });
      }
    }
  }
  return Array.from(map.values())
    .filter((r) => r.spend > 0 || (r.impressions ?? 0) > 0)
    .sort((a, b) => b.spend - a.spend);
}

interface BreakdownEfficiencyProps {
  title: string;
  rows: BreakdownItem[];
  loading?: boolean;
}

function BreakdownEfficiency({ title, rows, loading }: BreakdownEfficiencyProps) {
  if (loading) return (
    <Card>
      <CardHeader className="pb-2"><Skeleton className="h-4 w-48" /></CardHeader>
      <CardContent><div className="space-y-2">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div></CardContent>
    </Card>
  );

  const maxSpend = rows.reduce((m, r) => (r.spend > m ? r.spend : m), 0) || 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">Sem dados de segmentação</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const cpl = (r.leads ?? 0) > 0 ? r.spend / (r.leads ?? 1) : null;
              const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
              const barW = Math.min((r.spend / maxSpend) * 100, 100);
              return (
                <div key={r.segment} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium truncate max-w-[40%]">{r.segment}</span>
                    <div className="flex items-center gap-3 font-mono text-muted-foreground shrink-0">
                      <span className="text-foreground">{formatCurrency(r.spend)}</span>
                      <span>{formatPercent(ctr, 1)} CTR</span>
                      {cpl !== null && <span className="text-violet-400">{formatCurrency(cpl)} CPL</span>}
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-meta-blue/70 transition-all duration-500"
                      style={{ width: `${barW}%` }}
                    />
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

// Tabela de segmentação (idade/gênero) exibida dentro do dropdown de cada campanha —
// colunas de largura fixa e alinhadas à direita, igual a tabela externa, pra números
// baterem em coluna (o layout flex antigo deixava cada linha com largura própria).
function BreakdownTable({ rows }: { rows: BreakdownItem[] }) {
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-muted-foreground">
          <th className="pb-1.5 text-left font-medium">Idade / Gênero</th>
          <th className="pb-1.5 pl-3 text-right font-medium whitespace-nowrap">Gasto</th>
          <th className="pb-1.5 pl-3 text-right font-medium whitespace-nowrap">Impressões</th>
          <th className="pb-1.5 pl-3 text-right font-medium whitespace-nowrap">CTR</th>
          <th className="pb-1.5 pl-3 text-right font-medium whitespace-nowrap">CPL</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const cpl = (row.leads ?? 0) > 0 ? row.spend / (row.leads ?? 1) : null;
          return (
            <tr key={row.segment} className="border-t border-border/30">
              <td className="py-1 truncate max-w-[220px]">{row.segment}</td>
              <td className="py-1 pl-3 text-right font-mono tabular-nums text-foreground">{formatCurrency(row.spend)}</td>
              <td className="py-1 pl-3 text-right font-mono tabular-nums text-muted-foreground">{formatNumber(row.impressions)}</td>
              <td className="py-1 pl-3 text-right font-mono tabular-nums text-muted-foreground">{formatPercent(row.ctr, 1)}</td>
              <td className="py-1 pl-3 text-right font-mono tabular-nums text-violet-400">{cpl !== null ? formatCurrency(cpl) : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function OtimizacaoPage() {
  const { insights, campaigns, loadingInsights, loadingCampaigns, currentFilters } = useDashboard();

  const platform = useMemo(() => aggregateBreakdown(insights, "breakdown_platform"), [insights]);
  const device = useMemo(() => aggregateBreakdown(insights, "breakdown_device"), [insights]);

  // Campaign efficiency: rank by CPL (with leads), then CPA
  const campEfficiency = useMemo(() => {
    return campaigns
      .filter((c) => c.spend > 0)
      .map((c) => {
        const leads = c.leads_total ?? 0;
        const cpl = leads > 0 ? c.spend / leads : null;
        const msgConvs = c.messaging_conversations ?? 0;
        const custoConversa = msgConvs > 0 ? c.spend / msgConvs : null;
        return { ...c, _leads: leads, _cpl: cpl, _custoConversa: custoConversa };
      })
      .sort((a, b) => {
        // Sort: active with leads first, then by spend
        const aLeads = (a._leads ?? 0) > 0 ? 1 : 0;
        const bLeads = (b._leads ?? 0) > 0 ? 1 : 0;
        if (aLeads !== bLeads) return bLeads - aLeads;
        return b.spend - a.spend;
      });
  }, [campaigns]);

  // Dropdown de idade/gênero por campanha (item 3.1) — busca sob demanda ao expandir.
  // Chave do cache inclui o período: sem isso, trocar de 7d pra 90d não invalidava os
  // dados já buscados na primeira abertura do dropdown (bug reportado pelo cliente).
  const startDate = currentFilters ? currentFilters.dateRange.from.toISOString().split("T")[0] : null;
  const endDate = currentFilters ? currentFilters.dateRange.to.toISOString().split("T")[0] : null;

  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [breakdownCache, setBreakdownCache] = useState<Record<string, BreakdownItem[]>>({});
  const [loadingBreakdown, setLoadingBreakdown] = useState<Set<string>>(new Set());

  const fetchCampaignBreakdown = useCallback(async (campaignId: string, accountId: string) => {
    if (!startDate || !endDate) return;
    const cacheKey = `${campaignId}|${startDate}|${endDate}`;
    if (breakdownCache[cacheKey] !== undefined) return;
    setLoadingBreakdown((prev) => new Set(prev).add(campaignId));
    try {
      const params = new URLSearchParams({ campaignId, accountId, startDate, endDate });
      const res = await fetch(`/api/campaign-breakdown?${params}`);
      const data = await res.json();
      setBreakdownCache((prev) => ({ ...prev, [cacheKey]: data.rows ?? [] }));
    } catch (err) {
      console.error("[otimizacao] campaign-breakdown error:", err);
      setBreakdownCache((prev) => ({ ...prev, [cacheKey]: [] }));
    } finally {
      setLoadingBreakdown((prev) => { const next = new Set(prev); next.delete(campaignId); return next; });
    }
  }, [breakdownCache, startDate, endDate]);

  function toggleCampaign(campaign: Campaign) {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(campaign.id)) {
        next.delete(campaign.id);
      } else {
        next.add(campaign.id);
        fetchCampaignBreakdown(campaign.id, campaign.account_id);
      }
      return next;
    });
  }

  // Se o período mudar enquanto uma campanha já está expandida, busca de novo pro novo
  // período (o click de expandir só dispara na primeira abertura).
  useEffect(() => {
    if (!startDate || !endDate || expandedCampaigns.size === 0) return;
    for (const campaignId of expandedCampaigns) {
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) fetchCampaignBreakdown(campaign.id, campaign.account_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6">
      <div className="space-y-5">

        {/* Block 1: Campaign efficiency table — clique numa campanha pra ver idade/gênero */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Eficiência por Campanha</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingCampaigns ? (
              <div className="p-4 space-y-2">{[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
            ) : campEfficiency.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados de campanha no período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Campanha</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Gasto</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Leads</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">CPL</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Conversas</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">C/Conversa</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">ROAS</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campEfficiency.map((c) => {
                      const isExpanded = expandedCampaigns.has(c.id);
                      const isLoadingBd = loadingBreakdown.has(c.id);
                      const bdRows = startDate && endDate ? breakdownCache[`${c.id}|${startDate}|${endDate}`] : undefined;
                      return (
                        <Fragment key={c.id}>
                          <tr
                            className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => toggleCampaign(c)}
                          >
                            <td className="px-4 py-2.5 max-w-[260px]">
                              <div className="flex items-start gap-1.5">
                                {isExpanded ? <ChevronDown className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />}
                                <div>
                                  <p className="font-medium truncate" title={c.name}>{c.name}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                                      {c.status === "ACTIVE" ? "Ativa" : "Pausada"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(c.spend)}</td>
                            <td className="px-3 py-2.5 text-right font-mono">{c._leads > 0 ? formatNumber(c._leads) : "—"}</td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {c._cpl !== null ? (
                                <span className={c._cpl < 50 ? "text-success" : c._cpl > 150 ? "text-danger" : ""}>
                                  {formatCurrency(c._cpl)}
                                </span>
                              ) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {(c.messaging_conversations ?? 0) > 0 ? formatNumber(c.messaging_conversations!) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {c._custoConversa !== null ? formatCurrency(c._custoConversa) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {c.roas > 0 ? (
                                <span className={c.roas >= 1 ? "text-success" : "text-danger"}>
                                  {c.roas.toFixed(2)}x
                                </span>
                              ) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">{formatPercent(c.ctr, 2)}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-border/30 bg-muted/10">
                              <td colSpan={8} className="px-4 py-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                  Idade e Gênero — {c.name}
                                </p>
                                {isLoadingBd ? (
                                  <div className="space-y-1.5">{[0,1,2].map((i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
                                ) : !bdRows || bdRows.length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-2">Sem dados de segmentação para esta campanha</p>
                                ) : (
                                  <BreakdownTable rows={bdRows} />
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Block 2: Platform + Device breakdowns */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BreakdownEfficiency title="Eficiência por Plataforma" rows={platform} loading={loadingInsights} />
          <BreakdownEfficiency title="Eficiência por Dispositivo" rows={device} loading={loadingInsights} />
        </div>

      </div>
    </main>
  );
}
