import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { 
  FileText,
  Plus,
  Edit,
  Trash2,
  Mail,
  Copy,
  Loader2,
  Eye,
  Star,
  Clock,
  Grid,
  List,
  Search
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

export default function Templates() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [searchValue, setSearchValue] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: ""
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["/api/templates"]
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setIsCreateOpen(false);
      setFormData({ name: "", subject: "", body: "" });
      toast({ title: "Template created successfully" });
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
      toast({ title: "Failed to create template", description: msg, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await apiRequest("PATCH", `/api/templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setEditTemplate(null);
      setFormData({ name: "", subject: "", body: "" });
      toast({ title: "Template updated successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to update template", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template deleted successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to delete template", description: err.message, variant: "destructive" });
    }
  });

  const handleCreate = () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: editTemplate.id, data: formData });
  };

  const handleEdit = (template) => {
    setEditTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body
    });
  };

  const handleDuplicate = (template) => {
    setFormData({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      body: template.body
    });
    setIsCreateOpen(true);
  };

  // Filter templates based on search
  const filteredTemplates = templates?.filter(template =>
    template.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    template.subject.toLowerCase().includes(searchValue.toLowerCase())
  ) || [];

  // Insert placeholder into textarea at cursor position
  const insertPlaceholder = (placeholder) => {
    const textarea = document.getElementById('body');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.body;

    const newText = text.substring(0, start) + placeholder + text.substring(end);
    setFormData(prev => ({ ...prev, body: newText }));

    // Move cursor after the inserted placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Email Templates</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Create and manage your email templates</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" data-testid="button-create-template">
                <Plus className="h-5 w-5" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Create a reusable email template with placeholders
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Welcome Email"
                    data-testid="input-template-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g., Welcome to our platform, {{name}}!"
                    data-testid="input-template-subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Email Body *</Label>
                  <Textarea
                    id="body"
                    value={formData.body}
                    onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                    placeholder="Write your email content here...

Use placeholders like {{name}}, {{company}}, {{category}} for personalization."
                    className="min-h-[200px]"
                    data-testid="input-template-body"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground w-full">Available placeholders:</p>
                  {["{{name}}", "{{email}}", "{{company}}", "{{category}}"].map(p => (
                    <Badge 
                      key={p} 
                      variant="secondary" 
                      className="font-mono cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900/50 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                      onClick={() => insertPlaceholder(p)}
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setFormData({ name: "", subject: "", body: "" });
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        {!isLoading && templates && (
          <div className="grid grid-cols-3 gap-6">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{templates.length}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Total Templates</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Star className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{templates.filter(t => t.isFavorite).length || 0}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Favorites</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{templates.slice(0, 3).length}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Recently Used</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & View Toggle */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'ghost'} 
              className={viewMode === 'grid' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : ''}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              className={viewMode === 'list' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : ''}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Templates Grid/List */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates?.length > 0 ? (
          <div className={viewMode === 'grid' ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
            {filteredTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all group"
                data-testid={`card-template-${template.id}`}
              >
                {/* Email Preview Mockup */}
                <div className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 min-h-[140px] flex flex-col">
                    {/* Email Header with Subject */}
                    <div className="flex items-start space-x-2 mb-3">
                      <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Subject:</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                          {template.subject || "No subject line"}
                        </p>
                      </div>
                    </div>
                    {/* Content Preview */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Preview:</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap">
                        {template.body ? template.body.substring(0, 120) + (template.body.length > 120 ? '...' : '') : 'This template is ready to send. Click to preview or edit content.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Template Info */}
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreviewTemplate(template)}
                      data-testid={`button-preview-${template.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="line-clamp-2 mb-3">
                    <Mail className="inline h-3 w-3 mr-1" />
                    {template.subject}
                  </CardDescription>
                  
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    {formatDate(template.createdAt)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm h-9"
                      onClick={() => handleDuplicate(template)}
                      data-testid={`button-duplicate-${template.id}`}
                    >
                      Use
                    </Button>
                    <Button 
                      variant="outline" 
                      className="p-2 h-9 w-9"
                      onClick={() => handleEdit(template)}
                      data-testid={`button-edit-${template.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="p-2 h-9 w-9"
                      onClick={() => handleDuplicate(template)}
                      data-testid={`button-copy-${template.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400"
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{template.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(template.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-24 w-24 rounded-full bg-primary/5" />
                  </div>
                  <FileText className="relative h-12 w-12 mx-auto text-muted-foreground/40" />
                </div>
                <p className="text-lg font-medium mb-2">No templates yet</p>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Templates help you save time by reusing email content. Create your first template to streamline your campaigns.
                </p>
                <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-template">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Template
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!editTemplate} onOpenChange={(open) => !open && setEditTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Update your email template
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Template Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-edit-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Subject Line *</Label>
                <Input
                  id="edit-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  data-testid="input-edit-subject"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-body">Email Body *</Label>
                <Textarea
                  id="edit-body"
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  className="min-h-[200px]"
                  data-testid="input-edit-body"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <p className="text-sm text-muted-foreground w-full">Available placeholders:</p>
                {["{{name}}", "{{email}}", "{{company}}", "{{category}}"].map(p => (
                  <Badge 
                    key={p} 
                    variant="secondary" 
                    className="font-mono cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900/50 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                    onClick={() => insertPlaceholder(p)}
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTemplate(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{previewTemplate?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Subject</p>
                <p className="font-medium">{previewTemplate?.subject}</p>
              </div>
              <div className="p-4 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Body</p>
                <div className="whitespace-pre-wrap text-sm">{previewTemplate?.body}</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
