import { useEffect, useId, useRef, useState } from "react";
import { Camera, FileText, Loader2, Upload, X } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { createCameraFile, matchesFileAccept, withKnownFileType } from "@/lib/camera-file";
import { cn } from "@/lib/utils";

type FileCameraInputProps = {
  id?: string;
  label: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept: string;
  maxFiles?: number;
  maxSizeMB: number;
  disabled?: boolean;
  cameraOutput?: "jpeg" | "pdf";
  onBusyChange?: (busy: boolean) => void;
  className?: string;
};

export function FileCameraInput({
  id,
  label,
  files,
  onFilesChange,
  accept,
  maxFiles = 1,
  maxSizeMB,
  disabled = false,
  cameraOutput = "jpeg",
  onBusyChange,
  className,
}: FileCameraInputProps) {
  const { language } = useLanguage();
  const fr = language === "fr";
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const processing = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onBusyChange?.(false);
    };
  }, [onBusyChange]);

  async function selectFiles(selected: File[], fromCamera: boolean) {
    if (!selected.length || disabled || processing.current) return;
    processing.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setErrors([]);
    const messages: string[] = [];
    const next = maxFiles === 1 ? [] : [...files];
    let added = false;

    try {
      for (const original of selected) {
        if (next.length >= maxFiles) {
          messages.push(
            fr
              ? `Maximum ${maxFiles} fichier(s). Retirez un fichier pour en ajouter un autre.`
              : `Maximum ${maxFiles} file(s). Remove a file to add another.`,
          );
          break;
        }
        try {
          const file = fromCamera
            ? await createCameraFile(original, cameraOutput)
            : withKnownFileType(original);
          if (!mounted.current) return;
          if (!matchesFileAccept(file, accept)) {
            messages.push(
              fr
                ? `${original.name} : format non accepté.`
                : `${original.name}: unsupported format.`,
            );
          } else if (file.size === 0 || file.size > maxSizeMB * 1024 * 1024) {
            messages.push(
              fr
                ? `${original.name} : fichier vide ou supérieur à ${maxSizeMB} Mo.`
                : `${original.name}: empty file or larger than ${maxSizeMB} MB.`,
            );
          } else if (
            !next.some(
              (item) =>
                item.name === file.name &&
                item.size === file.size &&
                item.lastModified === file.lastModified,
            )
          ) {
            next.push(file);
            added = true;
          }
        } catch {
          messages.push(
            fr
              ? `${original.name} : impossible de préparer cette photo. Réessayez ou choisissez une image JPG ou PNG.`
              : `${original.name}: unable to prepare this photo. Try again or choose a JPG or PNG image.`,
          );
        }
      }
      if (mounted.current) {
        if (added) onFilesChange(next);
        setErrors(messages);
      }
    } finally {
      processing.current = false;
      if (mounted.current) {
        setBusy(false);
        onBusyChange?.(false);
      }
    }
  }

  const unavailable = disabled || busy;
  const buttonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      role="group"
      aria-label={label}
      aria-busy={busy}
      data-i18n-ignore="true"
      className={cn("min-w-0 space-y-3", className)}
    >
      <input
        id={inputId}
        ref={fileInput}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        disabled={unavailable}
        className="hidden"
        aria-label={fr ? "Choisir un fichier" : "Choose a file"}
        onChange={(event) => {
          const selected = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          void selectFiles(selected, false);
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={unavailable}
        className="hidden"
        aria-label={fr ? "Prendre une photo" : "Take a photo"}
        onChange={(event) => {
          const selected = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          void selectFiles(selected, true);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={unavailable}
          onClick={() => fileInput.current?.click()}
          className={cn(buttonClass, "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")}
        >
          <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
          {fr
            ? maxFiles > 1
              ? "Choisir des fichiers"
              : "Choisir un fichier"
            : maxFiles > 1
              ? "Choose files"
              : "Choose a file"}
        </button>
        <button
          type="button"
          disabled={unavailable}
          onClick={() => cameraInput.current?.click()}
          className={cn(buttonClass, "border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100")}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {fr ? "Prendre une photo" : "Take a photo"}
        </button>
      </div>
      <p className="text-xs text-slate-500" aria-live="polite">
        {busy
          ? fr
            ? "Préparation de la photo…"
            : "Preparing the photo…"
          : fr
            ? `${files.length}/${maxFiles} fichier(s) · ${maxSizeMB} Mo maximum par fichier.`
            : `${files.length}/${maxFiles} file(s) · Up to ${maxSizeMB} MB each.`}
      </p>
      {cameraOutput === "pdf" && (
        <p className="text-xs text-slate-500">
          {fr ? "La photo sera jointe sous forme de PDF." : "The photo will be attached as a PDF."}
        </p>
      )}
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {errors.map((message, index) => (
            <p className="break-words" key={index}>
              {message}
            </p>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-2"
            >
              <FilePreview file={file} />
              <div className="min-w-0 flex-1">
                <p className="break-all text-sm font-medium text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024 / 1024).toFixed(1)} {fr ? "Mo" : "MB"}
                </p>
              </div>
              <button
                type="button"
                disabled={unavailable}
                aria-label={`${fr ? "Retirer" : "Remove"} ${file.name}`}
                onClick={() => {
                  onFilesChange(files.filter((_, position) => position !== index));
                  setErrors([]);
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    setFailed(false);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">
      {url && !failed ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <FileText className="h-6 w-6 text-slate-400" aria-hidden="true" />
      )}
    </div>
  );
}
