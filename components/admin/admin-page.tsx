"use client";

import { useEffect, useState } from "react";
import {
  Shield, UserCheck, UserX, MoreHorizontal,
  Loader2, Search, RefreshCw, Users, Trash2,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { adminService } from "@/services/admin.service";
import { useAuth } from "@/lib/context/auth-context";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { UserResponse, UserRole } from "@/types";

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  user:        "Utilisateur",
};

const PAGE_SIZE = 20;

// ── UserTable ──────────────────────────────────────────────────────────────

function UserTable({
  users, currentUserId,
  onApprove, onReject, onRoleChange, onDelete,
}: {
  users: UserResponse[];
  currentUserId: string;
  onApprove:    (u: UserResponse) => void;
  onReject:     (u: UserResponse) => void;
  onRoleChange: (u: UserResponse, role: UserRole) => void;
  onDelete:     (u: UserResponse) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="size-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Aucun utilisateur</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Utilisateur</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rôle</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Inscription</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>
              <div>
                <p className="font-medium text-sm">{u.username}</p>
                {u.display_name && (
                  <p className="text-xs text-muted-foreground">{u.display_name}</p>
                )}
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{u.email ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={u.role === "super_admin" ? "default" : "secondary"} className="text-xs">
                {ROLE_LABEL[u.role]}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1 flex-wrap">
                <Badge
                  variant={u.is_approved ? "default" : "outline"}
                  className={cn("text-xs", !u.is_approved && "border-warning text-warning-foreground")}
                >
                  {u.is_approved ? "Approuvé" : "En attente"}
                </Badge>
                {!u.email_verified && u.email && (
                  <Badge variant="outline" className="text-xs border-caution text-caution">
                    Email non vérifié
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(u.created_at).toLocaleDateString("fr-FR")}
            </TableCell>
            <TableCell>
              {u.id !== currentUserId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7">
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {!u.is_approved && (
                      <>
                        <DropdownMenuItem onClick={() => onApprove(u)} className="text-success">
                          <UserCheck className="size-3.5 mr-2" />Approuver
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onReject(u)} className="text-destructive">
                          <UserX className="size-3.5 mr-2" />Rejeter
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      Changer de rôle
                    </DropdownMenuLabel>
                    {(["user", "super_admin"] as UserRole[])
                      .filter((r) => r !== u.role)
                      .map((r) => (
                        <DropdownMenuItem key={r} onClick={() => onRoleChange(u, r)}>
                          <Shield className="size-3.5 mr-2" />{ROLE_LABEL[r]}
                        </DropdownMenuItem>
                      ))}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(u)}>
                      <Trash2 className="size-3.5 mr-2" />Supprimer le compte
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── AdminPage ──────────────────────────────────────────────────────────────

export function AdminPage() {
  const { user: currentUser } = useAuth();

  // All users tab
  const [users, setUsers]                   = useState<UserResponse[]>([]);
  const [loadingAll, setLoadingAll]         = useState(true);
  const [search, setSearch]                 = useState("");
  const [roleFilter, setRoleFilter]         = useState<UserRole | "all">("all");
  const [approvedFilter, setApprovedFilter] = useState<"all" | "approved" | "pending">("all");
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);

  // Pending tab
  const [pending, setPending]               = useState<UserResponse[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [pendingPage, setPendingPage]       = useState(1);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);

  // Dialogs state
  const [rejectTarget, setRejectTarget]   = useState<UserResponse | null>(null);
  const [rejectReason, setRejectReason]   = useState("");
  const [roleTarget, setRoleTarget]       = useState<{ user: UserResponse; role: UserRole } | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<UserResponse | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const loadAll = () => {
    setLoadingAll(true);
    adminService.listUsers({
      page,
      page_size: PAGE_SIZE,
      role:        roleFilter === "all" ? undefined : roleFilter,
      is_approved: approvedFilter === "all" ? undefined : approvedFilter === "approved",
      search:      debouncedSearch || undefined,
    }).then((r) => {
      if (r.ok) { setUsers(r.data.users); setTotalPages(r.data.pages); }
    }).finally(() => setLoadingAll(false));
  };

  const loadPending = () => {
    setLoadingPending(true);
    adminService.listPending(pendingPage, PAGE_SIZE).then((r) => {
      if (r.ok) { setPending(r.data.users); setPendingTotalPages(r.data.pages); }
    }).finally(() => setLoadingPending(false));
  };

  useEffect(() => { setPage(1); }, [debouncedSearch, roleFilter, approvedFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, [page, debouncedSearch, roleFilter, approvedFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadPending(); }, [pendingPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleApprove = async (u: UserResponse) => {
    const r = await adminService.approveUser(u.id, { approved: true });
    if (r.ok) { loadAll(); loadPending(); }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    const r = await adminService.approveUser(rejectTarget.id, {
      approved: false,
      reason:   rejectReason.trim() || undefined,
    });
    if (r.ok) { loadAll(); loadPending(); }
    setRejectTarget(null);
    setRejectReason("");
  };

  const handleRoleConfirm = async () => {
    if (!roleTarget) return;
    const r = await adminService.changeRole(roleTarget.user.id, roleTarget.role);
    if (r.ok) loadAll();
    setRoleTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const r = await adminService.deleteUser(deleteTarget.id);
    if (r.ok) { loadAll(); loadPending(); }
    setDeleteTarget(null);
  };

  const sharedActions = {
    currentUserId: currentUser?.id ?? "",
    onApprove:    handleApprove,
    onReject:     (u: UserResponse) => { setRejectReason(""); setRejectTarget(u); },
    onRoleChange: (u: UserResponse, role: UserRole) => setRoleTarget({ user: u, role }),
    onDelete:     (u: UserResponse) => setDeleteTarget(u),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Administration</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les comptes utilisateurs et les autorisations.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => { loadAll(); loadPending(); }}>
          <RefreshCw className="size-3.5" />Actualiser
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tous les utilisateurs</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            En attente
            {pending.length > 0 && (
              <span className="ml-1.5 rounded-full bg-warning text-white text-xs px-1.5 py-0.5 leading-none">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tous les utilisateurs ── */}
        <TabsContent value="all" className="mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
              <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={approvedFilter} onValueChange={(v) => setApprovedFilter(v as "all" | "approved" | "pending")}>
              <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="approved">Approuvés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingAll ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <UserTable users={users} {...sharedActions} />
              )}
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#"
                    onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink href="#" isActive={p === page}
                      onClick={(e) => { e.preventDefault(); setPage(p); }}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext href="#"
                    onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>

        {/* ── En attente d'approbation ── */}
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Demandes en attente</CardTitle>
              <CardDescription>Approuvez ou rejetez les nouvelles inscriptions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPending ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <UserTable users={pending} {...sharedActions} />
              )}
            </CardContent>
          </Card>

          {pendingTotalPages > 1 && (
            <Pagination className="mt-3">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#"
                    onClick={(e) => { e.preventDefault(); if (pendingPage > 1) setPendingPage(pendingPage - 1); }}
                    className={pendingPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: pendingTotalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink href="#" isActive={p === pendingPage}
                      onClick={(e) => { e.preventDefault(); setPendingPage(p); }}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext href="#"
                    onClick={(e) => { e.preventDefault(); if (pendingPage < pendingTotalPages) setPendingPage(pendingPage + 1); }}
                    className={pendingPage >= pendingTotalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog : Rejeter ── */}
      <Dialog open={!!rejectTarget} onOpenChange={(v) => { if (!v) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rejeter le compte</DialogTitle>
            <DialogDescription>
              Le compte <strong>{rejectTarget?.username}</strong> sera rejeté.
              Vous pouvez indiquer une raison (optionnel).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason" className="text-xs">Raison du rejet</Label>
            <Input
              id="reject-reason"
              placeholder="Motif optionnel…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm}>
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Changer de rôle ── */}
      <AlertDialog open={!!roleTarget} onOpenChange={(v) => { if (!v) setRoleTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer le rôle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le rôle de <strong>{roleTarget?.user.username}</strong> passera à{" "}
              <strong>{roleTarget ? ROLE_LABEL[roleTarget.role] : ""}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleConfirm}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog : Supprimer ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte <strong>{deleteTarget?.username}</strong> sera définitivement supprimé.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
