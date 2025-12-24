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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <UsersIcon className="h-6 w-6" />
              User Management
            </h1>
            <p className="text-muted-foreground">
              Manage users and allocate credits
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-user">
                <Plus className="h-4 w-4" />
                Create User
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
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                    data-testid="input-new-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email"
                    data-testid="input-new-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="credits">Initial Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    value={newUser.credits}
                    onChange={(e) => setNewUser(prev => ({ ...prev, credits: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    data-testid="input-new-credits"
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
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-card-border">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : users?.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Used</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const config = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER;
                      const available = (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0);
                      const isCurrentUser = user.id === currentUser?.id;

                      return (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{user.username}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1", config.color)}>
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
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-16">
                <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium mb-2">No users found</p>
                <p className="text-muted-foreground mb-6">
                  Create your first user to get started
                </p>
                <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-user">
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
