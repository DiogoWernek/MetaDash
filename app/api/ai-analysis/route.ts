import { NextRequest, NextResponse } from "next/server";
import type { AiAnalysisData } from "@/types";

const OBJECTIVE_LABELS: Record<string, string> = {
  CONVERSIONS: "Conversões",
  BRAND_AWARENESS: "Reconhecimento de Marca",
  APP_INSTALLS: "Instalações de App",
  LEAD_GENERATION: "Geração de Leads",
  TRAFFIC: "Tráfego",
  ENGAGEMENT: "Engajamento",
  VIDEO_VIEWS: "Visualizações de Vídeo",
  MESSAGES: "Mensagens",
  OUTCOME_ENGAGEMENT: "Engajamento",
  OUTCOME_LEADS: "Geração de Leads",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_SALES: "Vendas",
  OUTCOME_APP_PROMOTION: "Promoção de App",
  OUTCOME_AWARENESS: "Reconhecimento",
};

function buildPrompt(data: AiAnalysisData): string {
  const fmtCurrency = (v?: number | null) =>
    v != null
      ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : null;
  const fmtNum = (v?: number | null) =>
    v != null ? v.toLocaleString("pt-BR") : null;
  const fmtPct = (v?: number | null) =>
    v != null
      ? `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
      : null;

  const typeLabel =
    data.type === "campanha"
      ? "Campanha"
      : data.type === "conjunto"
      ? "Conjunto de Anúncios"
      : "Anúncio";

  const objectiveLabel = data.objective
    ? (OBJECTIVE_LABELS[data.objective] ?? data.objective)
    : null;

  const statusLabel =
    data.status === "ACTIVE"
      ? "Ativo"
      : data.status === "PAUSED"
      ? "Pausado"
      : data.status ?? null;

  const header = [
    `Tipo: ${typeLabel}`,
    `Nome: ${data.name}`,
    statusLabel ? `Status: ${statusLabel}` : null,
    objectiveLabel ? `Objetivo: ${objectiveLabel}` : null,
    data.budget ? `Orçamento Diário: ${fmtCurrency(data.budget)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const metrics: string[] = [
    `Gasto Total: ${fmtCurrency(data.spend)}`,
    `Impressões: ${fmtNum(data.impressions)}`,
    `Cliques: ${fmtNum(data.clicks)}`,
    `CTR: ${fmtPct(data.ctr)}`,
    `CPM: ${fmtCurrency(data.cpm)}`,
  ];

  if (data.roas != null && data.roas > 0)
    metrics.push(`ROAS: ${data.roas.toFixed(2).replace(".", ",")}x`);
  if (data.cpa != null) metrics.push(`CPA: ${fmtCurrency(data.cpa)}`);
  if (data.resultado != null)
    metrics.push(`Resultado Principal: ${fmtNum(data.resultado)}`);
  if (data.custo_resultado != null)
    metrics.push(`Custo por Resultado: ${fmtCurrency(data.custo_resultado)}`);
  if (data.conversions) metrics.push(`Conversões: ${fmtNum(data.conversions)}`);
  if (data.messaging_conversations)
    metrics.push(`Conversas Iniciadas: ${fmtNum(data.messaging_conversations)}`);
  if (data.cost_per_conversation)
    metrics.push(`Custo por Conversa: ${fmtCurrency(data.cost_per_conversation)}`);
  if (data.leads_form)
    metrics.push(`Leads (Formulário): ${fmtNum(data.leads_form)}`);
  if (data.cost_per_lead_form)
    metrics.push(`Custo por Lead: ${fmtCurrency(data.cost_per_lead_form)}`);
  if (data.cost_per_thruplay)
    metrics.push(`Custo por ThruPlay: ${fmtCurrency(data.cost_per_thruplay)}`);
  if (data.cost_per_landing_page_view)
    metrics.push(`Custo por Clique LP: ${fmtCurrency(data.cost_per_landing_page_view)}`);
  if (data.post_reactions)
    metrics.push(`Reações: ${fmtNum(data.post_reactions)}`);
  if (data.post_comments)
    metrics.push(`Comentários: ${fmtNum(data.post_comments)}`);
  if (data.post_shares)
    metrics.push(`Compartilhamentos: ${fmtNum(data.post_shares)}`);
  if (data.follows)
    metrics.push(`Seguidores Ganhos: ${fmtNum(data.follows)}`);
  if (data.profile_visits)
    metrics.push(`Visitas ao Perfil: ${fmtNum(data.profile_visits)}`);

  return `Você é um especialista em Meta Ads. Analise os dados abaixo em português do Brasil. Seja extremamente conciso — máximo 4 linhas por seção, sem introduções, sem repetir os dados.

${header}

Métricas:
${metrics.map((m) => `• ${m}`).join("\n")}

Responda neste formato exato (sem texto fora dele):

**📊 Performance Geral**
[1-2 frases sobre o desempenho, mencionando os números mais relevantes]

**✅ Pontos Fortes**
[2-3 bullets curtos]

**⚠️ Pontos de Atenção**
[2-3 bullets curtos]

**🎯 Recomendações**
[3 bullets com ações diretas e específicas]`;
}

export async function POST(request: NextRequest) {
  try {
    const data: AiAnalysisData = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY não configurada" },
        { status: 500 }
      );
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = buildPrompt(data);

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[ai-analysis]", err);
    return NextResponse.json({ error: "Erro ao gerar análise" }, { status: 500 });
  }
}
