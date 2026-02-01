import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Users as UsersIcon,
  Plus,
  Edit,
  Trash2,
  Coins,
  Shield,
  User,
  AlertCircle,
  Loader2,
  ChevronRight
} from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";

const ROLE_CONFIG = {
  ROOT_ADMIN: { label: "Root Admin", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  SUB_ADMIN: { label: "Sub Admin", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  USER: { label: "User", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" }
};

export default function Users() {
  const { user: currentUser, isRootAdmin, isSubAdmin } = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [allocateUserId, setAllocateUserId] = useState(null);
  const [allocateCredits, setAllocateCredits] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "USER",
    credits: 0
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"]
  });

  const createMutation = useMutation({
    mutationFn: async (userData) => {
      const res = await apiRequest("POST", "/api/users", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateOpen(false);
      setNewUser({ username: "", email: "", password: "", role: "USER", credits: 0 });
      toast({ title: "User created successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to create user", description: err.message, variant: "destructive" });
    }
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
    }
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
    }
  });

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate(newUser);
  };

  const handleAllocateCredits = () => {
    const credits = parseInt(allocateCredits);
    if (isNaN(credits) || credits <= 0) {
      toast({ title: "Please enter a valid number of credits", variant: "destructive" });
      return;
    }
    allocateMutation.mutate({ userId: allocateUserId, credits });
  };

  const availableRoles = isRootAdmin 
    ? ["USER", "SUB_ADMIN"] 
    : ["USER"];

  // ...existing logic and handlers above...
  // UI below is replaced with the new layout structure and classes from UsersLayout.tsx, but all logic, handlers, and API calls remain byte-for-byte unchanged.
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-600 mt-1">Manage team members and their permissions</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" data-testid="button-create-user">
                <Plus className="w-5 h-5" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to your organization
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
                    onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(role => (
                        <SelectItem key={role} value={role}>
                          {ROLE_CONFIG[role].label}
                        </SelectItem>
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
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
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

        {/* Stats Row (optional, can be mapped to real stats if available) */}
        {/* ...existing logic for stats if present... */}

        {/* Search & Filter (optional, if logic exists) */}
        {/* ...existing logic for search/filter if present... */}

        {/* Users Table - new layout, but logic preserved */}
        <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700/50 overflow-hidden mt-6 shadow-sm dark:backdrop-blur-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-slate-700/70 bg-gray-50 dark:bg-slate-800/30">
                  <TableHead className="text-gray-700 dark:text-slate-400">User</TableHead>
                  <TableHead className="text-gray-700 dark:text-slate-400">Role</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-slate-400">Received</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-slate-400">Allocated</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-slate-400">Used</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-slate-400">Available</TableHead>
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
                    const available = (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0);
                    const isCurrentUser = user.id === currentUser?.id;
                    return (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}
                        className="border-b border-gray-100 dark:border-slate-700/30 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {user.username ? user.username[0] : ''}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{user.username}</div>
                              <div className="text-sm text-gray-500 dark:text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(config.color, "gap-1")}> 
                            <Shield className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(user.creditsReceived || 0)}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600 font-medium">
                          {formatNumber(user.creditsAllocated || 0)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {formatNumber(user.creditsUsed || 0)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatNumber(available)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Dialog 
                              open={allocateUserId === user.id} 
                              onOpenChange={(open) => {
                                if (!open) {
                                  setAllocateUserId(null);
                                  setAllocateCredits("");
                                }
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
                                  <DialogDescription>
                                    Allocate credits to {user.username}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
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
                                    Your available credits: {formatNumber(
                                      (currentUser?.creditsReceived || 0) - 
                                      (currentUser?.creditsAllocated || 0) - 
                                      (currentUser?.creditsUsed || 0)
                                    )}
                                  </p>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setAllocateUserId(null)}>
                                    Cancel
                                  </Button>
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
                                    Are you sure you want to delete {user.username}? This action cannot be undone.
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
                      <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-user">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Team Member
                      </Button>
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
