"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Bot, History, Sparkles, BarChart2, CheckCircle2,
  XCircle, Loader2, Check, Building2,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { AgentForm } from "@/components/agente/AgentForm";
import { AdPlanReview } from "@/components/agente/AdPlanReview";
import { RunHistory } from "@/components/agente/RunHistory";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  BusinessManager, AdAccount, AgentFormData,
  AdPlan, ExecuteStreamEvent, ExecuteResult,
} from "@/types";

type Phase =
  | "form"
  | "planning"
  | "review"
  | "executing"
  | "done"
  | "error";

interface ExecStep {
  step: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  value?: string;
}

interface ExecAccount {
  account_id: string;
  account_name: string;
  steps: ExecStep[];
}

const STEP_ORDER = [
  "upload_image",
  "create_campaign",
  "search_interests",
  "create_adset",
  "create_creative",
  "create_ad",
];

const STEP_LABELS: Record<string, string> = {
  upload_image: "Upload da imagem para Meta",
  create_campaign: "Criação da campanha",
  search_interests: "Busca de interesses",
  create_adset: "Criação do adset",
  create_creative: "Criação do criativo",
  create_ad: "Criação do anúncio",
};

function StepRow({ s }: { s: ExecStep }) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border px-3 py-2 transition-all",
      s.status === "done" && "border-success/30 bg-success/5",
      s.status === "running" && "border-meta-blue/30 bg-meta-blue/5",
      s.status === "error" && "border-destructive/30 bg-destructive/5",
      s.status === "pending" && "border-border bg-muted/20 opacity-50"
    )}>
      <div className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
        s.status === "done" && "bg-success/20",
        s.status === "running" && "bg-meta-blue/20",
        s.status === "error" && "bg-destructive/20",
        s.status === "pending" && "bg-muted"
      )}>
        {s.status === "done" && <Check className="h-3 w-3 text-success" />}
        {s.status === "running" && <Loader2 className="h-3 w-3 text-meta-blue animate-spin" />}
        {s.status === "error" && <XCircle className="h-3 w-3 text-destructive" />}
        {s.status === "pending" && <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          s.status === "done" && "text-success",
          s.status === "running" && "text-meta-blue",
          s.status === "pending" && "text-muted-foreground"
        )}>
          {s.label}
        </p>
        {s.value && s.status === "done" && (
          <p className="text-[11px] text-muted-foreground font-mono truncate">{s.value}</p>
        )}
      </div>
    </div>
  );
}

