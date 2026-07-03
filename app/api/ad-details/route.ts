import { NextRequest, NextResponse } from "next/server";

const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("<project-ref>") ||
  process.env.USE_MOCK_DATA === "true";

export interface AdVideoData {
  spend: number;
  video_plays: number;
  cost_per_video_play?: number;
  thruplay: number;
  cost_per_thruplay?: number;
  p25: number;
  p50: number;
  p75: number;
  p100: number;
  avg_watch_time?: number;
}

export interface AdImageData {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  reach: number;
  frequency: number;
}

export interface AdSocialData {
  post_reactions: number;
  post_comments: number;
  post_shares: number;
  follows: number;
  profile_visits: number;
}

export interface AdCreativeData {
  name?: string;
  thumbnail_url?: string;
  image_url?: string;
  video_id?: string;
  is_video: boolean;
  ads_manager_url?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const metaAdId = searchParams.get("metaAdId");
  const accountId = searchParams.get("accountId");
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";

  if (!metaAdId || !accountId) {
    return NextResponse.json(
      { error: "Parâmetros obrigatórios: metaAdId, accountId" },
      { status: 400 }
    );
  }

  if (USE_MOCK) {
    const video: AdVideoData = {
      spend: 1200.0,
      video_plays: 3240,
      cost_per_video_play: 0.37,
      thruplay: 1180,
      cost_per_thruplay: 1.02,
      p25: 2700,
      p50: 2100,
      p75: 1600,
      p100: 1180,
      avg_watch_time: 18.4,
    };
    const social: AdSocialData = {
      post_reactions: 248,
      post_comments: 31,
      post_shares: 57,
      follows: 18,
      profile_visits: 412,
    };
    const image: AdImageData = {
      spend: 1200.0,
      impressions: 84200,
      clicks: 1930,
      ctr: 2.29,
      cpm: 14.25,
      reach: 61300,
      frequency: 1.37,
    };
    return NextResponse.json({
      video,
      image,
      social,
      creative: {
        name: "Criativo — " + metaAdId,
        thumbnail_url: undefined,
        image_url: undefined,
        is_video: true,
      } satisfies AdCreativeData,
    });
  }

  return handleReal(metaAdId, accountId, startDate, endDate);
}

async function handleReal(
  metaAdId: string,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<NextResponse> {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    const { fetchAdVideoMetrics, fetchAdCreative, parseThruPlay, parsePostReactions, parsePostComments, parsePostShares, parseFollows, parseProfileVisits } = await import("@/lib/meta");

    const { data: accounts, error } = await supabaseAdmin
      .from("ad_accounts")
      .select("access_token, meta_account_id")
      .eq("id", accountId)
      .limit(1);
    if (error || !accounts?.length) throw error ?? new Error("Conta não encontrada");

    const { access_token, meta_account_id } = accounts[0];

    const dateParams =
      startDate && endDate
        ? { since: startDate, until: endDate }
        : (() => {
            const today = new Date();
            const ago = new Date(today);
            ago.setDate(today.getDate() - 30);
            return {
              since: ago.toISOString().split("T")[0],
              until: today.toISOString().split("T")[0],
            };
          })();

    const [rawInsights, creative] = await Promise.all([
      fetchAdVideoMetrics(metaAdId, access_token, dateParams),
      fetchAdCreative(metaAdId, access_token, meta_account_id),
    ]);

    const getArr = (key: string): Array<{ value: string }> =>
      (rawInsights?.[key] as Array<{ value: string }> | undefined) ?? [];
    const getVal = (arr: Array<{ value: string }>): number =>
      arr[0] ? parseFloat(arr[0].value) : 0;

    const spend = parseFloat(rawInsights?.spend ?? "0");
    const videoPlays = getVal(getArr("video_play_actions"));
    const thruplay = rawInsights ? parseThruPlay(rawInsights) : 0;
    const p25 = getVal(getArr("video_p25_watched_actions"));
    const p50 = getVal(getArr("video_p50_watched_actions"));
    const p75 = getVal(getArr("video_p75_watched_actions"));
    const p100 = getVal(getArr("video_p100_watched_actions"));
    const avgTime = getVal(getArr("video_avg_time_watched_actions"));

    const video: AdVideoData = {
      spend,
      video_plays: videoPlays,
      cost_per_video_play: videoPlays > 0 ? spend / videoPlays : undefined,
      thruplay,
      cost_per_thruplay: thruplay > 0 ? spend / thruplay : undefined,
      p25,
      p50,
      p75,
      p100,
      avg_watch_time: avgTime > 0 ? avgTime : undefined,
    };

    const image: AdImageData = {
      spend,
      impressions: parseInt(rawInsights?.impressions ?? "0", 10) || 0,
      clicks: parseInt(rawInsights?.clicks ?? "0", 10) || 0,
      ctr: parseFloat(rawInsights?.ctr ?? "0") || 0,
      cpm: parseFloat(rawInsights?.cpm ?? "0") || 0,
      reach: parseInt(rawInsights?.reach ?? "0", 10) || 0,
      frequency: parseFloat(rawInsights?.frequency ?? "0") || 0,
    };

    const numericAccountId = meta_account_id?.replace(/^act_/, "") ?? "";
    const adsManagerUrl = numericAccountId
      ? `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${numericAccountId}&selected_ad_ids=${metaAdId}`
      : undefined;

    const social: AdSocialData = {
      post_reactions: rawInsights ? parsePostReactions(rawInsights) : 0,
      post_comments: rawInsights ? parsePostComments(rawInsights) : 0,
      post_shares: rawInsights ? parsePostShares(rawInsights) : 0,
      follows: rawInsights ? parseFollows(rawInsights) : 0,
      profile_visits: rawInsights ? parseProfileVisits(rawInsights) : 0,
    };

    console.log("[ad-details] creative raw:", JSON.stringify(creative));

    return NextResponse.json({
      video,
      image,
      social,
      creative: {
        name: creative?.name,
        thumbnail_url: creative?.thumbnail_url,
        image_url: creative?.image_url,
        video_id: creative?.video_id,
        is_video: !!creative?.video_id,
        ads_manager_url: adsManagerUrl,
      } satisfies AdCreativeData,
    });
  } catch (err) {
    console.error("[ad-details] Error:", err);
    return NextResponse.json({ error: "Falha ao carregar detalhes do anúncio" }, { status: 500 });
  }
}
