import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Users as UsersIcon,
  Plus,
  Trash2,
  Coins,
  Shield,
  AlertCircle,
  Loader2,
  Mail,
  Activity,
  Zap,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Clock,
  ShieldCheck,
  ShieldOff,
  Copy,
  CheckCircle,
  Info,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatNumber, cn } from "@/lib/utils";


const ROLE_CONFIG = {
  ROOT_ADMIN: { label: "Root Admin", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  SUB_ADMIN:  { label: "Sub Admin",  color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  USER:       { label: "User",       color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
};

const INVITE_STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  expired:  { label: "Expired",  color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

function getCreditColor(remaining, received) {
  if (!received) return "text-slate-600 dark:text-slate-400";
  const pct = (remaining / received) * 100;
  if (pct > 20) return "text-green-600 dark:text-green-400";
  if (pct > 5)  return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function fmtAiLimit(limit) {
  return limit === Infinity || limit === null || limit === undefined ? "∞" : String(limit);
}

function fmtRelative(dateStr) {
  if (!dateStr) return "Never";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "—";
  }
}

export default function Users() {
  const { user: currentUser, isRootAdmin, isSubAdmin, isSecondaryRoot } = useAuth();
  const { toast } = useToast();
  const isAdmin = isRootAdmin || isSubAdmin || isSecondaryRoot;

  // dialogs / UI state
  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [isInviteOpen, setIsInviteOpen]   = useState(false);
  const [isCreatedModalOpen, setIsCreatedModalOpen] = useState(false);
  const [createdUser, setCreatedUser]     = useState(null);
  const [copied, setCopied]               = useState(false);
  const [showInvites, setShowInvites]     = useState(true);
  const [allocateUserId, setAllocateUserId] = useState(null);
  const [allocateCredits, setAllocateCredits] = useState("");

  // form state
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "USER", credits: 0 });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "USER" });

  // ─── queries ────────────────────────────────────────────────────────────────
  const { data: users, isLoading } = useQuery({ queryKey: ["/api/users"] });
  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ["/api/invites"],
    enabled: isAdmin,
  });

  // team summary stats derived from users array (avoids extra API call)
  const teamStats = useMemo(() => {
    if (!users || !isAdmin) return null;
    return {
      totalTeamMembers:           users.length,
      activeThisWeek:             users.filter(u => u.isActiveThisWeek).length,
      totalTeamCreditsUsed:       users.reduce((s, u) => s + (u.creditsUsed || 0), 0),
      totalTeamAiGenerationsToday: users.reduce((s, u) => s + (u.aiGenerationsToday || 0), 0),
    };
  }, [users, isAdmin]);

  const secondaryRootCount = useMemo(() =>
    (users || []).filter(u => u.isSecondaryRoot).length,
  [users]);

  // ─── mutations ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (userData) => {
      const res = await apiRequest("POST", "/api/users", userData);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsCreateOpen(false);
      setNewUser({ username: "", email: "", password: "", role: "USER", credits: 0 });
      setCreatedUser(data);
      setIsCreatedModalOpen(true);
    },
    onError: (err) => {
      let msg = err.message;
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error === "PLAN_LIMIT") {
          toast({ title: "Plan limit reached", description: parsed.message + " Go to /app/payments to upgrade.", variant: "destructive" });
          return;
        }
        msg = parsed.message || msg;
      } catch {}
      toast({ title: "Failed to create user", description: msg, variant: "destructive" });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/users/invite", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      setIsInviteOpen(false);
      setInviteForm({ email: "", role: "USER" });
      toast({ title: "Invite sent successfully" });
    },
    onError: (err) => {
      let msg = err.message;
      try { msg = JSON.parse(err.message).message || msg; } catch {}
      toast({ title: "Failed to send invite", description: msg, variant: "destructive" });
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async ({ userId, credits }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/allocate-credits`, { credits });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setAllocateUserId(null);
      setAllocateCredits("");
      toast({ title: "Credits allocated successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to allocate credits", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to delete user", description: err.message, variant: "destructive" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (inviteId) => {
      await apiRequest("POST", `/api/invites/${inviteId}/resend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      toast({ title: "Invite resent successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to resend invite", description: err.message, variant: "destructive" });
    },
  });

  const grantSecondaryRootMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await apiRequest("POST", "/api/admin/grant-root-access", { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Secondary admin access granted" });
    },
    onError: (err) => {
      let msg = err.message;
      try { msg = JSON.parse(err.message).message || msg; } catch {}
      toast({ title: "Failed to grant access", description: msg, variant: "destructive" });
    },
  });

  const revokeSecondaryRootMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await apiRequest("POST", "/api/admin/revoke-root-access", { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Secondary admin access revoked" });
    },
    onError: (err) => {
      let msg = err.message;
      try { msg = JSON.parse(err.message).message || msg; } catch {}
      toast({ title: "Failed to revoke access", description: msg, variant: "destructive" });
    },
  });

  // ─── handlers ────────────────────────────────────────────────────────────────
  const handleCreateUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate(newUser);
  };

  const handleSendInvite = () => {
    if (!inviteForm.email) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    inviteMutation.mutate(inviteForm);
  };

  const handleAllocateCredits = () => {
    const credits = parseInt(allocateCredits);
    if (isNaN(credits) || credits <= 0) {
      toast({ title: "Please enter a valid number of credits", variant: "destructive" });
      return;
    }
    allocateMutation.mutate({ userId: allocateUserId, credits });
  };

  const availableRoles = isRootAdmin ? ["USER", "SUB_ADMIN"] : ["USER"];

  const handleCopyLoginDetails = useCallback(() => {
    const loginUrl = `${window.location.origin}/login`;
    const text = [
      `Username: ${createdUser?.username}`,
      `Email: ${createdUser?.email}`,
      `Login URL: ${loginUrl}`,
      `Note: You will be prompted to set a password on first login.`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [createdUser]);

  // ─── render ──────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage team members and their permissions</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {isRootAdmin && (
              <span className="text-xs text-muted-foreground">{secondaryRootCount}/2 secondary admins</span>
            )}
            <div className="flex gap-2">
            {/* Invite User (Recommended) */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-invite-member">
                  <Mail className="w-4 h-4" />
                  Invite User
                  <span className="text-xs opacity-60 font-normal">(Recommended)</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite User</DialogTitle>
                  <DialogDescription>
                    Send an invite link via email. The recipient creates their own username and password — you never handle their credentials.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="invite-email">Email *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="colleague@company.com"
                      className="mt-1.5"
                      data-testid="input-invite-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-role">Role</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(v) => setInviteForm(prev => ({ ...prev, role: v }))}
                    >
                      <SelectTrigger className="mt-1.5" data-testid="select-invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map(r => (
                          <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleSendInvite}
                    disabled={inviteMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    data-testid="button-submit-invite"
                  >
                    {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Create User Directly (Advanced) */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" data-testid="button-create-user">
                  <Plus className="w-5 h-5" />
                  Create User Directly
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create User Directly</DialogTitle>
                  <DialogDescription>
                    Create an account immediately and set credentials yourself. A welcome email is sent automatically — the password is not included.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={newUser.username}
                      onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter username"
                      data-testid="input-new-username"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email"
                      data-testid="input-new-email"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                      data-testid="input-new-password"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(v) => setNewUser(prev => ({ ...prev, role: v }))}
                    >
                      <SelectTrigger className="mt-1.5" data-testid="select-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map(r => (
                          <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="credits">Initial Credits</Label>
                    <Input
                      id="credits"
                      type="number"
                      value={newUser.credits}
                      onChange={(e) => setNewUser(prev => ({ ...prev, credits: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      data-testid="input-new-credits"
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleCreateUser}
                    disabled={createMutation.isPending}
                    data-testid="button-submit-create"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
            <p className="text-xs text-muted-foreground text-right flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
              <span>
                <span className="font-medium">Invite User</span> — recipient sets their own password via email.{" "}
                <span className="font-medium">Create Directly</span> — admin sets credentials; welcome email sent.
              </span>
            </p>
          </div>
        </div>

        {/* Team summary stats — admin only */}
        {isAdmin && teamStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Team Members</p>
                  <UsersIcon className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{teamStats.totalTeamMembers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Active This Week</p>
                  <Activity className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{teamStats.activeThisWeek}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Credits Used (Team)</p>
                  <Coins className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{formatNumber(teamStats.totalTeamCreditsUsed)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">AI Uses Today</p>
                  <Zap className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{teamStats.totalTeamAiGenerationsToday}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-slate-700/70 bg-gray-50 dark:bg-slate-800/30">
                  <TableHead className="text-gray-700 dark:text-slate-400">User</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-400">Role</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-slate-400">Credits</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-slate-400">Last Campaign</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-slate-400">Days Inactive</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-slate-400">AI Today</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 dark:text-slate-400">
                      Loading users...
                    </td>
                  </tr>
                ) : users?.length > 0 ? (
                  users.map((user) => {
                    const config = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER;
                    const isCurrentUser = user.id === currentUser?.id;
                    const creditsRemaining = user.creditsRemaining ?? ((user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0));
                    const creditColorClass = getCreditColor(creditsRemaining, user.creditsReceived);
                    return (
                      <TableRow
                        key={user.id}
                        data-testid={`row-user-${user.id}`}
                        className="border-b border-gray-100 dark:border-slate-700/30 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* User cell */}
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {user.username?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{user.username}</div>
                              <div className="text-sm text-gray-500 dark:text-slate-400">{user.email}</div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                <Badge className={cn("text-xs px-1.5 py-0", user.isActiveThisWeek ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500")}>
                                  {user.isActiveThisWeek ? "Active" : "Inactive"}
                                </Badge>
                                {user.isDormant && (
                                  <Badge className="text-xs px-1.5 py-0 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Dormant</Badge>
                                )}
                                {user.isReclaimEligible ? (
                                  <Badge className="text-xs px-1.5 py-0 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" title="Credits eligible for auto-reclaim">Reclaim Eligible</Badge>
                                ) : user.inactivityWarningSentAt && user.inactivityKeepToken ? (
                                  <Badge className="text-xs px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" title={`Warning sent ${new Date(user.inactivityWarningSentAt).toLocaleDateString()}`}>Warning</Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={cn(config.color, "gap-1")}>
                              <Shield className="h-3 w-3" />
                              {config.label}
                            </Badge>
                            {user.isSecondaryRoot && (
                              <Badge className="gap-1 text-xs px-1.5 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                <Shield className="h-3 w-3" />
                                Secondary Admin
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Credits remaining */}
                        <TableCell className={cn("text-right font-medium tabular-nums", creditColorClass)}>
                          {formatNumber(creditsRemaining)}
                        </TableCell>

                        {/* Last Campaign */}
                        <TableCell className="text-right text-sm text-gray-500 dark:text-slate-400 tabular-nums">
                          {fmtRelative(user.lastCampaignAt)}
                        </TableCell>

                        {/* Days Inactive */}
                        <TableCell className="text-right text-sm text-gray-500 dark:text-slate-400 tabular-nums">
                          {user.lastActivityAt
                            ? formatDistanceToNow(new Date(user.lastActivityAt), { addSuffix: true })
                            : "Never sent"}
                        </TableCell>

                        {/* AI Today */}
                        <TableCell className="text-right text-sm tabular-nums text-gray-700 dark:text-slate-300">
                          {user.aiGenerationsToday ?? 0} / {fmtAiLimit(user.aiDailyLimit)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {/* Allocate credits */}
                            <Dialog
                              open={allocateUserId === user.id}
                              onOpenChange={(open) => {
                                if (!open) { setAllocateUserId(null); setAllocateCredits(""); }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setAllocateUserId(user.id)}
                                  disabled={isCurrentUser}
                                  data-testid={`button-allocate-${user.id}`}
                                >
                                  <Coins className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Allocate Credits</DialogTitle>
                                  <DialogDescription>Allocate credits to {user.username}</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                  <div className="grid grid-cols-3 gap-3 text-sm text-center">
                                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                                      <p className="text-slate-500 dark:text-slate-400">Received</p>
                                      <p className="font-semibold mt-0.5">{formatNumber(user.creditsReceived || 0)}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                                      <p className="text-slate-500 dark:text-slate-400">Used</p>
                                      <p className="font-semibold mt-0.5">{formatNumber(user.creditsUsed || 0)}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                                      <p className="text-slate-500 dark:text-slate-400">Available</p>
                                      <p className={cn("font-semibold mt-0.5", creditColorClass)}>{formatNumber(creditsRemaining)}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Credits to Allocate</Label>
                                    <Input
                                      type="number"
                                      value={allocateCredits}
                                      onChange={(e) => setAllocateCredits(e.target.value)}
                                      placeholder="Enter amount"
                                      data-testid="input-allocate-credits"
                                    />
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Your available credits:{" "}
                                    {formatNumber(
                                      (currentUser?.creditsReceived || 0) -
                                      (currentUser?.creditsAllocated || 0) -
                                      (currentUser?.creditsUsed || 0)
                                    )}
                                  </p>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setAllocateUserId(null)}>Cancel</Button>
                                  <Button
                                    onClick={handleAllocateCredits}
                                    disabled={allocateMutation.isPending}
                                    data-testid="button-submit-allocate"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    {allocateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Allocate
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            {/* Grant Secondary Admin */}
                            {isRootAdmin && user.role !== "ROOT_ADMIN" && !user.isSecondaryRoot && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => grantSecondaryRootMutation.mutate(user.id)}
                                disabled={grantSecondaryRootMutation.isPending || !user.isActive}
                                title="Grant secondary admin access"
                                data-testid={`button-grant-root-${user.id}`}
                              >
                                <ShieldCheck className="h-4 w-4 text-purple-500" />
                              </Button>
                            )}

                            {/* Revoke Secondary Admin */}
                            {isRootAdmin && user.isSecondaryRoot && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => revokeSecondaryRootMutation.mutate(user.id)}
                                disabled={revokeSecondaryRootMutation.isPending}
                                title="Revoke secondary admin access"
                                data-testid={`button-revoke-root-${user.id}`}
                              >
                                <ShieldOff className="h-4 w-4 text-purple-400" />
                              </Button>
                            )}

                            {/* Delete */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isCurrentUser || user.role === "ROOT_ADMIN"}
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {user.username}? This will terminate all their active campaigns and reclaim allocated credits. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(user.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-24 w-24 rounded-full bg-primary/5" />
                        </div>
                        <UsersIcon className="relative h-12 w-12 mx-auto text-muted-foreground/40" />
                      </div>
                      <p className="text-lg font-medium mb-2">No team members yet</p>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Invite team members to collaborate on campaigns and manage credits across your organization.
                      </p>
                      <div className="flex justify-center gap-2">
                        <Button variant="outline" onClick={() => setIsInviteOpen(true)} data-testid="button-invite-first">
                          <Mail className="mr-2 h-4 w-4" />
                          Invite User
                        </Button>
                        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-user">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Directly
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pending invites — admin only */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowInvites(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-slate-900 dark:text-white">Pending Invites</span>
                {invites && (
                  <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs">
                    {invites.filter(i => i.status !== "accepted").length}
                  </Badge>
                )}
              </div>
              {showInvites
                ? <ChevronUp className="h-4 w-4 text-slate-400" />
                : <ChevronDown className="h-4 w-4 text-slate-400" />
              }
            </button>

            {showInvites && (
              <div className="border-t border-gray-200 dark:border-slate-700/50">
                {invitesLoading ? (
                  <p className="text-center py-6 text-sm text-slate-400">Loading invites...</p>
                ) : invites?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-slate-800/30 border-b border-gray-200 dark:border-slate-700/50">
                          <TableHead className="text-gray-700 dark:text-slate-400">Email</TableHead>
                          <TableHead className="text-gray-700 dark:text-slate-400">Role</TableHead>
                          <TableHead className="text-gray-700 dark:text-slate-400">Status</TableHead>
                          <TableHead className="text-gray-700 dark:text-slate-400">Expires</TableHead>
                          <TableHead className="text-right text-gray-700 dark:text-slate-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invites.map((invite) => {
                          const roleConf   = ROLE_CONFIG[invite.role] || ROLE_CONFIG.USER;
                          const statusConf = INVITE_STATUS_CONFIG[invite.status] || INVITE_STATUS_CONFIG.pending;
                          return (
                            <TableRow
                              key={invite.id}
                              className="border-b border-gray-100 dark:border-slate-700/30 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors"
                            >
                              <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                {invite.email}
                              </TableCell>
                              <TableCell>
                                <Badge className={cn(roleConf.color, "gap-1 text-xs")}>
                                  <Shield className="h-3 w-3" />
                                  {roleConf.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={cn(statusConf.color, "text-xs capitalize")}>
                                  {statusConf.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {fmtRelative(invite.expiresAt)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {invite.status !== "accepted" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => resendMutation.mutate(invite.id)}
                                    disabled={resendMutation.isPending}
                                    className="gap-1.5 text-xs"
                                    data-testid={`button-resend-${invite.id}`}
                                  >
                                    {resendMutation.isPending
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <RotateCcw className="h-3 w-3" />
                                    }
                                    Resend
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-sm text-slate-400">No invites sent yet.</p>
                )}
              </div>
            )}
          </div>
        )}

      </div>
        {/* Created user success modal */}
        <Dialog open={isCreatedModalOpen} onOpenChange={setIsCreatedModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Account Created
              </DialogTitle>
            </DialogHeader>

            {createdUser?.emailFailed && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Account created, but notification email failed. Share the login details below manually.
                </AlertDescription>
              </Alert>
            )}
            {!createdUser?.emailFailed && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-4 w-4 shrink-0 text-green-500" />
                Welcome email sent to <span className="font-medium text-foreground">{createdUser?.email}</span>
              </p>
            )}

            <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5 text-sm">
              <div className="grid grid-cols-[110px,1fr] gap-y-2 gap-x-3">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono font-medium">{createdUser?.username}</span>
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium break-all">{createdUser?.email}</span>
                <span className="text-muted-foreground">Credits</span>
                <span className="font-medium">{formatNumber(createdUser?.creditsAllocated ?? 0)}</span>
                <span className="text-muted-foreground">Login URL</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400 break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/login
                </span>
              </div>
            </div>

            <Separator />

            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-70" />
              The user will be prompted to set their own password on first login. Do not share the temporary password.
            </p>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleCopyLoginDetails}
              >
                {copied
                  ? <CheckCircle className="h-4 w-4 text-green-500" />
                  : <Copy className="h-4 w-4" />
                }
                {copied ? "Copied!" : "Copy Login Details"}
              </Button>
              <Button onClick={() => { setIsCreatedModalOpen(false); setCopied(false); }}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </AppLayout>
  );
}
