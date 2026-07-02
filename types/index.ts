export interface BusinessManager {
  id: string;
  name: string;
  meta_bm_id: string;
  created_at: string;
}

export interface AdAccount {
  id: string;
  bm_id: string;
  name: string;
  meta_account_id: string;
  access_token: string;
  token_expires_at: string;
  currency: string;
  active: boolean;
  created_at: string;
}

export interface DailyInsight {
  id: string;
  account_id: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  frequency: number;
  cpm: number;
  cpc: number;
  ctr: number;
  conversions: number;
  roas: number;
  leads?: number;
  revenue?: number;
  link_clicks?: number;
  video_plays?: number;
  video_thruplay?: number;
  video_avg_time?: number;
  video_p25?: number;
  video_p50?: number;
  video_p75?: number;
  video_p100?: number;
  breakdown_platform: BreakdownItem[];
  breakdown_device: BreakdownItem[];
  breakdown_age_gender: BreakdownItem[];
  raw_json?: unknown;
  synced_at?: string;
}

export interface BreakdownItem {
  segment: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpm: number;
  roas: number;
  leads?: number;
  revenue?: number;
}

export interface Campaign {
  id: string;
  account_id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  objective: string;
  budget?: number;
  updated_at?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc?: number;
  roas: number;
  reach?: number;
  conversions?: number;
  cpa?: number;
  leads_total?: number;
  revenue?: number;
  link_clicks?: number;
  messaging_conversations?: number;
  cost_per_conversation?: number;
  cost_per_result?: number;
  leads_form?: number;
  cost_per_lead_form?: number;
  cost_per_thruplay?: number;
  cost_per_landing_page_view?: number;
  post_reactions?: number;
  post_comments?: number;
  post_shares?: number;
  follows?: number;
  profile_visits?: number;
  adsets?: AdSet[];
}

export interface AdSet {
  id: string;
  campaign_id: string;
  name: string;
  status?: "ACTIVE" | "PAUSED" | "ARCHIVED";
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  roas: number;
  conversions?: number;
  cpa?: number;
  leads_total?: number;
  revenue?: number;
  link_clicks?: number;
  messaging_conversations?: number;
  cost_per_conversation?: number;
  cost_per_result?: number;
  leads_form?: number;
  cost_per_lead_form?: number;
  cost_per_thruplay?: number;
  cost_per_landing_page_view?: number;
  post_reactions?: number;
  post_comments?: number;
  post_shares?: number;
  follows?: number;
  profile_visits?: number;
  ads?: Ad[];
}

export interface Ad {
  id: string;
  adset_id: string;
  name: string;
  status?: "ACTIVE" | "PAUSED" | "ARCHIVED";
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  roas: number;
  conversions?: number;
  cpa?: number;
  leads_total?: number;
  revenue?: number;
  link_clicks?: number;
  messaging_conversations?: number;
  cost_per_conversation?: number;
  leads_form?: number;
  cost_per_lead_form?: number;
  cost_per_thruplay?: number;
  cost_per_landing_page_view?: number;
  post_reactions?: number;
  post_comments?: number;
  post_shares?: number;
  follows?: number;
  profile_visits?: number;
}

export interface InsightResponse {
  insights: DailyInsight[];
  previousInsights: DailyInsight[];
  campaigns: Campaign[];
}

export interface AccountsResponse {
  businessManagers: BusinessManager[];
  adAccounts: AdAccount[];
}

