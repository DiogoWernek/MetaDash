import { NextRequest, NextResponse } from "next/server";
import type { BreakdownItem } from "@/types";
import { normalizeSegment } from "@/lib/utils";

const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("<project-ref>") ||
  process.env.USE_MOCK_DATA === "true";

// Breakdown de idade/gênero POR CAMPANHA (dropdown na aba Eficiência) — a diferença pro
// breakdown_age_gender do daily_insights é o filtering por campaign.id + level=campaign.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const accountId = searchParams.get("accountId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!campaignId || !accountId || !startDate || !endDate) {
    return NextResponse.json({ error: "Parâmetros obrigatórios: campaignId, accountId, startDate, endDate" }, { status: 400 });
  }

  if (USE_MOCK) {
    const rows: BreakdownItem[] = [
      { segment: "25-34 • Feminino", impressions: 18200, clicks: 410, spend: 620, ctr: 2.25, cpm: 34.0, roas: 1.8, leads: 22 },
      { segment: "35-44 • Feminino", impressions: 14100, clicks: 305, spend: 480, ctr: 2.16, cpm: 34.0, roas: 1.5, leads: 15 },
      { segment: "25-34 • Masculino", impressions: 9800, clicks: 190, spend: 310, ctr: 1.94, cpm: 31.6, roas: 1.1, leads: 8 },
    ];
    return NextResponse.json({ rows });
  }

  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const { fetchInsights, parseRoas, parseLeadsTotal } = await import("@/lib/meta");

    const { data: accounts, error } = await supabaseAdmin
      .from("ad_accounts")
      .select("meta_account_id, access_token")
      .eq("id", accountId)
      .limit(1);
    if (error || !accounts?.length) throw error ?? new Error("Conta não encontrada");

    const account = accounts[0];

    const raw = await fetchInsights(account.meta_account_id, account.access_token, {
      since: startDate,
      until: endDate,
      timeIncrement: "all_days" as const,
      level: "campaign",
      breakdown: "age,gender",
      fields: ["impressions", "clicks", "spend", "cpm", "ctr", "actions", "action_values", "purchase_roas"],
      filtering: JSON.stringify([{ field: "campaign.id", operator: "EQUAL", value: campaignId }]),
    });

    const map = new Map<string, BreakdownItem>();
    for (const row of raw) {
      const r = row as Record<string, unknown>;
      const age = normalizeSegment((r.age as string) ?? "");
      const genderRaw = r.gender as string | undefined;
      const gender = genderRaw === "male" ? "Masculino" : genderRaw === "female" ? "Feminino" : normalizeSegment(genderRaw ?? "");
      const segment = `${age} • ${gender}`;

      const spend = parseFloat(row.spend ?? "0");
      const impressions = parseInt(row.impressions ?? "0", 10);
      const clicks = parseInt(row.clicks ?? "0", 10);
      const leads = parseLeadsTotal(row);
      const roas = parseRoas(row);

      const existing = map.get(segment);
      if (existing) {
        existing.spend += spend;
        existing.impressions += impressions;
        existing.clicks += clicks;
        existing.leads = (existing.leads ?? 0) + leads;
      } else {
        map.set(segment, {
          segment, spend, impressions, clicks,
          ctr: 0, cpm: 0, roas, leads,
        });
      }
    }

    const rows: BreakdownItem[] = Array.from(map.values())
      .map((r) => ({
        ...r,
        ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
        cpm: r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0,
      }))
      .filter((r) => r.spend > 0 || r.impressions > 0)
      .sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ rows });
  } catch (err) {
    console.error("[campaign-breakdown] Error:", err);
    return NextResponse.json({ error: "Falha ao carregar segmentação da campanha" }, { status: 500 });
  }
}
