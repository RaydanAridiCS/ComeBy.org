"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LIMITS } from "@/config/limits";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_MB = LIMITS.coverImageMaxBytes / (1024 * 1024);

/**
 * Picks a cover image. The parent decides when to upload (immediately when editing,
 * right after creation for new events). Shows a local preview either way.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-3">
      {shown ? (
        // biome-ignore lint/performance/noImgElement: local blob previews can't use next/image
        <img src={shown} alt="" className="aspect-video w-full rounded-xl border object-cover" />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const picked = event.target.files?.[0] ?? null;
            event.target.value = "";
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
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus />
          {shown ? t("coverReplace") : t("coverUpload")}
        </Button>
        {shown ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (file) onFileChange(null);
              else onRemoveCurrent?.();
            }}
          >
            <Trash2 />
            {t("coverRemove")}
          </Button>
        ) : null}
      </div>
      <p className={error ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
        {error ?? t("coverHint", { max: MAX_MB })}
      </p>
    </div>
  );
}
