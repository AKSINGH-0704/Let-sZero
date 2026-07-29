/**
 * TEAM MEMBERS — customer-facing workspace team management (M41).
 *
 * The capability already existed end-to-end on the server (workspace-scoped
 * member list, atomic seat enforcement, invite + create flows, RBAC) but had no
 * first-class, discoverable home for a customer. This page is that home. It is a
 * PRESENTATION layer: it reuses the exact production APIs and never re-implements
 * any business rule.
 *
 *   • members + stats  → GET  /api/users            (getUsersWithStats — resolves the
 *                                                     CALLER's own workspace root, so it
 *                                                     is tenant-safe by construction)
 *   • pending invites  → GET  /api/invites
 *   • invite a member  → POST /api/users/invite      (server enforces seats + RBAC)
 *   • create directly  → POST /api/users             (server enforces seats + RBAC)
 *   • remove a member  → DELETE /api/users/:id
 *   • restore a member → POST /api/users/:id/reactivate
 *
 * The seat ceiling is READ from the server's entitlement authority
 * (GET /api/seats/subscription), never re-derived here — only ACTIVE members
 * occupy a seat and the owner does not. RBAC gating mirrors the
 * server's adminMiddleware exactly — a plain member cannot manage the workspace.
 * This page is distinct from the operator's /app/users admin view and exposes no
 * platform-wide administration.
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users as UsersIcon, UserPlus, Mail, Trash2, RotateCcw, ArrowUpRight, Info } from "lucide-react";
import { PLAN_LIMITS } from "@shared/schema";
import { ENTERPRISE_CONTACT_PATH } from "@shared/enterprise";
import { cn } from "@/lib/utils";
import SeatSummary, { computeSeatState } from "@/components/teams/SeatSummary";

// Role badge colours — mirrors the config on the operator Users page so a role
// reads identically across both surfaces. UI config only; the role RULES live on
// the server and are surfaced below via createUserRoles/inviteUserRoles.
const ROLE_CONFIG = {
  ROOT_ADMIN: { label: "Owner",     color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  SUB_ADMIN:  { label: "Manager",   color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  USER:       { label: "Member",    color: "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-300" },
};

function getInitials(name = "", email = "") {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function fmtRelative(dateStr) {
  if (!dateStr) return "Never";
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); } catch { return "—"; }
}

function Avatar({ name, email }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
      aria-hidden="true"
    >
      {getInitials(name, email)}
    </div>
  );
}

function StatusBadge({ member }) {
  if (!member.isActive) {
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs" title="Access revoked — restore to re-enable login">Deactivated</Badge>;
  }
  if (member.isDormant) {
    return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs">Dormant</Badge>;
  }
  return (
    <Badge className={cn("text-xs", member.isActiveThisWeek
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
      {member.isActiveThisWeek ? "Active" : "Idle"}
    </Badge>
  );
}

export default function TeamMembers() {
  const { user, isRootAdmin, isSubAdmin, isSecondaryRoot, isWorkspaceOwner, canManageTeam } = useAuth();
  const { toast } = useToast();
  // M41-FIX — the page's management gate was isAdmin (ROOT_ADMIN/SUB_ADMIN/
  // secondary root), which excludes a self-service customer (role USER). Their
  // own workspace owner therefore saw the "managed by your workspace owner"
  // read-only note on THEIR OWN workspace. canManageTeam includes the owner,
  // matching the server's adminMiddleware.
  const canManage = canManageTeam;
  const search = useSearch();

  const [addOpen, setAddOpen] = useState(false);
  const [mode, setMode] = useState("invite"); // invite | create
  const [inviteForm, setInviteForm] = useState({ email: "", role: "" });
  const [createForm, setCreateForm] = useState({ username: "", email: "", password: "", role: "", credits: 0 });
  const [errors, setErrors] = useState({});
  const [removeTarget, setRemoveTarget] = useState(null);

  // Server RBAC (see routes.js POST /api/users, /api/users/invite):
  //   Workspace owner (the "Admin") → create/invite Managers OR Members
  //   ROOT_ADMIN / secondary root   → create Managers; invite Members OR Managers
  //   SUB_ADMIN                     → create + invite Members only
  const createUserRoles = isWorkspaceOwner
    ? ["SUB_ADMIN", "USER"]
    : (isRootAdmin || isSecondaryRoot) ? ["SUB_ADMIN"] : ["USER"];
  const inviteUserRoles = (isRootAdmin || isSecondaryRoot || isWorkspaceOwner) ? ["USER", "SUB_ADMIN"] : ["USER"];

  const { data: members, isLoading } = useQuery({ queryKey: ["/api/users"], enabled: canManage });
  const { data: invites, isLoading: invitesLoading } = useQuery({ queryKey: ["/api/invites"], enabled: canManage });

  // M42 — the seat ceiling comes from the SERVER's entitlement authority
  // (subscription → grandfather → free floor → legacy plan). Deriving it here
  // from MAX_TEAM_MEMBERS would be a second authority that silently disagrees
  // with enforcement the moment seat billing is enabled for a workspace.
  const { data: seatInfo } = useQuery({ queryKey: ["/api/seats/subscription"], enabled: canManage });
  const effectivePlan = user?.effectivePlan || "free";
  const included = seatInfo?.entitlement
    ? (seatInfo.entitlement.unlimited ? Infinity : seatInfo.entitlement.seats)
    : null;
  const activeMembers = useMemo(() => (members || []).filter(m => m.isActive), [members]);
  const used = activeMembers.length;
  // `included: null` while loading renders as unlimited, so the UI never briefly
  // tells someone their team is full before the real number arrives.
  const seat = computeSeatState(used, included);
  const planLabel = PLAN_LIMITS[effectivePlan]?.label || (effectivePlan[0]?.toUpperCase() + effectivePlan.slice(1));

  const pendingInvites = useMemo(
    () => (invites || []).filter(i => !i.acceptedAt && (!i.status || i.status === "pending")),
    [invites]
  );

  function resetForms() {
    setErrors({});
    setInviteForm({ email: "", role: inviteUserRoles[0] });
    setCreateForm({ username: "", email: "", password: "", role: createUserRoles[0], credits: 0 });
  }

  function openAdd() {
    resetForms();
    setMode("invite");
    setAddOpen(true);
  }

  // Arriving from the post-purchase "Invite your team" CTA (/app/team?invite=1)
  // opens the Add dialog immediately — no redundant second click (mirrors the
  // M20-C activation behaviour, now pointed at this customer page).
  useEffect(() => {
    if (canManage && new URLSearchParams(search).get("invite") === "1") openAdd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/users/invite", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setAddOpen(false);
      toast({ title: "Invite sent", description: "They'll get an email with a link to join your workspace." });
    },
    onError: (err) => toast({ title: "Couldn't send the invite", description: err.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setAddOpen(false);
      toast({ title: "Team member added", description: "They can sign in and will be asked to set a password." });
    },
    onError: (err) => toast({ title: "Couldn't add the member", description: err.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setRemoveTarget(null);
      toast({ title: "Member removed", description: "Their seat is now free. You can restore them anytime." });
    },
    onError: (err) => toast({ title: "Couldn't remove the member", description: err.message, variant: "destructive" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id) => apiRequest("POST", `/api/users/${id}/reactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Member restored" });
    },
    onError: (err) => toast({ title: "Couldn't restore the member", description: err.message, variant: "destructive" }),
  });

  function submitAdd(e) {
    e.preventDefault();
    const errs = {};
    if (mode === "invite") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) errs.email = "Enter a valid email address.";
      setErrors(errs);
      if (Object.keys(errs).length) return;
      inviteMutation.mutate({ email: inviteForm.email.trim(), role: inviteForm.role || inviteUserRoles[0] });
    } else {
      if (!createForm.username.trim()) errs.username = "Username is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) errs.email = "Enter a valid email address.";
      if (!createForm.password || createForm.password.length < 8) errs.password = "Use at least 8 characters.";
      setErrors(errs);
      if (Object.keys(errs).length) return;
      createMutation.mutate({
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role || createUserRoles[0],
        credits: Number(createForm.credits) || 0,
      });
    }
  }

  const submitting = inviteMutation.isPending || createMutation.isPending;

  // ── Plain members: read-only note (mirrors server adminMiddleware — a member,
  //    i.e. a USER *with* a parentId, cannot list or manage the workspace). The
  //    workspace owner and managers fall through to the full experience below.
  if (!canManage) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl py-16 text-center">
          <UsersIcon className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          <h1 className="text-xl font-semibold">Team is managed by your workspace owner</h1>
          <p className="mt-2 text-muted-foreground">
            You're a member of this workspace. Ask your workspace owner or a manager to invite or manage teammates.
          </p>
        </div>
      </AppLayout>
    );
  }

  const canAdd = seat.unlimited || !seat.full;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <UsersIcon className="h-6 w-6" aria-hidden="true" />
              Team Members
            </h1>
            <p className="text-muted-foreground">Invite teammates to collaborate inside your RepMail workspace.</p>
          </div>
          <Button className="gap-2" onClick={openAdd} disabled={!canAdd} data-testid="button-add-member">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add Team Member
          </Button>
        </div>

        {/* Seat summary */}
        {isLoading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : (
          <SeatSummary
            planLabel={planLabel}
            used={used}
            included={included}
            actions={
              <>
                {/* M42 — when seat billing is live, the honest action for "I need
                    more people" is buying a seat, not upgrading a credit pack.
                    Credit packs no longer change the seat allowance at all. */}
                {seatInfo?.billingEnabled ? (
                  <Button asChild variant="outline" size="sm" className="gap-1.5" data-testid="button-manage-seats">
                    <Link href="/app/team/seats">
                      Manage seats <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm" className="gap-1.5" data-testid="button-upgrade-plan">
                    <Link href="/app/payments">
                      Buy credits <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </>
            }
          />
        )}

        {/* Seat-full banner (no silent failure — explain before they try) */}
        {!isLoading && seat.full && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30" data-testid="banner-seats-full">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <p className="text-amber-800 dark:text-amber-300">
              All {included} seats are currently in use. Remove an inactive member to free a seat
              {seatInfo?.billingEnabled ? (
                <>, or <Link href="/app/team/seats" className="font-medium underline">add seats</Link>.</>
              ) : (
                <>, or <Link href={ENTERPRISE_CONTACT_PATH} className="font-medium underline">talk to us about Enterprise</Link>.</>
              )}
            </p>
          </div>
        )}

        {/* Members */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Members {!isLoading && members?.length ? <span className="text-muted-foreground font-normal">· {members.length}</span> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="ml-auto h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (members?.length ?? 0) === 0 ? (
              // Empty state — no members yet.
              <div className="py-14 text-center" data-testid="empty-no-members">
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-20 w-20 rounded-full bg-primary/5" />
                  </div>
                  <UsersIcon className="relative mx-auto h-11 w-11 text-muted-foreground/40" aria-hidden="true" />
                </div>
                <p className="mb-1 text-lg font-medium">No team members yet</p>
                <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                  Invite your colleagues to collaborate inside RepMail — you have{" "}
                  {seat.unlimited ? "unlimited seats" : `${seat.remaining} of ${included} seats`} available.
                </p>
                <Button className="gap-2" onClick={openAdd} data-testid="button-add-first-member">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Add Team Member
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last activity</TableHead>
                        <TableHead className="text-right">Credits left</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map(m => {
                        const role = ROLE_CONFIG[m.role] || ROLE_CONFIG.USER;
                        return (
                          <TableRow key={m.id} data-testid={`member-row-${m.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar name={m.username} email={m.email} />
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{m.username}</div>
                                  <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Badge className={cn(role.color, "text-xs")}>{role.label}</Badge></TableCell>
                            <TableCell><StatusBadge member={m} /></TableCell>
                            <TableCell className="text-muted-foreground">{fmtRelative(m.lastActivityAt || m.lastLoginAt)}</TableCell>
                            <TableCell className="text-right tabular-nums">{(m.creditsRemaining ?? 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              {m.isActive ? (
                                <Button variant="ghost" size="icon" aria-label={`Remove ${m.username}`}
                                  className="text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                                  onClick={() => setRemoveTarget(m)} data-testid={`button-remove-${m.id}`}>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" aria-label={`Restore ${m.username}`}
                                  disabled={reactivateMutation.isPending}
                                  onClick={() => reactivateMutation.mutate(m.id)} data-testid={`button-restore-${m.id}`}>
                                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {members.map(m => {
                    const role = ROLE_CONFIG[m.role] || ROLE_CONFIG.USER;
                    return (
                      <div key={m.id} className="rounded-lg border p-3" data-testid={`member-card-${m.id}`}>
                        <div className="flex items-center gap-3">
                          <Avatar name={m.username} email={m.email} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{m.username}</div>
                            <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                          </div>
                          {m.isActive ? (
                            <Button variant="ghost" size="icon" aria-label={`Remove ${m.username}`}
                              className="text-red-500" onClick={() => setRemoveTarget(m)}>
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" aria-label={`Restore ${m.username}`}
                              onClick={() => reactivateMutation.mutate(m.id)}>
                              <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <Badge className={cn(role.color, "text-xs")}>{role.label}</Badge>
                          <StatusBadge member={m} />
                          <span className="text-muted-foreground">· {fmtRelative(m.lastActivityAt || m.lastLoginAt)}</span>
                          <span className="ml-auto tabular-nums text-muted-foreground">{(m.creditsRemaining ?? 0).toLocaleString()} credits</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending invites */}
        {!invitesLoading && pendingInvites.length > 0 && (
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pending invites <span className="font-normal text-muted-foreground">· {pendingInvites.length}</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingInvites.map(inv => {
                const role = ROLE_CONFIG[inv.role] || ROLE_CONFIG.USER;
                return (
                  <div key={inv.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm" data-testid={`invite-${inv.id}`}>
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate font-medium">{inv.email}</span>
                    <Badge className={cn(role.color, "text-xs")}>{role.label}</Badge>
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">Pending</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">sent {fmtRelative(inv.createdAt)}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add member dialog — Invite (email) or Create (direct). Both call the same
          seat/RBAC-enforcing server endpoints; no business logic lives here. */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a team member</DialogTitle>
            <DialogDescription>
              {seat.unlimited
                ? "Your plan includes unlimited seats."
                : `${seat.remaining} of ${included} seats available.`}
            </DialogDescription>
          </DialogHeader>

          {/* Invite / Create toggle */}
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            <button type="button" onClick={() => setMode("invite")}
              className={cn("flex-1 rounded-md py-1.5 text-sm font-medium transition-colors", mode === "invite" ? "bg-background shadow-sm" : "text-muted-foreground")}>
              Invite by email
            </button>
            <button type="button" onClick={() => setMode("create")}
              className={cn("flex-1 rounded-md py-1.5 text-sm font-medium transition-colors", mode === "create" ? "bg-background shadow-sm" : "text-muted-foreground")}>
              Create directly
            </button>
          </div>

          <form onSubmit={submitAdd} className="space-y-4">
            {mode === "invite" ? (
              <>
                <div>
                  <Label htmlFor="tm-invite-email">Email</Label>
                  <Input id="tm-invite-email" type="email" value={inviteForm.email} placeholder="teammate@company.com"
                    onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} className="mt-1.5" data-testid="input-invite-email" />
                  {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                </div>
                <div>
                  <Label htmlFor="tm-invite-role">Role</Label>
                  <Select value={inviteForm.role || inviteUserRoles[0]} onValueChange={v => setInviteForm(p => ({ ...p, role: v }))}>
                    <SelectTrigger id="tm-invite-role" className="mt-1.5" data-testid="select-invite-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {inviteUserRoles.map(r => <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="tm-username">Username</Label>
                  <Input id="tm-username" value={createForm.username}
                    onChange={e => setCreateForm(p => ({ ...p, username: e.target.value }))} className="mt-1.5" data-testid="input-create-username" />
                  {errors.username && <p className="mt-1 text-xs text-destructive">{errors.username}</p>}
                </div>
                <div>
                  <Label htmlFor="tm-email">Email</Label>
                  <Input id="tm-email" type="email" value={createForm.email}
                    onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} className="mt-1.5" data-testid="input-create-email" />
                  {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                </div>
                <div>
                  <Label htmlFor="tm-password">Temporary password</Label>
                  <Input id="tm-password" type="password" value={createForm.password}
                    onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} className="mt-1.5"
                    placeholder="They'll be asked to change it" data-testid="input-create-password" />
                  {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
                </div>
                <div>
                  <Label htmlFor="tm-create-role">Role</Label>
                  <Select value={createForm.role || createUserRoles[0]} onValueChange={v => setCreateForm(p => ({ ...p, role: v }))}>
                    <SelectTrigger id="tm-create-role" className="mt-1.5" data-testid="select-create-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {createUserRoles.map(r => <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} data-testid="button-submit-add">
                {submitting ? "Adding…" : mode === "invite" ? "Send invite" : "Create member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll lose access to this workspace and their seat is freed. You can restore them later — their data is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => removeTarget && removeMutation.mutate(removeTarget.id)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Removing…" : "Remove member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
