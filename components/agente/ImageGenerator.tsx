"use client";

import { useState } from "react";
import { Wand2, RefreshCw, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ImageGeneratorProps {
  initialPrompt?: string;
  onAccept: (url: string) => void;
  disabled?: boolean;
}

export function ImageGenerator({ initialPrompt = "", onAccept, disabled }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Falha ao gerar imagem");
      setGeneratedUrl(data.url ?? null);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Prompt textarea */}
      <div className="space-y-1.5">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Descreva a imagem do anúncio: produto, ambiente, estilo, cores..."
          rows={3}
          className="text-sm resize-none"
          disabled={loading || disabled}
        />
        <p className="text-[11px] text-muted-foreground">
          Seja específico. Ex: "Casal jovem praticando esportes ao ar livre, cores vibrantes, fundo branco"
        </p>
      </div>

      {/* Generate / Result */}
      {!generatedUrl ? (
        <Button
          type="button"
          className={cn("w-full h-9 gap-2 text-sm", loading && "bg-meta-blue/80")}
          onClick={generate}
          disabled={loading || !prompt.trim() || disabled}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Gerando imagem...</>
          ) : (
            <><Wand2 className="h-4 w-4" />Gerar imagem com IA</>
          )}
        </Button>
      ) : (
        <div className="space-y-2">
          {/* Preview */}
          <div className="relative rounded-xl overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedUrl} alt="Imagem gerada" className="w-full h-44 object-cover" />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-7 w-7 text-meta-blue animate-spin" />
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={generate}
              disabled={loading || disabled}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Gerar novamente
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 gap-1.5 text-xs bg-success hover:bg-success/90 text-white"
              onClick={() => onAccept(generatedUrl)}
              disabled={loading || disabled}
            >
              <Check className="h-3.5 w-3.5" />
              Usar esta imagem
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <X className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
