"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Film, Video, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import type { AdVideoData, AdCreativeData, AdSocialData } from "@/app/api/ad-details/route";

interface AdDetailsModalProps {
  metaAdId: string;
  adName: string;
  accountId: string;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

function MetricRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-2 rounded-md",
      highlight ? "bg-meta-blue/5" : "hover:bg-muted/40"
    )}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-xs font-medium", highlight && "text-meta-blue")}>{value}</span>
    </div>
  );
}

function ProgressBar({ label, value, max, pct }: { label: string; value: number; max: number; pct: string }) {
  const ratio = max > 0 ? value / max : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{pct}</span>
        <span className="font-mono text-xs font-medium">{formatNumber(value)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-meta-blue transition-all"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground/60">{label}</span>
    </div>
  );
}

export function AdDetailsModal({
  metaAdId,
  adName,
  accountId,
  startDate,
  endDate,
  onClose,
}: AdDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<AdVideoData | null>(null);
  const [creative, setCreative] = useState<AdCreativeData | null>(null);
  const [social, setSocial] = useState<AdSocialData | null>(null);
  const [imgError, setImgError] = useState(false);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ metaAdId, accountId, startDate, endDate });
      const res = await fetch(`/api/ad-details?${params}`);
      if (!res.ok) throw new Error("Falha ao carregar");
      const data = await res.json();
      setVideo(data.video ?? null);
      setCreative(data.creative ?? null);
      setSocial(data.social ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [metaAdId, accountId, startDate, endDate]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const previewSrc = creative?.thumbnail_url ?? creative?.image_url ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl rounded-xl bg-background border border-border shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-meta-blue/10">
            <Video className="h-4 w-4 text-meta-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Anúncio · Métricas de Vídeo &amp; Criativo</p>
            <p className="text-sm font-semibold truncate">{adName}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-5 border-r border-border/50 space-y-3">
                <Skeleton className="w-full h-48 rounded-lg" />
                <Skeleton className="w-2/3 h-4" />
              </div>
              <div className="p-5 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-danger/60" />
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={fetchDetails}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Left: Creative Preview */}
              <div className="p-5 border-r border-border/50 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prévia do Criativo</p>

                {previewSrc && !imgError ? (
                  <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
                    <img
                      src={previewSrc}
                      alt={creative?.name ?? adName}
                      className="w-full object-cover max-h-72"
                      onError={() => setImgError(true)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 rounded-lg border border-dashed border-border bg-muted/20 gap-3">
                    <Film className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground text-center px-4">
                      {creative?.is_video
                        ? "Prévia de vídeo não disponível — acesse o Gerenciador de Anúncios para visualizar"
                        : "Prévia não disponível"}
                    </p>
                  </div>
                )}

                {creative?.name && (
                  <p className="text-xs text-muted-foreground">{creative.name}</p>
                )}

                {creative?.ads_manager_url && (
                  <a
                    href={creative.ads_manager_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver no Gerenciador de Anúncios
                  </a>
                )}

                {creative?.is_video && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-meta-blue/30 bg-meta-blue/10 px-2.5 py-1">
                    <Video className="h-3 w-3 text-meta-blue" />
                    <span className="text-[10px] font-medium text-meta-blue">Vídeo</span>
                  </div>
                )}
              </div>

              {/* Right: Video Metrics */}
              <div className="p-5 space-y-4 flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Métricas de Vídeo</p>

                {video ? (
                  <div className="space-y-1">
                    {/* Key metrics */}
                    <MetricRow
                      label="ThruPlay (visualizações completas)"
                      value={formatNumber(video.thruplay)}
                      highlight
                    />
                    <MetricRow
                      label="Custo por ThruPlay"
                      value={video.cost_per_thruplay ? formatCurrency(video.cost_per_thruplay) : "—"}
                    />
                    <MetricRow
                      label="Reproduções totais"
                      value={formatNumber(video.video_plays)}
                    />
                    <MetricRow
                      label="Custo por Reprodução"
                      value={video.cost_per_video_play ? formatCurrency(video.cost_per_video_play) : "—"}
                    />
                    {video.avg_watch_time !== undefined && (
                      <MetricRow
                        label="Tempo Médio de Reprodução"
                        value={`${video.avg_watch_time.toFixed(1)}s`}
                      />
                    )}

                    {/* Quartile breakdown */}
                    <div className="pt-2 border-t border-border/50 mt-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Retenção por Quartil
                      </p>
                      <div className="space-y-3">
                        <ProgressBar label="25% do vídeo" pct="25%" value={video.p25} max={video.video_plays} />
                        <ProgressBar label="50% do vídeo" pct="50%" value={video.p50} max={video.video_plays} />
                        <ProgressBar label="75% do vídeo" pct="75%" value={video.p75} max={video.video_plays} />
                        <ProgressBar label="100% do vídeo" pct="100%" value={video.p100} max={video.video_plays} />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50">
                      <MetricRow label="Gasto no período" value={formatCurrency(video.spend)} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p className="text-xs">Nenhuma métrica de vídeo disponível para este período</p>
                  </div>
                )}
              </div>
              </div>{/* end grid */}

              {/* Social Engagement Section */}
              {social && (
                <div className="border-t border-border/50 px-5 py-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Engajamento Social</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { label: "Reações", value: social.post_reactions },
                      { label: "Comentários", value: social.post_comments },
                      { label: "Compartilhamentos", value: social.post_shares },
                      { label: "Seguidores Ganhos", value: social.follows },
                      { label: "Visitas ao Perfil", value: social.profile_visits },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-muted/30 px-3 py-2.5 space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                        <p className="font-mono text-sm font-semibold">{value > 0 ? formatNumber(value) : <span className="text-muted-foreground text-xs">—</span>}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
