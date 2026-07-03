"use client";

import { Target, Users, TrendingUp, Award, Calendar, GraduationCap } from "lucide-react";
import { useKommo } from "@/lib/use-kommo";
import { CrmKpiCards, type CrmKpi } from "@/components/dashboard/CrmKpiCards";
import { KommoBarList } from "@/components/dashboard/KommoBarList";
import { KommoChannelBars } from "@/components/dashboard/KommoChannelBars";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function CrmPage() {
  const { data, loading, error } = useKommo();

  const painelGeralKpis: CrmKpi[] = [
    {
      label: "Leads Gerados (Triagem)",
      value: data ? formatNumber(data.totalLeadsGerados) : "—",
      sub: "Denominador do CPL",
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Matrículas (Comercial)",
      value: data ? formatNumber(data.totalMatriculas) : "—",
      sub: "Denominador do CPA",
      icon: GraduationCap,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      label: "CPL (Custo por Lead)",
      value: data && data.cpl > 0 ? formatCurrency(data.cpl) : "—",
      sub: "Investimento Meta ÷ leads gerados (Triagem)",
      icon: Target,
      color: "text-meta-blue",
      bg: "bg-meta-blue/10",
    },
    {
      label: "CPA (Custo por Matrícula)",
      value: data && data.cpa > 0 ? formatCurrency(data.cpa) : "—",
      sub: "Investimento Meta ÷ matrículas (Comercial)",
      icon: Award,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  const aquisicaoKpis: CrmKpi[] = data ? [
    {
      label: "Total de Leads",
      value: formatNumber(data.aquisicao.totalLeads),
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Média por Dia",
      value: data.aquisicao.avgPerDay.toFixed(1),
      icon: Calendar,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Maior Origem",
      value: data.aquisicao.topSource,
      icon: TrendingUp,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
  ] : [];

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6">
      <div className="space-y-8">
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
            Erro ao carregar dados do Kommo: {error}
          </div>
        )}

        {/* Painel Geral — CPA/CPL */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Painel Geral</h2>
          <CrmKpiCards kpis={painelGeralKpis} loading={loading} cols={4} />
        </section>

        {/* Aquisição — Kommo / Funil de Triagem */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide">Aquisição</h2>
            <p className="text-xs text-muted-foreground">Kommo · Funil de Triagem</p>
          </div>
          <CrmKpiCards kpis={aquisicaoKpis} loading={loading} cols={3} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <KommoBarList title="Leads por Origem" rows={data?.aquisicao.byOrigin ?? []} loading={loading} colorClass="bg-meta-blue/75" />
            <KommoBarList title="Leads por Curso (Pós)" rows={data?.aquisicao.byCourse ?? []} loading={loading} colorClass="bg-violet-500/75" />
          </div>
          <KommoBarList title="Leads por Entrada de Prospecção" rows={data?.aquisicao.byEntradaProspeccao ?? []} loading={loading} colorClass="bg-cyan-500/75" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <KommoBarList title="Motivos de Perda" rows={data?.aquisicao.byMotivoPerda ?? []} loading={loading} colorClass="bg-danger/75" />
            <KommoBarList title="Submotivos de Perda" rows={data?.aquisicao.bySubmotivoPerda ?? []} loading={loading} colorClass="bg-danger/50" />
          </div>
        </section>

        {/* Comercial — Kommo / Funil de Consultoras */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide">Comercial</h2>
            <p className="text-xs text-muted-foreground">Kommo · Funil de Consultoras</p>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <KommoChannelBars title="Conversão por Canal" rows={data?.comercial.byChannel ?? []} loading={loading} metric="conversion" />
            <KommoChannelBars title="Desempenho por Canal" rows={data?.comercial.byChannel ?? []} loading={loading} metric="revenue" />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <KommoBarList title="Matrículas por Origem" rows={data?.comercial.matriculasByOrigin ?? []} loading={loading} colorClass="bg-emerald-500/75" />
            <KommoBarList title="Perdas por Origem" rows={data?.comercial.perdasByOrigin ?? []} loading={loading} colorClass="bg-danger/75" />
          </div>
          <KommoBarList title="Leads por Setor" rows={data?.comercial.byLeadsSetor ?? []} loading={loading} colorClass="bg-amber-500/75" />
        </section>
      </div>
    </main>
  );
}
