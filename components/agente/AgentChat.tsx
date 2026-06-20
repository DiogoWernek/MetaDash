"use client";

import { useEffect, useRef } from "react";
import { Loader2, Check, AlertCircle, Copy, ExternalLink, Bot, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { TOOL_LABELS } from "@/lib/agent";

interface AgentChatProps {
  messages: ChatMessage[];
  isRunning: boolean;
  hasContent: boolean;
}

function renderTextLine(line: string, idx: number) {
  // ✅ success line
  if (line.startsWith("- ✅") || line.startsWith("✅")) {
    return (
      <div key={idx} className="flex items-start gap-2 py-0.5">
        <span className="text-success shrink-0 mt-px">✅</span>
        <span className="text-sm text-foreground">{line.replace(/^-?\s*✅\s*/, "")}</span>
      </div>
    );
  }
  // ⚠️ warning line
  if (line.startsWith("- ⚠️") || line.startsWith("⚠️")) {
    return (
      <div key={idx} className="flex items-start gap-2 py-0.5">
        <span className="shrink-0 mt-px">⚠️</span>
        <span className="text-sm text-yellow-600 dark:text-yellow-400">{line.replace(/^-?\s*⚠️\s*/, "")}</span>
      </div>
    );
  }
  // 🔗 link line
  if (line.startsWith("- 🔗") || line.startsWith("🔗")) {
    const urlMatch = line.match(/https?:\/\/[^\s]+/);
    const url = urlMatch?.[0];
    const label = line.replace(/^-?\s*🔗\s*/, "").replace(url ?? "", "").replace("Link para revisar:", "").trim();
    return (
      <div key={idx} className="flex items-start gap-2 py-0.5">
        <span className="shrink-0 mt-px">🔗</span>
        <div className="flex flex-col gap-0.5">
          {label && <span className="text-sm text-muted-foreground">{label}</span>}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-meta-blue hover:underline flex items-center gap-1 break-all"
            >
              {url}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
        </div>
      </div>
    );
  }
  // Bold headers (##)
  if (line.startsWith("## ")) {
    return (
      <p key={idx} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-2 mb-0.5">
        {line.slice(3)}
      </p>
    );
  }
  // Empty line
  if (!line.trim()) return <div key={idx} className="h-2" />;
  // Default
  return (
    <p key={idx} className="text-sm text-foreground/90 leading-relaxed">
      {line}
    </p>
  );
}

export function AgentChat({ messages, isRunning, hasContent }: AgentChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fullText = messages
    .filter((m) => m.type === "text")
    .map((m) => m.content ?? "")
    .join("");

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
  };

  if (!hasContent && !isRunning) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6 py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-meta-blue/10 border border-meta-blue/20">
          <Bot className="h-8 w-8 text-meta-blue" />
        </div>
        <div>
          <h3 className="text-base font-semibold mb-1">Agente de Criação de Anúncios</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Preencha o formulário à esquerda e o agente irá criar a campanha completa na sua conta Meta de forma automática.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs mt-2">
          {["Upload de imagem", "Criação de campanha", "Configuração de público"].map((step) => (
            <div key={step} className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-muted/50 border border-border">
              <div className="h-1.5 w-1.5 rounded-full bg-meta-blue" />
              <span className="text-[10px] text-center text-muted-foreground leading-tight">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.map((msg, i) => {
          if (msg.type === "tool") {
            const isDone = msg.toolStatus === "done";
            const toolLabel = msg.toolName ? TOOL_LABELS[msg.toolName] ?? `${msg.toolName}...` : "";
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all",
                  isDone
                    ? "border-success/30 bg-success/5 text-success"
                    : "border-meta-blue/30 bg-meta-blue/5 text-meta-blue"
                )}
              >
                {isDone ? (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20">
                    <Check className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-meta-blue/20">
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                )}
                <Wrench className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="font-medium">
                  {isDone ? (msg.content ?? "Concluído") : toolLabel}
                </span>
              </div>
            );
          }

          if (msg.type === "error") {
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5"
              >
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{msg.content}</p>
              </div>
            );
          }

          if (msg.type === "text" && msg.content) {
            const lines = msg.content.split("\n");
            return (
              <div key={i} className="space-y-0.5">
                {lines.map((line, li) => renderTextLine(line, li))}
              </div>
            );
          }

          return null;
        })}

        {/* Typing indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-meta-blue animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Agente trabalhando...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer actions */}
      {!isRunning && fullText && (
        <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Revise os IDs criados e ative manualmente no Ads Manager
          </span>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0" onClick={handleCopy}>
            <Copy className="h-3 w-3" />
            Copiar resumo
          </Button>
        </div>
      )}
    </div>
  );
}
