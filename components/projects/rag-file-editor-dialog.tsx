"use client";

import { useEffect, useState } from "react";
import { AlertCircle, FileText, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ragFilesService } from "@/services/rag-files.service";
import type { RagFile, RagFileContent } from "@/types";

interface Props {
  projectId: string;
  apiKey: string;
  file: RagFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function fmt(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function RagFileEditorDialog({
  projectId,
  apiKey,
  file,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [content, setContent] = useState<RagFileContent | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const filename = file?.filename;

  useEffect(() => {
    if (!open || !filename || !apiKey) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setContent(null);
      setDraft("");
      ragFilesService
        .getContent(projectId, filename, apiKey)
        .then((result) => {
          if (result.ok) {
            setContent(result.data);
            setDraft(result.data.content);
          }
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, filename, projectId, apiKey]);

  const handleSave = async () => {
    if (!filename || !content?.editable) return;
    setSaving(true);
    const result = await ragFilesService.updateContent(projectId, filename, apiKey, draft);
    setSaving(false);
    if (result.ok) {
      onSaved();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            {file?.filename ?? "Fichier RAG"}
          </DialogTitle>
          <DialogDescription>
            Lecture directe du fichier source. Les fichiers texte peuvent être modifiés puis réindexés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : content ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={content.editable ? "default" : "outline"}>
                  {content.editable ? "Modifiable" : "Lecture seule"}
                </Badge>
                <span>{fmt(content.size_bytes)}</span>
                {!content.editable && (
                  <span className="inline-flex items-center gap-1 text-warning-surface-foreground">
                    <AlertCircle className="size-3" /> Format non éditable en texte direct
                  </span>
                )}
              </div>

              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                readOnly={!content.editable}
                className="min-h-[55vh] resize-none font-mono text-xs leading-relaxed"
                spellCheck={false}
              />
            </>
          ) : (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              Impossible de charger le contenu du fichier.
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button
            onClick={handleSave}
            disabled={!content?.editable || saving || draft === content?.content}
            className="gap-2"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Enregistrer et réindexer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
