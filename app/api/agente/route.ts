import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PLAN_SYSTEM_PROMPT, MOCK_PLAN } from "@/lib/agent";
import type { AgentFormData, AdPlan } from "@/types";

const USE_MOCK =
  process.env.MOCK_AGENT === "true" ||
  !process.env.ANTHROPIC_API_KEY ||
  process.env.ANTHROPIC_API_KEY.startsWith("sk-ant-...");

const anthropic = USE_MOCK
  ? null
  : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(formData: AgentFormData, imageUrl: string): string {
  const budgetCents = Math.round(formData.budget_amount * 100);
  const genders =
    formData.genders.includes("all") || formData.genders.length === 0
      ? [0]
      : formData.genders.map((g) => (g === "male" ? 1 : 2));

  return `Gere o plano de anúncio para os dados abaixo:

Campaign name: ${formData.campaign_name}
Objective: ${formData.objective}
Budget type: ${formData.budget_type} | Amount (centavos): ${budgetCents}
Start date: ${formData.start_date}
End date: ${formData.end_date ?? "sem data de fim"}

Audience description (pt-BR): ${formData.audience_description}
Locations: ${formData.locations}
Age: ${formData.age_min}–${formData.age_max}
Genders (raw, convert to Meta codes): ${formData.genders.join(",")} → ${JSON.stringify(genders)}

Headline: ${formData.headline}
Primary text: ${formData.primary_text}
Description: ${formData.description}
CTA: ${formData.cta}
Destination URL: ${formData.destination_url}
Facebook Page ID: ${formData.facebook_page_id ?? ""}

Image URL (já uploaded no Supabase Storage — usar no campo image_url): ${imageUrl}
Placements: ${formData.placements}${formData.placements === "manual" ? ` — ${(formData.manual_placements ?? []).join(", ")}` : ""}

Retorne SOMENTE o JSON do plano.`;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { formData: AgentFormData; imageUrl: string };
  const { formData, imageUrl } = body;

  if (!formData || !imageUrl) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  // Mock mode — returns plan instantly without calling Claude
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1200));
    const mockPlan: AdPlan = {
      ...MOCK_PLAN,
      campaign: { ...MOCK_PLAN.campaign, name: formData.campaign_name || MOCK_PLAN.campaign.name, objective: formData.objective },
      adset: {
        ...MOCK_PLAN.adset,
        daily_budget: formData.budget_type === "daily" ? Math.round(formData.budget_amount * 100) : undefined,
        lifetime_budget: formData.budget_type === "total" ? Math.round(formData.budget_amount * 100) : undefined,
        start_time: `${formData.start_date}T00:00:00+0000`,
        end_time: formData.end_date ? `${formData.end_date}T00:00:00+0000` : undefined,
        targeting: {
          ...MOCK_PLAN.adset.targeting,
          age_min: formData.age_min,
          age_max: formData.age_max,
        },
      },
      creative: {
        ...MOCK_PLAN.creative,
        title: formData.headline || MOCK_PLAN.creative.title,
        body: formData.primary_text || MOCK_PLAN.creative.body,
        description: formData.description || MOCK_PLAN.creative.description,
        call_to_action_type: formData.cta,
        link: formData.destination_url || MOCK_PLAN.creative.link,
        page_id: formData.facebook_page_id ?? MOCK_PLAN.creative.page_id,
      },
    };
    return NextResponse.json({ plan: mockPlan, mock: true });
  }

  try {
    const userPrompt = buildPrompt(formData, imageUrl);

    const message = await anthropic!.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: PLAN_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawContent = message.content[0];
    if (rawContent.type !== "text") {
      return NextResponse.json({ error: "Resposta inesperada do Claude" }, { status: 500 });
    }

    // Extract JSON from response (Claude may wrap in markdown code blocks)
    let jsonStr = rawContent.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const plan = JSON.parse(jsonStr) as AdPlan;
    return NextResponse.json({ plan, mock: false });
  } catch (err) {
    console.error("[api/agente] Plan generation error:", err);
    return NextResponse.json(
      { error: `Falha ao gerar plano: ${String(err instanceof Error ? err.message : err)}` },
      { status: 500 }
    );
  }
}