export interface KpiSummary {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  roas: number;
  reach: number;
  conversions: number;
  cpa: number;
  frequency: number;
  leads: number;
  revenue: number;
  link_clicks: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type MetricKey = "spend" | "impressions" | "clicks" | "ctr" | "cpm" | "roas";

export type BreakdownType = "platform" | "device" | "age_gender";

export interface ChartDataPoint {
  date: string;
  [accountId: string]: number | string;
}

export interface FilterState {
  selectedBmId: string;
  selectedAccountIds: string[];
  dateRange: DateRange;
}

export interface GeoDataItem {
  code: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
}

export interface GeoData {
  brazil: GeoDataItem[];
  africa: GeoDataItem[];
}

export interface AiAnalysisData {
  type: "campanha" | "conjunto" | "anuncio";
  name: string;
  status?: string;
  objective?: string;
  budget?: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  roas?: number;
  cpa?: number | null;
  resultado?: number | null;
  custo_resultado?: number | null;
  conversions?: number;
  messaging_conversations?: number;
  cost_per_conversation?: number;
  leads_form?: number;
  cost_per_lead_form?: number;
  cost_per_thruplay?: number;
  cost_per_landing_page_view?: number;
  post_reactions?: number;
  post_comments?: number;
  post_shares?: number;
  follows?: number;
  profile_visits?: number;
}

export interface FacebookPage {
  id: string;
  name: string;
  meta_page_id: string;
  created_at: string;
}

// ── Agente ───────────────────────────────────────────────────────────────────

export type AdObjective =
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES"
  | "OUTCOME_AWARENESS"
  | "OUTCOME_ENGAGEMENT";

export type AdCta =
  | "LEARN_MORE"
  | "SHOP_NOW"
  | "SIGN_UP"
  | "CONTACT_US"
  | "BOOK_NOW"
  | "GET_QUOTE";

// Canais de mensagem independentes — cada um marcável separadamente.
// A combinação marcada mapeia deterministicamente para um destination_type da Meta
// (ver buildDestinationType em app/api/agente/route.ts).
export interface MessagingChannels {
  whatsapp: boolean;
  messenger: boolean;
  instagram: boolean;
}

// Posicionamento — agora fica POR PÚBLICO (cada conjunto pode ter o seu).
export interface PlacementSelection {
  mode: "automatic" | "manual";
  platforms: string[];                     // subconjunto de: facebook, instagram, audience_network, messenger, whatsapp, threads
  facebook_positions?: string[];
  instagram_positions?: string[];
  messenger_positions?: string[];
  audience_network_positions?: string[];
  threads_positions?: string[];
  whatsapp_positions?: string[];
}

export interface AudienceImage {
  url: string;       // URL pública (Supabase) usada na criação
  preview: string;   // URL para exibição no preview
}

// Um criativo dentro de um público — um público pode ter vários (várias ads no mesmo adset)
export interface AudienceCreativeItem {
  id: string;
  name: string;                     // nome próprio do criativo/anúncio — nunca herda o nome do conjunto
  media_type: "image" | "video";
  images: AudienceImage[];          // media_type="image": 1 = imagem única, 2+ = carrossel
  video?: AudienceImage;            // media_type="video"
  video_thumbnail?: AudienceImage;  // media_type="video" — capa exigida pela Meta (video_data.image_url)
  headline: string;
  primary_text: string;
  description: string;
  cta: AdCta;
  destination_url: string;
}

// Um público-alvo — agora com posicionamento próprio, config de conversão por mensagens
// (só relevante p/ objetivos Engajamento/Vendas) e uma lista de criativos.
export interface AudienceCreative {
  id: string;                 // uid client-side para keys do React
  // Público
  audience_description: string;
  locations: string;
  age_min: number;
  age_max: number;
  genders: string[];
  // Conversão por mensagens (a nível de conjunto) — só objetivos Engajamento/Vendas
  messaging_enabled: boolean;
  messaging_channels: MessagingChannels;
  performance_goal: string;            // value do dropdown de Meta de Desempenho (ver PERFORMANCE_GOALS)
  // Posicionamento — a nível de conjunto
  placement: PlacementSelection;
  // Criativos deste público — 1 ou mais (botão "adicionar criativo")
  creatives: AudienceCreativeItem[];
}

export interface AgentFormData {
  bm_id: string;
  account_ids: string[];   // uma conta selecionada
  facebook_page_id?: string;
  whatsapp_number?: string; // necessário quando algum público usa canal WhatsApp (Leads clássico ou Engajamento/Vendas via mensagens)
  campaign_name: string;
  objective: AdObjective;
  budget_type: "daily" | "total";
  budget_amount: number;   // orçamento da campanha (CBO)
  start_date: string;
  end_date?: string;
  audiences: AudienceCreative[];
}

export interface AgentRun {
  id: string;
  account_id: string | null;
  form_data: AgentFormData;
  image_url: string | null;
  image_hash: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_creative_id: string | null;
  meta_ad_id: string | null;
  agent_messages: string[];
  status: "pending" | "running" | "success" | "failed" | "partial";
  error_log: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

export type AgentStreamEventType = "text" | "tool_start" | "tool_done" | "done" | "error";

export interface AgentStreamEvent {
  type: AgentStreamEventType;
  content?: string;
  name?: string;
  id?: string;
  runId?: string;
  message?: string;
}

export interface ChatMessage {
  type: "text" | "tool" | "error";
  content?: string;
  toolName?: string;
  toolStatus?: "running" | "done";
}

// ── Ad Plan (gerado pelo Claude antes de criar) ──────────────────────────────

export interface AdPlanCampaign {
  name: string;
  objective: string;
  special_ad_categories: string[];
  // Orçamento no nível da campanha (CBO) — em centavos
  daily_budget?: number;
  lifetime_budget?: number;
}

export interface AdPlanInterest {
  name: string;
  keyword: string;
}

export interface AdPlanTargeting {
  geo_locations: { countries: string[]; cities?: Array<{ name: string }> };
  age_min: number;
  age_max: number;
  genders: number[];
  interests: AdPlanInterest[];
  publisher_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
  messenger_positions?: string[];
  audience_network_positions?: string[];
  threads_positions?: string[];
  whatsapp_positions?: string[];
}

export interface AdPlanCreative {
  name: string;
  title: string;
  body: string;
  description: string;
  call_to_action_type: string;
  link: string;
  page_id: string;
  media_type: "image" | "video";
  image_urls: string[];        // media_type="image": 1 = imagem única, 2+ = carrossel
  video_url?: string;          // media_type="video" — origem a ser enviada para /advideos
  video_thumbnail_url?: string; // media_type="video" — capa (video_data.image_url)
  whatsapp_link?: string;      // destino do CTA quando call_to_action_type = WHATSAPP_MESSAGE
}

export interface AdPlanAdset {
  name: string;
  start_time: string;
  end_time?: string;
  optimization_goal: string;
  billing_event: string;
  destination_type?: string;             // ex.: "WHATSAPP", "MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP"
  promoted_object?: { page_id?: string; whatsapp_phone_number?: string };
  targeting: AdPlanTargeting;
  creatives: AdPlanCreative[];   // um público pode ter vários criativos (várias ads no mesmo adset)
}

export interface AdPlan {
  summary: string;
  campaign: AdPlanCampaign;
  adsets: AdPlanAdset[];      // um conjunto por público
}

export interface ExecuteStep {
  step: string;
  status: "start" | "done" | "error";
  label: string;
  value?: string;
}

export interface ExecuteStreamEvent {
  type: "step" | "done" | "error" | "campaign_start" | "group_start";
  step?: string;
  status?: "start" | "done" | "error";
  label?: string;
  value?: string;
  group_id?: string;     // id do público (adset) a que o passo pertence
  group_name?: string;
  result?: ExecuteResult;
  message?: string;
}

export interface ExecuteAdResult {
  creative_id: string;
  ad_id: string;
}

export interface ExecuteAdsetResult {
  name: string;
  adset_id: string;
  ads: ExecuteAdResult[];   // um público pode ter vários criativos → vários anúncios no mesmo conjunto
}

export interface ExecuteResult {
  account_id: string;
  account_name: string;
  campaign_id: string;
  adsets: ExecuteAdsetResult[];
}
