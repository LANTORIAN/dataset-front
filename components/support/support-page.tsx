"use client";

import { useEffect, useState } from "react";
import {
  LifeBuoy, Send, RefreshCw, Loader2, MessageSquare,
  CheckCircle, Clock, AlertCircle, Reply, ChevronDown,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { supportService } from "@/services/support.service";
import { useAuth } from "@/lib/context/auth-context";
import type { SupportTicket, TicketStatus, SupportContent, CreateTicketPayload, UpdateTicketPayload } from "@/types";

// ── Badge helpers ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TicketStatus, string> = {
  open:        "Ouvert",
  in_progress: "En cours",
  closed:      "Fermé",
};

const STATUS_ICON: Record<TicketStatus, React.ReactNode> = {
  open:        <AlertCircle className="size-3.5 text-blue-500" />,
  in_progress: <Clock className="size-3.5 text-yellow-500" />,
  closed:      <CheckCircle className="size-3.5 text-muted-foreground" />,
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const variantMap: Record<TicketStatus, "default" | "secondary" | "outline"> = {
    open:        "default",
    in_progress: "secondary",
    closed:      "outline",
  };
  return (
    <Badge variant={variantMap[status]} className="gap-1 text-xs">
      {STATUS_ICON[status]}
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Admin reply dialog ────────────────────────────────────────────────────────

interface ReplyDialogProps {
  ticket: SupportTicket | null;
  onClose: () => void;
  onSaved: (updated: SupportTicket) => void;
}

function ReplyDialog({ ticket, onClose, onSaved }: ReplyDialogProps) {
  const [status, setStatus]     = useState<TicketStatus>(ticket?.status ?? "open");
  const [note, setNote]         = useState(ticket?.admin_note ?? "");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (ticket) { setStatus(ticket.status); setNote(ticket.admin_note ?? ""); } // eslint-disable-line react-hooks/set-state-in-effect
  }, [ticket]);

  const handleSave = async () => {
    if (!ticket) return;
    setSaving(true);
    const payload: UpdateTicketPayload = { status, admin_note: note || undefined };
    const r = await supportService.update(ticket.id, payload);
    setSaving(false);
    if (r.ok) onSaved(r.data as SupportTicket);
  };

  return (
    <Dialog open={!!ticket} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Reply className="size-4" />Répondre au ticket
          </DialogTitle>
        </DialogHeader>

        {ticket && (
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">De : {ticket.name} &lt;{ticket.email}&gt;</p>
              {ticket.subject && <p className="text-sm font-semibold">{ticket.subject}</p>}
              <p className="text-sm text-muted-foreground">{ticket.message}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Note interne (visible uniquement par les admins)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ajouter une note sur ce ticket…"
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SupportPage() {
  const { isAdmin, user } = useAuth();

  // Contact form
  const [name,    setName]    = useState(user?.display_name ?? user?.username ?? "");
  const [email,   setEmail]   = useState(user?.email ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  // Page content
  const [content, setContent] = useState<SupportContent | null>(null);

  // Admin: tickets
  const [tickets,      setTickets]      = useState<SupportTicket[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [replyTarget,  setReplyTarget]  = useState<SupportTicket | null>(null);

  // Load page content
  useEffect(() => {
    supportService.getContent().then((r) => { if (r.ok) setContent(r.data); });
  }, []);

  // Prefill from user
  useEffect(() => {
    if (user) {
      setName((v) => v || user.display_name || user.username || ""); // eslint-disable-line react-hooks/set-state-in-effect
      setEmail((v) => v || user.email || "");
    }
  }, [user]);

  const loadAdminTickets = async () => {
    setLoadingAdmin(true);
    const r = await supportService.listAll({ status: filterStatus !== "all" ? filterStatus : undefined, limit: 100 });
    if (r.ok) { setTickets(r.data.tickets); setTicketsTotal(r.data.total); }
    setLoadingAdmin(false);
  };

  useEffect(() => {
    if (isAdmin) loadAdminTickets(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [isAdmin, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    const payload: CreateTicketPayload = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      ...(subject.trim() ? { subject: subject.trim() } : {}),
    };
    const r = await supportService.create(payload);
    setSending(false);
    if (r.ok) {
      setSent(true);
      setSubject("");
      setMessage("");
    }
  };

  const handleTicketSaved = (updated: SupportTicket) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    setReplyTarget(null);
  };

  const faqItems = content?.faq?.items ?? [];
  const contactEmail = content?.contact_info?.email;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <LifeBuoy className="size-6" />
          {content?.hero?.title ?? "Support"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {content?.hero?.subtitle ?? "Contactez-nous pour toute question ou problème."}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left: form */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="size-4" />Envoyer un message
              </CardTitle>
              <CardDescription>
                Décrivez votre problème ou question. Notre équipe vous répondra rapidement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle className="size-6 text-green-600" />
                  </div>
                  <p className="font-medium">Message envoyé !</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Nous avons bien reçu votre demande et vous répondrons dans les plus brefs délais.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSent(false)}>
                    Envoyer un autre message
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nom <span className="text-destructive">*</span></Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Votre nom"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email <span className="text-destructive">*</span></Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre@email.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sujet</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Résumez votre demande en quelques mots"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Message <span className="text-destructive">*</span></Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Décrivez votre problème ou question en détail…"
                      rows={5}
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={handleSubmit}
                    disabled={sending || !name.trim() || !email.trim() || !message.trim()}
                  >
                    {sending
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Send className="size-4" />
                    }
                    Envoyer
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: contact info + FAQ */}
        <div className="lg:col-span-2 space-y-4">
          {contactEmail && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contact direct</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{contactEmail}</p>
                {content?.contact_info?.response_time && (
                  <p className="text-xs text-muted-foreground">{content.contact_info.response_time}</p>
                )}
              </CardContent>
            </Card>
          )}

          {faqItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Questions fréquentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {faqItems.map((item, i) => (
                  <FaqItem key={i} question={item.question} answer={item.answer} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Admin section */}
      {isAdmin && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="size-4" />Tickets de support
                  {ticketsTotal > 0 && (
                    <Badge variant="secondary" className="text-xs">{ticketsTotal}</Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Vue admin — tous les messages reçus</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="closed">Fermé</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline" size="icon" className="size-8"
                  onClick={loadAdminTickets}
                  disabled={loadingAdmin}
                >
                  <RefreshCw className={`size-3.5 ${loadingAdmin ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {loadingAdmin ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Aucun ticket{filterStatus !== "all" ? ` avec le statut "${STATUS_LABEL[filterStatus as TicketStatus]}"` : ""}.
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={ticket.status} />
                            <span className="text-xs text-muted-foreground">{fmtDate(ticket.created_at)}</span>
                          </div>
                          <p className="text-sm font-medium truncate">
                            {ticket.subject || "(sans sujet)"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ticket.name} — {ticket.email}
                          </p>
                          <p className="text-xs text-foreground/70 line-clamp-2">{ticket.message}</p>
                          {ticket.admin_note && (
                            <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2 mt-1">
                              Note admin : {ticket.admin_note}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs h-7"
                          onClick={() => setReplyTarget(ticket)}
                        >
                          <Reply className="size-3" />Traiter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <ReplyDialog
            ticket={replyTarget}
            onClose={() => setReplyTarget(null)}
            onSaved={handleTicketSaved}
          />
        </>
      )}
    </div>
  );
}

// ── FAQ accordion item ────────────────────────────────────────────────────────

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span>{question}</span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">{answer}</p>
      )}
    </div>
  );
}