export default function AgentePage() {
  const [businessManagers, setBusinessManagers] = useState<BusinessManager[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [phase, setPhase] = useState<Phase>("form");
  const [planError, setPlanError] = useState<string | null>(null);
  const [plan, setPlan] = useState<AdPlan | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<AgentFormData | null>(null);

  const [execAccounts, setExecAccounts] = useState<ExecAccount[]>([]);
  const [execResults, setExecResults] = useState<ExecuteResult[] | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        setBusinessManagers(data.businessManagers ?? []);
        setAdAccounts(data.adAccounts ?? []);
        setLoadingAccounts(false);
      })
      .catch(() => setLoadingAccounts(false));
  }, []);

  const accountMap = Object.fromEntries(adAccounts.map((a) => [a.id, a.name]));

  const handleFormSubmit = useCallback(async (fd: AgentFormData, imgUrl: string, imgPreview: string) => {
    setFormData(fd);
    setImageUrl(imgUrl);
    setImagePreviewUrl(imgPreview);
    setPhase("planning");
    setPlanError(null);

    try {
      const res = await fetch("/api/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: fd, imageUrl: imgUrl }),
      });
      const data = await res.json() as { plan?: AdPlan; mock?: boolean; error?: string };

      if (!res.ok || data.error) {
        setPlanError(data.error ?? "Falha ao gerar plano");
        setPhase("error");
        return;
      }

      setPlan(data.plan!);
      setIsMock(data.mock ?? false);
      setPhase("review");
    } catch (err) {
      setPlanError(String(err instanceof Error ? err.message : err));
      setPhase("error");
    }
  }, []);

  const handleApprove = useCallback(async (approvedPlan: AdPlan) => {
    if (!imageUrl || !formData) return;
    setPhase("executing");
    setExecResults(null);

    // Pre-initialize step groups per account
    const initialAccounts: ExecAccount[] = formData.account_ids.map((id) => {
      const account = adAccounts.find((a) => a.id === id);
      return {
        account_id: id,
        account_name: account?.name ?? id,
        steps: STEP_ORDER.map((step) => ({
          step,
          label: STEP_LABELS[step] ?? step,
          status: "pending" as const,
        })),
      };
    });
    setExecAccounts(initialAccounts);

    // Create run record (non-blocking)
    let currentRunId: string | null = null;
    try {
      const { supabaseAdmin } = await import("@/lib/supabase");
      const { data: run } = await supabaseAdmin
        .from("agent_runs")
        .insert({
          account_id: formData.account_ids[0] ?? null,
          form_data: formData,
          image_url: imageUrl,
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      currentRunId = run?.id ?? null;
    } catch {
      // Non-fatal
    }

    try {
      const res = await fetch("/api/agente/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: approvedPlan,
          imageUrl,
          accountIds: formData.account_ids,
          runId: currentRunId,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ message: "Falha na execução" })) as { message?: string };
        setPlanError(err.message ?? "Erro desconhecido");
        setPhase("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as ExecuteStreamEvent;

            if (event.type === "step" && event.account_id) {
              setExecAccounts((prev) =>
                prev.map((acct) =>
                  acct.account_id === event.account_id
                    ? {
                        ...acct,
                        steps: acct.steps.map((s) =>
                          s.step === event.step
                            ? { ...s, status: event.status as ExecStep["status"], label: event.label ?? s.label, value: event.value }
                            : s
                        ),
                      }
                    : acct
                )
              );
            } else if (event.type === "done" && event.results) {
              setExecResults(event.results);
              setPhase("done");
              setHistoryRefreshKey((k) => k + 1);
            } else if (event.type === "error") {
              setPlanError(event.message ?? "Erro na execução");
              setPhase("error");
              setHistoryRefreshKey((k) => k + 1);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setPlanError(String(err instanceof Error ? err.message : err));
      setPhase("error");
    }
  }, [imageUrl, formData, adAccounts]);

  const handleReset = () => {
    setPhase("form");
    setPlan(null);
    setPlanError(null);
    setExecAccounts([]);
    setExecResults(null);
    setImageUrl(null);
    setImagePreviewUrl(null);
    setFormData(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-meta-blue">
                  <span className="text-xs font-bold text-white">N</span>
                </div>
                <span className="text-base font-bold tracking-tight">NaviDash</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <BarChart2 className="h-3.5 w-3.5" />
                    Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs bg-meta-blue text-white hover:bg-meta-blue/90" disabled>
                  <Bot className="h-3.5 w-3.5" />
                  Agente
                </Button>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 rounded-full border border-meta-blue/30 bg-meta-blue/5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-meta-blue" />
              <span className="text-xs font-medium text-meta-blue">
                {isMock ? "Modo Simulação" : "Powered by Claude"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {phase !== "form" && phase !== "planning" && (
                <Button variant="outline" size="sm" onClick={handleReset} disabled={phase === "executing"} className="h-8 text-xs hidden sm:flex">
                  Nova criação
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-screen-2xl px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-5 w-5 text-meta-blue" />
            Agente de Criação de Anúncios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preencha o formulário, revise o plano gerado pela IA e aprove para criar o anúncio na Meta.
          </p>
        </div>

        {/* ── Phase: Form ─────────────────────────────────────────────── */}
        {phase === "form" && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-meta-blue/10">
                  <Sparkles className="h-3.5 w-3.5 text-meta-blue" />
                </div>
                <h2 className="text-sm font-semibold">Dados do Anúncio</h2>
                <div className="ml-auto">
                  <span className="text-[11px] text-muted-foreground">
                    Após preencher, a IA irá gerar um plano para revisão
                  </span>
                </div>
              </div>

              {loadingAccounts ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Carregando contas...</span>
                </div>
              ) : (
                <AgentForm
                  businessManagers={businessManagers}
                  adAccounts={adAccounts}
                  onSubmit={handleFormSubmit}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Phase: Planning ──────────────────────────────────────────── */}
        {phase === "planning" && (
          <div className="max-w-md mx-auto">
            <div className="rounded-xl border border-border bg-card p-8 text-center space-y-5">
              <div className="flex justify-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-meta-blue/10">
                  <Bot className="h-8 w-8 text-meta-blue" />
                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-meta-blue">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-base font-semibold mb-1">Analisando seus dados...</h2>
                <p className="text-sm text-muted-foreground">
                  O Claude está gerando um plano otimizado de campanha com base nas suas informações.
                </p>
              </div>
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-meta-blue animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Isso leva alguns segundos...</p>
            </div>
          </div>
        )}

        {/* ── Phase: Review ────────────────────────────────────────────── */}
        {phase === "review" && plan && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-meta-blue text-white text-xs font-bold">2</div>
              <h2 className="text-base font-semibold">Revisar e Aprovar o Plano</h2>
              <span className="text-xs text-muted-foreground ml-1">
                Edite qualquer campo passando o mouse sobre ele — depois aprove para criar.
              </span>
            </div>
            <AdPlanReview
              plan={plan}
              imageUrl={imageUrl}
              imagePreviewUrl={imagePreviewUrl}
              isMock={isMock}
              onApprove={handleApprove}
              onBack={handleReset}
              onImageChange={(url, preview) => {
                setImageUrl(url || null);
                setImagePreviewUrl(preview || null);
              }}
            />
          </div>
        )}

        {/* ── Phase: Executing ─────────────────────────────────────────── */}
        {phase === "executing" && (
          <div className="max-w-lg mx-auto">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-meta-blue/10">
                    <Loader2 className="h-6 w-6 text-meta-blue animate-spin" />
                  </div>
                </div>
                <h2 className="text-base font-semibold">Criando campanha na Meta...</h2>
                <p className="text-xs text-muted-foreground">
                  {execAccounts.length > 1
                    ? `Criando em ${execAccounts.length} contas sequencialmente`
                    : "Aguarde enquanto o anúncio é configurado"}
                </p>
              </div>

              <div className="space-y-4">
                {execAccounts.map((acct) => (
                  <div key={acct.account_id} className="space-y-1.5">
                    {execAccounts.length > 1 && (
                      <div className="flex items-center gap-2 px-1">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-semibold text-muted-foreground">{acct.account_name}</span>
                      </div>
                    )}
                    {acct.steps.map((s) => <StepRow key={s.step} s={s} />)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Phase: Done ──────────────────────────────────────────────── */}
        {phase === "done" && execResults && (
          <div className="max-w-lg mx-auto">
            <div className="rounded-xl border border-success/30 bg-success/5 p-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                </div>
                <h2 className="text-lg font-bold text-success">
                  {isMock ? "Simulação concluída!" : execResults.length > 1 ? "Anúncios criados com sucesso!" : "Anúncio criado com sucesso!"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isMock
                    ? "Todos os passos foram simulados. Configure as credenciais reais para criar anúncios de verdade."
                    : "Campanha criada com status PAUSADO. Revise no Ads Manager e ative manualmente quando pronto."}
                </p>
              </div>

              <div className="space-y-3">
                {execResults.map((r) => (
                  <div key={r.account_id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    {execResults.length > 1 && (
                      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold">{r.account_name}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Campanha", value: r.campaign_id },
                        { label: "Adset", value: r.adset_id },
                        { label: "Criativo", value: r.creative_id },
                        { label: "Anúncio", value: r.ad_id },
                      ].map((item) => (
                        <div key={item.label} className="rounded-md border border-border bg-muted/30 px-3 py-1.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label} ID</p>
                          <p className="text-xs font-mono text-foreground mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {!isMock && (
                      <a
                        href={`https://adsmanager.facebook.com/adsmanager/manage/ads?act=${r.account_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-lg border border-meta-blue/30 bg-meta-blue/5 px-4 py-2 text-xs text-meta-blue font-medium hover:bg-meta-blue/10 transition-colors"
                      >
                        Abrir no Ads Manager
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full" onClick={handleReset}>
                Criar outro anúncio
              </Button>
            </div>
          </div>
        )}

        {/* ── Phase: Error ─────────────────────────────────────────────── */}
        {phase === "error" && (
          <div className="max-w-md mx-auto">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4 text-center">
              <div className="flex justify-center">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-destructive mb-1">Ocorreu um erro</h2>
                <p className="text-sm text-muted-foreground">{planError}</p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={handleReset}>Recomeçar</Button>
                {plan && (
                  <Button variant="meta" onClick={() => setPhase("review")}>Voltar à revisão</Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Run History ───────────────────────────────────────────────── */}
        <div className="mt-10">
          <Tabs defaultValue="history">
            <TabsList className="h-9">
              <TabsTrigger value="history" className="gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Histórico de Criações
              </TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <RunHistory accountMap={accountMap} refreshKey={historyRefreshKey} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
