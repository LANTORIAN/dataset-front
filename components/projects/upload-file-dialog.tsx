"use client";

import { useCallback, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { ragFilesService, ACCEPTED_FILE_TYPES } from "@/services/rag-files.service";

interface Props {
  projectId: string;
  apiKey: string;
  onUploaded: () => void;
}

type FileStatus = "pending" | "uploading" | "done" | "error";

interface FileEntry {
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
}

export function UploadFileDialog({ projectId, apiKey, onUploaded }: Props) {
  const [open, setOpen]       = useState(false);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);

  const addFiles = (files: FileList | File[]) =>
    setEntries((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({
        file, status: "pending" as FileStatus, progress: 0,
      })),
    ]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const removeEntry = (idx: number) =>
    setEntries((prev) => prev.filter((_, i) => i !== idx));

  const uploadAll = async () => {
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].status !== "pending") continue;
      setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, status: "uploading" } : e));
      const result = await ragFilesService.upload(projectId, entries[i].file, {
        apiKey,
        onProgress: (pct) =>
          setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, progress: pct } : e)),
      });
      setEntries((prev) => prev.map((e, idx) =>
        idx === i
          ? result.ok
            ? { ...e, status: "done", progress: 100 }
            : { ...e, status: "error", error: result.error }
          : e
      ));
    }
    onUploaded();
  };

  const allDone     = entries.length > 0 && entries.every((e) => e.status === "done" || e.status === "error");
  const hasUploading = entries.some((e) => e.status === "uploading");
  const hasPending   = entries.some((e) => e.status === "pending");

  const fmt = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEntries([]); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="size-4" />
          Importer des fichiers
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer des fichiers</DialogTitle>
          <DialogDescription>PDF, Markdown, TXT, DOCX, HTML, CSV — max 10 MB par fichier</DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          className={`rounded-lg border-2 border-dashed transition-colors p-6 text-center cursor-pointer ${
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <Upload className="mx-auto size-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Glissez-déposez ou{" "}
            <span className="text-primary font-medium">cliquez pour parcourir</span>
          </p>
          <input id="file-input" type="file" multiple accept={ACCEPTED_FILE_TYPES} className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)} />
        </div>

        {/* File list */}
        {entries.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {entries.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md border border-border p-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.file.name}</p>
                  <p className="text-xs text-muted-foreground">{fmt(entry.file.size)}</p>
                  {entry.status === "uploading" && (
                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${entry.progress}%` }} />
                    </div>
                  )}
                  {entry.status === "error" && (
                    <p className="text-xs text-destructive mt-0.5">{entry.error}</p>
                  )}
                </div>
                {entry.status === "done"    && <CheckCircle className="size-4 shrink-0 text-success" />}
                {entry.status === "error"   && <AlertCircle className="size-4 shrink-0 text-destructive" />}
                {entry.status === "pending" && (
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => removeEntry(i)}>
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setOpen(false); setEntries([]); }}>
            {allDone ? "Fermer" : "Annuler"}
          </Button>
          {!allDone && (
            <Button onClick={uploadAll} disabled={!hasPending || hasUploading}>
              {hasUploading ? "Upload en cours…" : "Uploader"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
