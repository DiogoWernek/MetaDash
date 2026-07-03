const STATUS_WON = 142;
const STATUS_LOST = 143;

// Aba CRM: dois pipelines do Kommo — Triagem alimenta "Aquisição", Consultoras alimenta
// "Comercial" (confirmado com o cliente em 2026-07-02). Mesmos IDs usados no sync-cron.
export const PIPELINE_TRIAGEM = 8956775;
export const PIPELINE_COMERCIAL = 12124500;

// ——— Formato salvo em kommo_leads_cache (populado pelo worker sync-cron) ———
export interface KommoLeadCached {
  lead_id: number;
  price: number;
  status_id: number;
  status_name: string;
  pipeline_id: number;
  is_won: boolean;
  is_lost: boolean;
  course: string;
  source: string;
  entrada_prospeccao: string;
  setor: string;
  motivo_perda: string;
  submotivo_perda: string;
  created_date: string;
}

export interface CountRow {
  label: string;
  count: number;
}

export interface ChannelRow {
  channel: string;
  total: number;
  won: number;
  conversionRate: number; // 0-100
  revenue: number;
}

export interface CrmDashboardData {
  // Painel Geral (item 7) — CPA usa matrículas do Comercial, CPL usa leads gerados na Triagem
  cpa: number;
  cpl: number;
  totalLeadsGerados: number;
  totalMatriculas: number;
  totalRevenue: number; // soma do price das matrículas (Comercial) — usado no ROAS real da aba Campanhas
  aquisicao: {
    totalLeads: number;
    avgPerDay: number;
    topSource: string;
    byOrigin: CountRow[];
    byCourse: CountRow[];
    byEntradaProspeccao: CountRow[];
    byMotivoPerda: CountRow[];
    bySubmotivoPerda: CountRow[];
  };
  comercial: {
    byChannel: ChannelRow[];
    matriculasByOrigin: CountRow[];
    perdasByOrigin: CountRow[];
    byLeadsSetor: CountRow[];
  };
}

function countBy(items: KommoLeadCached[], field: keyof KommoLeadCached, skipEmpty = false): CountRow[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const label = String(item[field] ?? "");
    if (skipEmpty && !label) continue;
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function daysBetween(from: string, to: string): number {
  const f = new Date(`${from}T00:00:00Z`).getTime();
  const t = new Date(`${to}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((t - f) / 86400000) + 1);
}

export function buildCrmDashboard(
  leads: KommoLeadCached[],
  metaSpend: number,
  from: string,
  to: string
): CrmDashboardData {
  const aquisicaoLeads = leads.filter((l) => l.pipeline_id === PIPELINE_TRIAGEM);
  const comercialLeads = leads.filter((l) => l.pipeline_id === PIPELINE_COMERCIAL);

  // ── Aquisição (Triagem) ──
  const totalLeads = aquisicaoLeads.length;
  const avgPerDay = totalLeads / daysBetween(from, to);
  const byOrigin = countBy(aquisicaoLeads, "source");
  const topSource = byOrigin[0]?.label ?? "—";
  const byCourse = countBy(aquisicaoLeads, "course");
  const byEntradaProspeccao = countBy(aquisicaoLeads, "entrada_prospeccao");
  const lostAquisicao = aquisicaoLeads.filter((l) => l.is_lost);
  const byMotivoPerda = countBy(lostAquisicao, "motivo_perda", true);
  const bySubmotivoPerda = countBy(lostAquisicao, "submotivo_perda", true);

  // ── Comercial (Consultoras) ──
  const channelMap = new Map<string, { total: number; won: number; revenue: number }>();
  for (const lead of comercialLeads) {
    const e = channelMap.get(lead.source) ?? { total: 0, won: 0, revenue: 0 };
    e.total++;
    if (lead.is_won) { e.won++; e.revenue += lead.price; }
    channelMap.set(lead.source, e);
  }
  const byChannel: ChannelRow[] = Array.from(channelMap.entries())
    .map(([channel, d]) => ({
      channel,
      total: d.total,
      won: d.won,
      conversionRate: d.total > 0 ? (d.won / d.total) * 100 : 0,
      revenue: d.revenue,
    }))
    .sort((a, b) => b.total - a.total);

  const matriculasComercial = comercialLeads.filter((l) => l.is_won);
  const perdasComercial = comercialLeads.filter((l) => l.is_lost);
  const matriculasByOrigin = countBy(matriculasComercial, "source");
  const perdasByOrigin = countBy(perdasComercial, "source");
  const byLeadsSetor = countBy(comercialLeads, "setor");

  const totalMatriculas = matriculasComercial.length;
  const totalLeadsGerados = totalLeads;
  const totalRevenue = matriculasComercial.reduce((s, l) => s + l.price, 0);
  const cpa = totalMatriculas > 0 ? metaSpend / totalMatriculas : 0;
  const cpl = totalLeadsGerados > 0 ? metaSpend / totalLeadsGerados : 0;

  return {
    cpa,
    cpl,
    totalLeadsGerados,
    totalMatriculas,
    totalRevenue,
    aquisicao: { totalLeads, avgPerDay, topSource, byOrigin, byCourse, byEntradaProspeccao, byMotivoPerda, bySubmotivoPerda },
    comercial: { byChannel, matriculasByOrigin, perdasByOrigin, byLeadsSetor },
  };
}
