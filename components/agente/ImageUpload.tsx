"use client";

import { useRef, useState, useCallback } from "react";
import { UploadCloud, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onUpload: (url: string, previewObjectUrl: string) => void;
  onClear: () => void;
  imageUrl: string | null;
  disabled?: boolean;
}

export function ImageUpload({ onUpload, onClear, imageUrl, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      setError("Apenas JPG e PNG são aceitos");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError("Arquivo deve ter menos de 30MB");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Falha no upload");
      }

      onUpload(data.url, localPreview);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  };

  if (imageUrl && preview) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Preview do criativo"
          className="w-full h-44 object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Remover
          </Button>
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
          <p className="text-xs text-white font-medium flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3" />
            Imagem enviada com sucesso
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed h-36 cursor-pointer transition-all",
          isDragging
            ? "border-meta-blue bg-meta-blue/5 scale-[1.01]"
            : "border-border hover:border-meta-blue/50 hover:bg-muted/50",
          uploading && "cursor-wait pointer-events-none opacity-70",
          disabled && "cursor-not-allowed opacity-50 pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        {uploading ? (
          <>
            <Loader2 className="h-7 w-7 text-meta-blue animate-spin" />
            <p className="text-sm text-muted-foreground">Enviando imagem...</p>
          </>
        ) : (
          <>
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
              isDragging ? "bg-meta-blue/10" : "bg-muted"
            )}>
              <UploadCloud className={cn("h-5 w-5", isDragging ? "text-meta-blue" : "text-muted-foreground")} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {isDragging ? "Solte a imagem aqui" : "Clique ou arraste a imagem"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">JPG ou PNG — máx. 30MB</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
