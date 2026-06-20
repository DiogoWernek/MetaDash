"use client";

import { useState } from "react";
import {
  CheckCircle2, Edit2, ExternalLink, Megaphone, Users,
  Image as ImageIcon, LayoutGrid, AlertCircle, ArrowLeft, Send, Tag,
  Upload, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ImageUpload } from "./ImageUpload";
import { ImageGenerator } from "./ImageGenerator";
import type { AdPlan } from "@/types";

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: "Saiba Mais",
  SHOP_NOW: "Comprar Agora",
  SIGN_UP: "Cadastre-se",
  CONTACT_US: "Fale Conosco",
  BOOK_NOW: "Reserve Agora",
  GET_QUOTE: "Solicitar Orçamento",
};

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_LEADS: "Geração de Cadastros",
  OUTCOME_SALES: "Vendas",
  OUTCOME_AWARENESS: "Reconhecimento de Marca",
  OUTCOME_ENGAGEMENT: "Engajamento",
};

function formatBudget(cents: number | null | undefined): string {
  if (!cents) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  multiline?: boolean;
  type?: string;
  hint?: string;
}

function EditableField({ label, value, onChange, maxLength, multiline, type = "text", hint }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="group space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-[10px] text-meta-blue hover:text-meta-blue/80"
        >
          <Edit2 className="h-2.5 w-2.5" />
          {editing ? "Fechar" : "Editar"}
        </button>
      </div>

      {editing ? (
        <div className="space-y-1">
          {multiline ? (
            <div className="relative">
              <Textarea
                value={value}
                onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
                rows={3}
                className="text-sm"
                autoFocus
              />
              {maxLength && (
                <span className={cn("absolute right-2 bottom-2 text-[10px] tabular-nums", value.length > maxLength * 0.9 ? "text-warning" : "text-muted-foreground")}>
                  {value.length}/{maxLength}
                </span>
              )}
            </div>
          ) : (
            <div className="relative">
              <Input
                type={type}
                value={value}
                onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
              {maxLength && (
                <span className={cn("absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums", value.length > maxLength * 0.9 ? "text-warning" : "text-muted-foreground")}>
                  {value.length}/{maxLength}
                </span>
              )}
            </div>
          )}
          {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
        </div>
      ) : (
        <p className="text-sm text-foreground leading-snug">{value || <span className="text-muted-foreground italic">Não definido</span>}</p>
      )}
    </div>
  );
}

interface ReviewSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function ReviewSection({ icon, title, children }: ReviewSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 bg-muted/30">
        <div className="flex h-5 w-5 items-center justify-center text-muted-foreground">
          {icon}
        </div>
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {children}
      </div>
    </div>
  );
}

interface AdPlanReviewProps {
  plan: AdPlan;
  imageUrl: string | null;
  imagePreviewUrl: string | null;
  isMock: boolean;
  onApprove: (editedPlan: AdPlan) => void;
  onBack: () => void;
  onImageChange: (url: string, preview: string) => void;
  disabled?: boolean;
}

