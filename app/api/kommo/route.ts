import { NextRequest, NextResponse } from "next/server";
import type { CrmDashboardData, KommoLeadCached } from "@/lib/kommo";

const PAGE_SIZE = 1000;

// O Supabase (PostgREST) trunca .select() em 1000 linhas por padrão — com dezenas de
// milhares de leads numa janela de 90 dias, um select sem paginação undercount silenciosamente
// (foi exatamente isso: só 203 de ~10mil leads da Triagem apareciam). Pagina até esgotar.
async function fetchAllLeads(
  supabaseAdmin: typeof import("@/lib/supabase").supabaseAdmin,
  from: string,
  to: string
): Promise<KommoLeadCached[]> {
  const all: KommoLeadCached[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("kommo_leads_cache")
      .select("lead_id,price,status_id,status_name,pipeline_id,is_won,is_lost,course,source,entrada_prospeccao,setor,motivo_perda,submotivo_perda,created_date")
      .gte("created_date", from)
      .lte("created_date", to)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as KommoLeadCached[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

const EMPTY: CrmDashboardData = {
  cpa: 0, cpl: 0, totalLeadsGerados: 0, totalMatriculas: 0, totalRevenue: 0,
  aquisicao: { totalLeads: 0, avgPerDay: 0, topSource: "—", byOrigin: [], byCourse: [], byEntradaProspeccao: [], byMotivoPerda: [], bySubmotivoPerda: [] },
  comercial: { byChannel: [], matriculasByOrigin: [], perdasByOrigin: [], byLeadsSetor: [] },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const spend = parseFloat(searchParams.get("spend") ?? "0");

  if (!from || !to) {
    return NextResponse.json({ error: "from e to são obrigatórios" }, { status: 400 });
  }

  const hasCredentials =
    process.env.KOMMO_DOMAIN &&
    !process.env.KOMMO_DOMAIN.includes("<") &&
    process.env.KOMMO_ACCESS_TOKEN &&
    !process.env.KOMMO_ACCESS_TOKEN.includes("<");

  if (!hasCredentials) {
    return NextResponse.json(EMPTY);
  }

  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const { buildCrmDashboard } = await import("@/lib/kommo");

    const cached = await fetchAllLeads(supabaseAdmin, from, to);

    if (cached.length > 0) {
      return NextResponse.json(buildCrmDashboard(cached, spend, from, to));
    }

    return NextResponse.json(EMPTY);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/kommo]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
