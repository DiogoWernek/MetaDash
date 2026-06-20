"use client";

import { useEffect, useState } from "react";
import { Clock, ChevronDown, ChevronUp, ExternalLink, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentRun } from "@/types";

const STATUS_CONFIG = {
  success: {
    label: "Sucesso",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  failed: {
    label: "Falhou",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  partial: {
    label: "Parcial",
    icon: AlertTriangle,
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  running: {
    label: "Executando",
    icon: Loader2,
    className: "bg-meta-blue/10 text-meta-blue border-meta-blue/20",
  },
  pending: {
    label: "Pendente",
    icon: Clock,
    className: "bg-muted text-muted-foreground border-border",
  },
} as const;

const OBJECTIVES: Record<string, string> = {
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_LEADS: "Cadastros",
  OUTCOME_SALES: "Vendas",
  OUTCOME_AWARENESS: "Reconhecimento",
  OUTCOME_ENGAGEMENT: "Engajamento",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RunRow({ run, accountName }: { run: AgentRun; accountName?: string }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  const hasIds = run.meta_campaign_id || run.meta_adset_id || run.meta_ad_id;
  const adsManagerUrl = run.meta_ad_id
    ? `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${run.form_data?.account_ids?.[0] ?? ""}`
    : null;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <Icon className={cn(
          "h-4 w-4 shrink-0",
          run.status === "running" && "animate-spin",
          run.status === "success" && "text-success",
          run.status === "failed" && "text-destructive",
          run.status === "partial" && "text-yellow-500",
          run.status === "pending" && "text-muted-foreground"
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">
              {run.form_data?.campaign_name ?? "Campanha sem nome"}
            </span>
            <Badge
              variant="outline"
              className={cn("text-[10px] h-4 px-1.5 shrink-0", cfg.className)}
            >
              {cfg.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {accountName && (
              <span className="text-xs text-muted-foreground truncate">{accountName}</span>
            )}
            {run.form_data?.objective && (
              <span className="text-[11px] text-muted-foreground">
                {OBJECTIVES[run.form_data.objective] ?? run.form_data.objective}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto">
              {formatDate(run.created_at)}
            </span>
          </div>
        </div>

        <div className="text-muted-foreground shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20">
          {/* IDs */}
          {hasIds && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Campanha", value: run.meta_campaign_id },
                { label: "Adset", value: run.meta_adset_id },
                { label: "Criativo", value: run.meta_creative_id },
                { label: "Anúncio", value: run.meta_ad_id },
              ].filter((r) => r.value).map((r) => (
                <div key={r.label} className="rounded-md bg-card border border-border px-2.5 py-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{r.label}</p>
                  <p className="text-xs font-mono text-foreground">{r.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {run.error_log && (
            <div className="rounded-md bg-destructive/5 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive font-medium mb-0.5">Erro:</p>
              <p className="text-xs text-destructive/80 font-mono break-all">{run.error_log}</p>
            </div>
          )}

          {/* Agent log */}
          {run.agent_messages && run.agent_messages.length > 0 && (
            <details className="group">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                Ver log completo do agente
              </summary>
              <div className="mt-2 rounded-md bg-card border border-border p-3 max-h-40 overflow-y-auto">
                <pre className="text-[11px] text-foreground/80 whitespace-pre-wrap font-mono">
                  {run.agent_messages.join("")}
                </pre>
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {adsManagerUrl && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                asChild
              >
                <a href={adsManagerUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  Ads Manager
                </a>
              </Button>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto">
              {run.finished_at ? `Concluído em ${formatDate(run.finished_at)}` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface RunHistoryProps {
  accountMap?: Record<string, string>;
  refreshKey?: number;
}

export function RunHistory({ accountMap = {}, refreshKey }: RunHistoryProps) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    import("@/lib/supabase-client").then(({ getSupabaseClient }) => {
      getSupabaseClient()
        .from("agent_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }: { data: AgentRun[] | null }) => {
          setRuns(data ?? []);
          setLoading(false);
        });
    });
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando histórico...</span>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhuma criação ainda</p>
        <p className="text-xs text-muted-foreground/60">
          Seu histórico de campanhas criadas pelo agente aparecerá aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <RunRow
          key={run.id}
          run={run}
          accountName={accountMap[run.account_id ?? ""] ?? undefined}
        />
      ))}
    </div>
  );
}