export function AdPlanReview({ plan, imageUrl, imagePreviewUrl, isMock, onApprove, onBack, onImageChange, disabled }: AdPlanReviewProps) {
  const [edited, setEdited] = useState<AdPlan>(JSON.parse(JSON.stringify(plan)));
  const [imagePanel, setImagePanel] = useState<null | "upload" | "generate">(null);

  const set = <K extends keyof AdPlan>(section: K, field: keyof AdPlan[K], value: unknown) => {
    setEdited((prev) => ({
      ...prev,
      [section]: { ...prev[section] as object, [field]: value },
    }));
  };

  const genderLabel = edited.adset.targeting.genders.includes(0)
    ? "Todos"
    : edited.adset.targeting.genders.map((g) => (g === 1 ? "Masculino" : "Feminino")).join(" + ");

  const budgetLabel = edited.adset.daily_budget
    ? `${formatBudget(edited.adset.daily_budget)} / dia`
    : `${formatBudget(edited.adset.lifetime_budget)} total`;

  const startDate = edited.adset.start_time?.split("T")[0] ?? "";
  const endDate = edited.adset.end_time?.split("T")[0] ?? "";

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3",
        isMock
          ? "border-yellow-500/30 bg-yellow-500/5"
          : "border-meta-blue/30 bg-meta-blue/5"
      )}>
        <AlertCircle className={cn("h-4 w-4 shrink-0 mt-0.5", isMock ? "text-yellow-500" : "text-meta-blue")} />
        <div>
          {isMock && (
            <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-0.5">
              Modo Simulação — nenhum dado real será enviado para a Meta
            </p>
          )}
          <p className="text-sm text-foreground/80">{edited.summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Left: Campaign + Audience + Placements */}
        <div className="xl:col-span-3 space-y-3">
          {/* Campaign */}
          <ReviewSection icon={<Megaphone className="h-3.5 w-3.5" />} title="Campanha">
            <EditableField
              label="Nome da campanha"
              value={edited.campaign.name}
              onChange={(v) => set("campaign", "name", v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Objetivo</p>
                <Badge variant="outline" className="text-xs">
                  {OBJECTIVE_LABELS[edited.campaign.objective] ?? edited.campaign.objective}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Orçamento</p>
                <p className="text-sm font-medium">{budgetLabel}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Data de início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => set("adset", "start_time", `${e.target.value}T00:00:00+0000`)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Data de fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => set("adset", "end_time", e.target.value ? `${e.target.value}T00:00:00+0000` : null)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </ReviewSection>

          {/* Audience */}
          <ReviewSection icon={<Users className="h-3.5 w-3.5" />} title="Público-Alvo">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Localização</p>
                <p className="text-sm">{edited.adset.targeting.geo_locations.countries?.join(", ") ?? "BR"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Faixa etária</p>
                <p className="text-sm">{edited.adset.targeting.age_min}–{edited.adset.targeting.age_max} anos</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Gênero</p>
                <p className="text-sm">{genderLabel}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Interesses sugeridos</p>
              <div className="flex flex-wrap gap-1.5">
                {(edited.adset.targeting.interests ?? []).map((i, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1 text-xs">
                    <Tag className="h-2.5 w-2.5" />
                    {i.name}
                  </Badge>
                ))}
                {(edited.adset.targeting.interests ?? []).length === 0 && (
                  <span className="text-xs text-muted-foreground italic">Sem interesses</span>
                )}
              </div>
            </div>
          </ReviewSection>

          {/* Placements */}
          <ReviewSection icon={<LayoutGrid className="h-3.5 w-3.5" />} title="Posicionamentos">
            {edited.adset.targeting.publisher_platforms ? (
              <div className="flex flex-wrap gap-1.5">
                {edited.adset.targeting.publisher_platforms.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <p className="text-sm">Automático (Advantage+) — Meta otimiza os posicionamentos</p>
              </div>
            )}
          </ReviewSection>
        </div>

        {/* Right: Creative preview */}
        <div className="xl:col-span-2 space-y-3">
          <ReviewSection
            icon={<ImageIcon className="h-3.5 w-3.5" />}
            title="Criativo do Anúncio"
          >
            {/* Image preview with change options */}
            {imagePreviewUrl && !imagePanel && (
              <div className="space-y-1.5">
                <div className="relative rounded-lg overflow-hidden border border-border group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreviewUrl} alt="Criativo" className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs bg-background/90"
                      onClick={() => setImagePanel("upload")}
                      disabled={disabled}
                    >
                      <Upload className="h-3 w-3" />Upload
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 text-xs bg-meta-blue/90 text-white hover:bg-meta-blue"
                      onClick={() => setImagePanel("generate")}
                      disabled={disabled}
                    >
                      <Wand2 className="h-3 w-3" />Gerar nova
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* No image — show action buttons */}
            {!imagePreviewUrl && !imagePanel && (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => setImagePanel("upload")} disabled={disabled}>
                  <Upload className="h-3.5 w-3.5" />Upload de imagem
                </Button>
                <Button type="button" size="sm" className="flex-1 gap-1.5 text-xs bg-meta-blue text-white hover:bg-meta-blue/90" onClick={() => setImagePanel("generate")} disabled={disabled}>
                  <Wand2 className="h-3.5 w-3.5" />Gerar com IA
                </Button>
              </div>
            )}

            {/* Inline image change panel */}
            {imagePanel && (
              <div className="rounded-lg border border-meta-blue/30 bg-meta-blue/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 rounded-md border border-border p-0.5 bg-background">
                    <button
                      type="button"
                      onClick={() => setImagePanel("upload")}
                      className={cn(
                        "flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-all",
                        imagePanel === "upload" ? "bg-meta-blue text-white" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Upload className="h-3 w-3" />Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImagePanel("generate")}
                      className={cn(
                        "flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-all",
                        imagePanel === "generate" ? "bg-meta-blue text-white" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Wand2 className="h-3 w-3" />Gerar com IA
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImagePanel(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>

                {imagePanel === "upload" && (
                  <ImageUpload
                    onUpload={(url, preview) => {
                      onImageChange(url, preview);
                      setImagePanel(null);
                    }}
                    onClear={() => onImageChange("", "")}
                    imageUrl={imageUrl}
                    disabled={disabled}
                  />
                )}

                {imagePanel === "generate" && (
                  <ImageGenerator
                    initialPrompt={`${edited.creative.title}. ${edited.creative.body.slice(0, 80)}`}
                    onAccept={(url) => {
                      onImageChange(url, url);
                      setImagePanel(null);
                    }}
                    disabled={disabled}
                  />
                )}
              </div>
            )}

            {/* Current image indicator when panel is open */}
            {imagePanel && imagePreviewUrl && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreviewUrl} alt="" className="h-8 w-12 object-cover rounded" />
                <span className="text-[11px] text-muted-foreground">Imagem atual — substituída ao confirmar</span>
              </div>
            )}

            <EditableField
              label="Título"
              value={edited.creative.title}
              onChange={(v) => set("creative", "title", v)}
              maxLength={40}
            />
            <EditableField
              label="Texto principal"
              value={edited.creative.body}
              onChange={(v) => set("creative", "body", v)}
              maxLength={125}
              multiline
            />
            <EditableField
              label="Descrição"
              value={edited.creative.description}
              onChange={(v) => set("creative", "description", v)}
              maxLength={30}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Botão (CTA)</p>
                <Badge variant="outline" className="text-xs">
                  {CTA_LABELS[edited.creative.call_to_action_type] ?? edited.creative.call_to_action_type}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Page ID</p>
                <p className="text-xs font-mono text-muted-foreground">{edited.creative.page_id || "—"}</p>
              </div>
            </div>

            <EditableField
              label="URL de destino"
              value={edited.creative.link}
              onChange={(v) => set("creative", "link", v)}
              type="url"
            />
          </ReviewSection>

          {/* Ad preview card */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-[#f0f2f5] dark:bg-zinc-800 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">Preview do Anúncio</p>
              {imagePreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreviewUrl} alt="" className="w-full h-32 object-cover rounded-t-lg" />
              )}
              <div className="rounded-b-lg border border-border bg-white dark:bg-zinc-900 px-3 py-2">
                <p className="text-[10px] text-muted-foreground truncate">
                  {edited.creative.link.replace(/^https?:\/\//, "")}
                </p>
                <p className="text-sm font-semibold text-foreground truncate">{edited.creative.title}</p>
                <p className="text-xs text-muted-foreground truncate">{edited.creative.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Patrocinado</span>
                  <span className="rounded border border-[#1877F2] text-[#1877F2] text-[10px] px-2 py-0.5 font-medium">
                    {CTA_LABELS[edited.creative.call_to_action_type] ?? edited.creative.call_to_action_type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning about page_id */}
      {!edited.creative.page_id && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            <strong>Page ID não informado.</strong> O criativo precisa de um Facebook Page ID para ser criado.
            Edite o campo "Page ID" no criativo acima ou configure o campo no formulário.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={disabled}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao formulário
        </Button>

        <div className="flex-1" />

        <Button
          variant="meta"
          onClick={() => onApprove(edited)}
          disabled={disabled}
          className="gap-2 px-6 shadow-md shadow-meta-blue/20"
        >
          <Send className="h-4 w-4" />
          {isMock ? "Simular criação" : "Aprovar e Criar Anúncio"}
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </div>
    </div>
  );
}
