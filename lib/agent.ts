export const PLAN_SYSTEM_PROMPT = `Você é um especialista em Meta Ads (Facebook e Instagram).

Sua tarefa é analisar os dados fornecidos pelo usuário e gerar um plano completo e otimizado para criação de anúncio, em formato JSON estrito.

## Regras obrigatórias:
- Retorne SOMENTE o JSON válido abaixo, sem texto fora do JSON
- Status sempre "PAUSED" — nunca ACTIVE
- Orçamento em centavos: R$50,00 = 5000
- Para targeting de gênero: 0=todos, 1=masculino, 2=feminino
- Sugira de 2 a 5 interesses relevantes baseados na descrição do público
- optimization_goal deve ser compatível com o objective (TRAFFIC→LINK_CLICKS, LEADS→LEAD_GENERATION, SALES→OFFSITE_CONVERSIONS, AWARENESS→REACH, ENGAGEMENT→POST_ENGAGEMENT)
- billing_event: IMPRESSIONS para awareness/engagement, IMPRESSIONS para outros
- Se placements for automático, omita publisher_platforms/facebook_positions/instagram_positions no targeting
- Para países do Brasil use: geo_locations.countries = ["BR"]; para cidades específicas use geo_locations.cities com o nome

## Schema JSON obrigatório:
{
  "summary": "string — 1-2 frases explicando as escolhas de otimização",
  "campaign": {
    "name": "string",
    "objective": "string — mesmo objective recebido",
    "special_ad_categories": []
  },
  "adset": {
    "name": "string — sugestão baseada no público",
    "daily_budget": number (em centavos, se budget_type=daily) | null,
    "lifetime_budget": number (em centavos, se budget_type=total) | null,
    "start_time": "YYYY-MM-DDT00:00:00+0000",
    "end_time": "YYYY-MM-DDT00:00:00+0000" | null,
    "optimization_goal": "string",
    "billing_event": "IMPRESSIONS",
    "targeting": {
      "geo_locations": { "countries": ["BR"] },
      "age_min": number,
      "age_max": number,
      "genders": [number],
      "interests": [{ "name": "string", "keyword": "string" }]
    }
  },
  "creative": {
    "name": "string",
    "title": "string — máx 40 chars",
    "body": "string — máx 125 chars",
    "description": "string — máx 30 chars",
    "call_to_action_type": "string",
    "link": "string",
    "page_id": "string — valor recebido do formulário"
  }
}`;

export const TOOL_LABELS: Record<string, string> = {
  upload_image: "Fazendo upload da imagem...",
  search_interests: "Buscando interesses de público...",
  create_campaign: "Criando campanha...",
  create_adset: "Criando conjunto de anúncios...",
  create_ad_creative: "Criando criativo do anúncio...",
  create_ad: "Criando anúncio...",
};

export const MOCK_PLAN = {
  summary: "Campanha otimizada para tráfego com público feminino 25-40 anos interessado em moda, usando placements automáticos para maximizar alcance.",
  campaign: {
    name: "Campanha Teste — NaviDash",
    objective: "OUTCOME_TRAFFIC",
    special_ad_categories: [],
  },
  adset: {
    name: "Público — Mulheres 25-40 Moda BR",
    daily_budget: 5000,
    lifetime_budget: null,
    start_time: `${new Date().toISOString().split("T")[0]}T00:00:00+0000`,
    end_time: null,
    optimization_goal: "LINK_CLICKS",
    billing_event: "IMPRESSIONS",
    targeting: {
      geo_locations: { countries: ["BR"] },
      age_min: 25,
      age_max: 40,
      genders: [2],
      interests: [
        { name: "Moda", keyword: "fashion" },
        { name: "Beleza", keyword: "beauty" },
        { name: "Compras online", keyword: "online shopping" },
      ],
    },
  },
  creative: {
    name: "Criativo Principal",
    title: "Descubra nossa nova coleção",
    body: "Aproveite os melhores produtos com frete grátis para todo o Brasil!",
    description: "Frete grátis",
    call_to_action_type: "LEARN_MORE",
    link: "https://exemplo.com",
    page_id: "000000000000000",
  },
};
