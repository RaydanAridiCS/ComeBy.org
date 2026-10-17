"use client";

import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type DragEvent, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LIMITS } from "@/config/limits";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_MB = LIMITS.coverImageMaxBytes / (1024 * 1024);

/**
 * Picks a cover image (click or drag & drop). The parent decides when to upload
 * (immediately when editing, right after creation for new events). Shows a local
 * preview either way.
 */
export function CoverPicker({
  currentUrl,
  file,
  onFileChange,
  onRemoveCurrent,
  busy,
}: {
  currentUrl: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRemoveCurrent?: () => void;
  busy?: boolean;
}) {
  const t = useTranslations("eventForm");
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview ?? currentUrl;

  function pick(picked: File | null | undefined) {
    if (!picked) return;
    if (!ACCEPT.split(",").includes(picked.type)) {
      setError(t("coverWrongType"));
      return;
    }
    if (picked.size > LIMITS.coverImageMaxBytes) {
      setError(t("coverTooBig", { max: MAX_MB }));
      return;
    }
    setError(null);
    onFileChange(picked);
  }

  const dropHandlers = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      if (!busy) setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      if (!busy) pick(event.dataTransfer.files?.[0]);
    },
  };

  return (
    <div className="flex flex-col gap-2.5">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        aria-describedby={hintId}
        className="peer sr-only"
        tabIndex={shown ? -1 : 0}
        disabled={busy}
        onChange={(event) => {
          const picked = event.target.files?.[0] ?? null;
          event.target.value = "";
          pick(picked);
        }}
      />
      {shown ? (
        <div className="group relative overflow-hidden rounded-2xl border" {...dropHandlers}>
          {/* biome-ignore lint/performance/noImgElement: local blob previews can't use next/image */}
          <img
            src={shown}
            alt=""
            className={cn(
              "aspect-[16/9] w-full object-cover transition-opacity",
              busy && "opacity-60",
            )}
          />
          <div className="absolute end-3 bottom-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="bg-card/90 backdrop-blur"
            >
              <RefreshCw />
              {t("coverReplace")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (file) onFileChange(null);
                else onRemoveCurrent?.();
              }}
              className="bg-card/90 backdrop-blur"
            >
              <Trash2 />
              {t("coverRemove")}
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          {...dropHandlers}
          className={cn(
            "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40",
            dragging
              ? "border-brand-500 bg-brand-50"
              : "border-border bg-muted/40 hover:border-brand-300 hover:bg-brand-50/50",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-card text-brand-700 shadow-xs">
            <ImagePlus className="size-5" aria-hidden="true" />
          </span>
          <span className="font-semibold text-sm">{t("coverDrop")}</span>
          <span className="text-muted-foreground text-xs">{t("coverOptional")}</span>
        </label>
      )}
      <p
        id={hintId}
        className={error ? "text-destructive text-sm" : "text-muted-foreground text-xs"}
      >
        {error ?? t("coverHint", { max: MAX_MB })}
      </p>
    </div>
  );
}
