"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiAnalysisData } from "@/types";

interface AiAnalysisModalProps {
  data: AiAnalysisData;
  onClose: () => void;
}

const TYPE_LABELS: Record<AiAnalysisData["type"], string> = {
  campanha: "Campanha",
  conjunto: "Conjunto de Anúncios",
  anuncio: "Anúncio",
};

type Node = { tag: "h2" | "h3" | "p" | "bullet" | "numbered" | "hr" | "blank"; text: string; num?: number };

function parseLine(line: string): Node {
  if (line.startsWith("## ")) return { tag: "h2", text: line.slice(3) };
  if (line.startsWith("# ")) return { tag: "h3", text: line.slice(2) };
  if (line === "---") return { tag: "hr", text: "" };
  if (line === "") return { tag: "blank", text: "" };
  const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
  if (numberedMatch) return { tag: "numbered", text: numberedMatch[2], num: parseInt(numberedMatch[1]) };
  if (line.startsWith("- ") || line.startsWith("• ")) return { tag: "bullet", text: line.slice(2) };
  return { tag: "p", text: line };
}

function renderBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-foreground">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

function MarkdownContent({ text }: { text: string }) {
  const nodes = text.split("\n").map(parseLine);

  return (
    <div className="space-y-1">
      {nodes.map((node, i) => {
        if (node.tag === "blank") return <div key={i} className="h-1.5" />;
        if (node.tag === "hr") return <hr key={i} className="my-2 border-border/60" />;
        if (node.tag === "h2") return (
          <h3 key={i} className="text-sm font-bold text-foreground mt-5 mb-1.5 pb-1 border-b border-border/40">
            {renderBold(node.text)}
          </h3>
        );
        if (node.tag === "h3") return (
          <h4 key={i} className="text-sm font-semibold text-foreground mt-4 mb-1">
            {renderBold(node.text)}
          </h4>
        );
        if (node.tag === "bullet") return (
          <div key={i} className="flex gap-2 text-sm text-foreground/90 leading-relaxed pl-1">
            <span className="text-violet-400 shrink-0 mt-0.5">•</span>
            <span>{renderBold(node.text)}</span>
          </div>
        );
        if (node.tag === "numbered") return (
          <div key={i} className="flex gap-2 text-sm text-foreground/90 leading-relaxed pl-1">
            <span className="text-violet-400 shrink-0 font-mono text-xs mt-0.5 w-4">{node.num}.</span>
            <span>{renderBold(node.text)}</span>
          </div>
        );
        return (
          <p key={i} className="text-sm text-foreground/90 leading-relaxed">
            {renderBold(node.text)}
          </p>
        );
      })}
    </div>
  );
}

export function AiAnalysisModal({ data, onClose }: AiAnalysisModalProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const response = await fetch("/api/ai-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          setError("Erro ao gerar análise. Verifique a configuração da API.");
          setLoading(false);
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        setLoading(false);
        setStreaming(true);

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          setText((prev) => prev + decoder.decode(value, { stream: true }));
        }

        if (!cancelled) setStreaming(false);
      } catch {
        if (!cancelled) {
          setError("Erro de conexão. Tente novamente.");
          setLoading(false);
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 shrink-0">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">
              {TYPE_LABELS[data.type]} · Análise IA
            </span>
            <p className="text-sm font-semibold truncate leading-snug">{data.name}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
              <p className="text-sm">Analisando dados com IA...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div>
              <MarkdownContent text={text} />
              {streaming && (
                <span className="inline-block w-0.5 h-3.5 bg-violet-400 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
