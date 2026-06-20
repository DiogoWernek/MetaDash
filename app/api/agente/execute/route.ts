import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  uploadAdImage,
  searchInterests,
  createCampaign,
  createAdset,
  createAdCreative,
  createAd,
} from "@/lib/meta-ads-create";
import type { AdPlan, ExecuteResult } from "@/types";

const USE_MOCK = process.env.MOCK_AGENT === "true";

interface ExecuteBody {
  plan: AdPlan;
  imageUrl: string;
  accountIds: string[];
  runId?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as ExecuteBody;
  const { plan, imageUrl, accountIds, runId } = body;

  if (!plan || !imageUrl || !accountIds?.length) {
    return new Response(
      JSON.stringify({ error: "Dados incompletos" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const allResults: ExecuteResult[] = [];
      let overallStatus: "success" | "failed" | "partial" = "success";
      let errorLog: string | undefined;

      try {
        if (USE_MOCK) {
          const MOCK_ACCOUNTS = [
            { id: "act_405909849763785", name: "BM ENGENHARIA" },
            { id: "act_277363527797303", name: "BM SAÚDE" },
          ];

          for (const accountId of accountIds) {
            const mockAccount = MOCK_ACCOUNTS.find((a) => a.id === accountId) ?? { id: accountId, name: accountId };
            const suffix = allResults.length + 1;

            send({ type: "account_start", account_id: mockAccount.id, account_name: mockAccount.name });

            const mockSteps = [
              { step: "upload_image", label: "Fazendo upload da imagem...", doneLabel: "Imagem enviada", value: `mock_hash_${suffix}` },
              { step: "create_campaign", label: "Criando campanha...", doneLabel: "Campanha criada", value: `10000000000${suffix}` },
              { step: "search_interests", label: "Buscando interesses de público...", doneLabel: "Interesses encontrados" },
              { step: "create_adset", label: "Criando conjunto de anúncios...", doneLabel: "Adset criado", value: `20000000000${suffix}` },
              { step: "create_creative", label: "Criando criativo do anúncio...", doneLabel: "Criativo criado", value: `30000000000${suffix}` },
              { step: "create_ad", label: "Criando anúncio...", doneLabel: "Anúncio criado (pausado)", value: `40000000000${suffix}` },
            ];

            for (const s of mockSteps) {
              send({ type: "step", step: s.step, status: "start", label: s.label, account_id: mockAccount.id, account_name: mockAccount.name });
              await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
              send({ type: "step", step: s.step, status: "done", label: s.doneLabel, value: s.value, account_id: mockAccount.id, account_name: mockAccount.name });
            }

            allResults.push({
              account_id: mockAccount.id,
              account_name: mockAccount.name,
              campaign_id: `10000000000${suffix}`,
              adset_id: `20000000000${suffix}`,
              creative_id: `30000000000${suffix}`,
              ad_id: `40000000000${suffix}`,
            });
          }

          send({ type: "done", results: allResults });
          controller.close();
          return;
        }

        // === REAL EXECUTION ===

        // Fetch all selected accounts in one query
        const { data: accounts, error: accErr } = await supabaseAdmin
          .from("ad_accounts")
          .select("id, name, meta_account_id, access_token")
          .in("id", accountIds);

        if (accErr || !accounts?.length) throw new Error("Contas não encontradas");

        for (const account of accounts) {
          const { id: dbId, name: accountName, meta_account_id: metaAccountId, access_token: token } = account;

          send({ type: "account_start", account_id: dbId, account_name: accountName });

          const ctx = { account_id: dbId, account_name: accountName };
          const result: Partial<ExecuteResult> = { account_id: dbId, account_name: accountName };

          try {
            send({ type: "step", step: "upload_image", status: "start", label: "Fazendo upload da imagem para a Meta...", ...ctx });
            const imageHash = await uploadAdImage(metaAccountId, token, imageUrl);
            send({ type: "step", step: "upload_image", status: "done", label: "Imagem enviada com sucesso", value: imageHash, ...ctx });

            send({ type: "step", step: "create_campaign", status: "start", label: "Criando campanha...", ...ctx });
            const campaignId = await createCampaign(metaAccountId, token, plan.campaign);
            result.campaign_id = campaignId;
            send({ type: "step", step: "create_campaign", status: "done", label: "Campanha criada", value: campaignId, ...ctx });

            send({ type: "step", step: "search_interests", status: "start", label: "Buscando interesses de público...", ...ctx });
            const resolvedInterests: Array<{ id: string; name: string }> = [];
            for (const interest of plan.adset.targeting.interests ?? []) {
              const found = await searchInterests(interest.keyword, token);
              if (found.length > 0) resolvedInterests.push(found[0]);
            }
            send({ type: "step", step: "search_interests", status: "done", label: `${resolvedInterests.length} interesses encontrados`, ...ctx });

            send({ type: "step", step: "create_adset", status: "start", label: "Criando conjunto de anúncios...", ...ctx });
            const adsetId = await createAdset(metaAccountId, token, campaignId, {
              name: plan.adset.name,
              daily_budget: plan.adset.daily_budget ?? undefined,
              lifetime_budget: plan.adset.lifetime_budget ?? undefined,
              start_time: plan.adset.start_time,
              end_time: plan.adset.end_time ?? undefined,
              optimization_goal: plan.adset.optimization_goal,
              billing_event: plan.adset.billing_event,
              targeting: {
                geo_locations: plan.adset.targeting.geo_locations,
                age_min: plan.adset.targeting.age_min,
                age_max: plan.adset.targeting.age_max,
                genders: plan.adset.targeting.genders,
                resolved_interests: resolvedInterests,
              },
              publisher_platforms: plan.adset.targeting.publisher_platforms,
              facebook_positions: plan.adset.targeting.facebook_positions,
              instagram_positions: plan.adset.targeting.instagram_positions,
            });
            result.adset_id = adsetId;
            send({ type: "step", step: "create_adset", status: "done", label: "Conjunto de anúncios criado", value: adsetId, ...ctx });

            send({ type: "step", step: "create_creative", status: "start", label: "Criando criativo do anúncio...", ...ctx });
            const creativeId = await createAdCreative(metaAccountId, token, {
              name: plan.creative.name,
              page_id: plan.creative.page_id,
              image_hash: imageHash,
              title: plan.creative.title,
              body: plan.creative.body,
              description: plan.creative.description,
              call_to_action_type: plan.creative.call_to_action_type,
              link: plan.creative.link,
            });
            result.creative_id = creativeId;
            send({ type: "step", step: "create_creative", status: "done", label: "Criativo criado", value: creativeId, ...ctx });

            send({ type: "step", step: "create_ad", status: "start", label: "Criando anúncio...", ...ctx });
            const adId = await createAd(metaAccountId, token, {
              name: plan.campaign.name,
              adset_id: adsetId,
              creative_id: creativeId,
            });
            result.ad_id = adId;
            send({ type: "step", step: "create_ad", status: "done", label: "Anúncio criado (pausado)", value: adId, ...ctx });

            allResults.push(result as ExecuteResult);
          } catch (accountErr) {
            const errMsg = String(accountErr instanceof Error ? accountErr.message : accountErr);
            overallStatus = allResults.length > 0 ? "partial" : "failed";
            errorLog = (errorLog ? errorLog + "\n" : "") + `[${accountName}] ${errMsg}`;
            send({ type: "step", step: "create_ad", status: "error", label: `Erro: ${errMsg}`, ...ctx });
          }
        }

        send({ type: "done", results: allResults });
      } catch (err) {
        overallStatus = "failed";
        errorLog = String(err instanceof Error ? err.message : err);
        send({ type: "error", message: errorLog });
      } finally {
        if (runId) {
          const firstResult = allResults[0];
          await supabaseAdmin
            .from("agent_runs")
            .update({
              status: overallStatus,
              error_log: errorLog ?? null,
              meta_campaign_id: firstResult?.campaign_id ?? null,
              meta_adset_id: firstResult?.adset_id ?? null,
              meta_creative_id: firstResult?.creative_id ?? null,
              meta_ad_id: firstResult?.ad_id ?? null,
              finished_at: new Date().toISOString(),
            })
            .eq("id", runId);
        }
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
