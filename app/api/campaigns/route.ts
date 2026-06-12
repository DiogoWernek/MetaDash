import { NextRequest, NextResponse } from "next/server";
import type { Campaign } from "@/types";
import { MOCK_CAMPAIGNS, MOCK_AD_ACCOUNTS } from "@/lib/mock-data";

const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("<project-ref>") ||
  process.env.USE_MOCK_DATA === "true";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountIdsParam = searchParams.get("accountIds") ?? "";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!accountIdsParam || !startDate || !endDate) {
    return NextResponse.json({ error: "Parâmetros obrigatórios: accountIds, startDate, endDate" }, { status: 400 });
  }

  const accountIds = accountIdsParam.split(",").filter(Boolean);

  if (USE_MOCK) {
    const campaigns = MOCK_CAMPAIGNS.filter((c) => {
      const account = MOCK_AD_ACCOUNTS.find((a) => a.id === c.account_id);
      return account && accountIds.includes(account.id);
    });
    return NextResponse.json({ campaigns });
  }

  return handleReal(accountIds, startDate, endDate);
}

async function handleReal(accountIds: string[], startDate: string, endDate: string): Promise<NextResponse> {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const { fetchCampaignList, fetchCampaignInsights, parseRoas, parseConversionsAll } = await import("@/lib/meta");

    const { data: accounts, error } = await supabaseAdmin.from("ad_accounts").select("*").in("id", accountIds);
    if (error) throw error;

    const allCampaigns: Campaign[] = [];

    await Promise.all(
      (accounts ?? []).map(async (account) => {
        try {
          const [campaignList, campInsights] = await Promise.all([
            fetchCampaignList(account.meta_account_id, account.access_token),
            fetchCampaignInsights(account.meta_account_id, account.access_token, {
              since: startDate,
              until: endDate,
            }).catch(() => []),
          ]);

          for (const mc of campaignList) {
            const ci = campInsights.find((i) => i.campaign_id === mc.id);
            const spend = parseFloat(ci?.spend ?? "0");
            const convs = parseConversionsAll(ci ?? {});

            allCampaigns.push({
              id: mc.id,
              account_id: account.id,
              name: mc.name,
              status: mc.status as "ACTIVE" | "PAUSED" | "ARCHIVED",
              objective: mc.objective,
              budget: mc.daily_budget ? parseFloat(mc.daily_budget) / 100 : undefined,
              spend,
              impressions: parseInt(ci?.impressions ?? "0"),
              clicks: parseInt(ci?.clicks ?? "0"),
              ctr: parseFloat(ci?.ctr ?? "0"),
              cpm: parseFloat(ci?.cpm ?? "0"),
              roas: parseRoas(ci ?? {}),
              conversions: convs,
              cpa: convs > 0 ? spend / convs : undefined,
              adsets: [],
            });
          }
        } catch (err) {
          console.error(`[campaigns] Error for account ${account.name}:`, err);
        }
      })
    );

    // Sort by spend desc
    allCampaigns.sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ campaigns: allCampaigns });
  } catch (error) {
    console.error("[campaigns] Error:", error);
    return NextResponse.json({ error: "Falha ao carregar campanhas" }, { status: 500 });
  }
}
