import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { 
  Mail, 
  Clock, 
  Shield, 
  CheckCircle,
  Loader2,
  MessageSquare,
  Building2,
  Headphones,
  CreditCard,
  Handshake,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const REASONS = [
  { value: "SALES", label: "Sales Inquiry", icon: Building2, description: "Learn about our plans and features" },
  { value: "SUPPORT", label: "Technical Support", icon: Headphones, description: "Get help with technical issues" },
  { value: "BILLING", label: "Billing Question", icon: CreditCard, description: "Payment and invoice inquiries" },
  { value: "PARTNERSHIP", label: "Partnership", icon: Handshake, description: "Business collaboration opportunities" },
  { value: "ENTERPRISE_PRICING", label: "Enterprise / Custom Pricing", icon: Building2, description: "Custom volumes and dedicated support" },
  { value: "OTHER", label: "Other", icon: HelpCircle, description: "General questions and feedback" }
];

export default function Contact() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  
  // Parse query params for context from Payments page
  const searchParams = new URLSearchParams(location.split('?')[1] || "");
  const contextPlan = searchParams.get("plan");
  const contextReason = searchParams.get("reason");
  
  const [formData, setFormData] = useState({
    name: user?.username || "",
    email: user?.email || "",
    company: "",
    reason: contextReason === "enterprise" ? "ENTERPRISE_PRICING" : "",
    message: contextPlan ? `I'm interested in enterprise pricing for the ${contextPlan} plan.` : ""
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/contact", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    }
  });

  // M35-C â€” guarded: three clicks previously produced three POST /api/contact,
  // i.e. three duplicate enquiries from one visitor. The disabled button did
  // not help, because it is disabled by a render that has not happened yet when
  // the second click lands, and it never covered Enter-key submission.
  const [handleSubmit, isSubmitting] = useSubmitGuard(async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.reason || !formData.message) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    // The form previously accepted anything non-empty as an email, so a typo
    // was only caught by the server and surfaced as a generic failure.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
      return;
    }

    try {
      await submitMutation.mutateAsync(formData);
    } catch {
      // onError already surfaced this; swallowed so the guard's finally runs
      // and the form is usable again.
    }
  });

  const pending = isSubmitting || submitMutation.isPending;

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-card-border">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Message Sent!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for reaching out. Our team will respond within 24 hours.
            </p>
            <Button onClick={() => {
              setSubmitted(false);
              setFormData({ name: user?.username || "", email: user?.email || "", company: "", reason: "", message: "" });
            }}>
              Send Another Message
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions? We're here to help. Fill out the form below and our team will get back to you within 24 hours.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Contact Form
                </CardTitle>
                <CardDescription>
                  Fill out the form and we'll respond promptly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Your name"
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="you@example.com"
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company (Optional)</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Your company name"
                      data-testid="input-contact-company"
                    />
                  </div>

                  <div className="space-y-2">
                    {/* M35-F — the Label carried no htmlFor and the trigger no
                        id, so they were never associated: axe reported a
                        critical button-name violation and a screen reader
                        announced an unnamed combobox. Associating them (rather
                        than bolting on an aria-label) keeps the accessible name
                        identical to the visible text, which is also what WCAG
                        2.5.3 Label in Name wants. */}
                    <Label htmlFor="contact-reason">Reason for Contact *</Label>
                    <Select
                      value={formData.reason}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
                    >
                      <SelectTrigger id="contact-reason" data-testid="select-contact-reason">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {REASONS.map(reason => (
                          <SelectItem key={reason.value} value={reason.value}>
                            <div className="flex items-center gap-2">
                              <reason.icon className="h-4 w-4 text-muted-foreground" />
                              <span>{reason.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="How can we help you?"
                      className="min-h-[150px]"
                      data-testid="input-contact-message"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gap-2"
                    disabled={pending}
                    data-testid="button-submit-contact"
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-card-border">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Email Support</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      For general inquiries and support
                    </p>
                    <a href="mailto:support@letszero.in" className="text-sm text-primary hover:underline">
                      support@letszero.in
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Response Time</h3>
                    <p className="text-sm text-muted-foreground">
                      We typically respond within 24 hours during business days (Mon-Fri, 9 AM - 6 PM IST)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Your Privacy Matters</h3>
                    <p className="text-sm text-muted-foreground">
                      We respect your privacy. Your information is secure and will never be shared with third parties.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
