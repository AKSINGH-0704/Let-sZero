import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  Receipt,
  ArrowRight,
  Loader2,
  Globe,
  Smartphone,
  Zap,
  Star,
  Check,
  Shield,
  DollarSign,
  Gift
} from "lucide-react";
import { formatDate, formatNumber, cn } from "@/lib/utils";

function formatCurrency(amount, currency) {
  if (currency === "INR") {
    return `₹${formatNumber(Math.round(amount))}`;
  }
  return `$${formatNumber(amount)}`;
}

function PaymentHistory() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["/api/payments"]
  });

  const statusConfig = {
    PENDING: { icon: Clock, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Pending" },
    SUCCESS: { icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Completed" },
    FAILED: { icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Failed" },
    REFUNDED: { icon: XCircle, color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", label: "Refunded" }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 rounded-full bg-primary/5" />
          </div>
          <Receipt className="relative h-12 w-12 mx-auto text-muted-foreground/40" />
        </div>
        <p className="text-lg font-medium mb-2">No payment history</p>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Your payment history will appear here after you purchase credits.
        </p>
        <Button asChild>
          <a href="/pricing">View Pricing Plans</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Credits</TableHead>
            <TableHead className="text-right">Amount (USD)</TableHead>
            <TableHead className="text-right">Local Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => {
            const status = statusConfig[payment.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;
            const currency = payment.currency || "USD";
            const amountUsd = payment.amountUsd || payment.amountInr || 0;
            const amountLocal = payment.amountLocal || payment.amountInr || amountUsd;
            
            return (
              <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                <TableCell className="font-mono text-sm">
                  {payment.invoiceNumber}
                </TableCell>
                <TableCell className="font-medium">
                  {payment.planName}
                </TableCell>
                <TableCell>
                  {formatNumber(payment.credits)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(amountUsd, "USD")}
                </TableCell>
                <TableCell className="text-right">
                  {currency !== "USD" && (
                    <span className="text-muted-foreground">
                      {formatCurrency(amountLocal, currency)}
                    </span>
                  )}
                  {currency === "USD" && (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={cn("gap-1", status.color)}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(payment.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  {payment.status === "SUCCESS" && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      data-testid={`button-download-${payment.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ProcessPayment({ paymentId }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: payment } = useQuery({
    queryKey: ["/api/payments", paymentId],
    queryFn: async () => {
      const payments = await fetch("/api/payments").then(r => r.json());
      return payments.find(p => p.id === paymentId);
    }
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/payments/${paymentId}/complete`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/info"] });
      toast({ title: "Payment successful!", description: `${formatNumber(data.payment.credits)} credits added to your account.` });
      setLocation("/app/payments");
    },
    onError: (err) => {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    }
  });

  const failMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/payments/${paymentId}/fail`, { reason: "User cancelled" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({ title: "Payment cancelled" });
      setLocation("/app/payments");
    }
  });

  const currency = payment?.currency || "USD";
  const amountLocal = payment?.amountLocal || 0;
  const paymentMethod = payment?.paymentMethod || "CARD";

  return (
    <AppLayout>
      <div className="max-w-md mx-auto py-12">
        <Card className="border-card-border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                {currency === "INR" && paymentMethod === "UPI" ? (
                  <Smartphone className="h-8 w-8 text-primary" />
                ) : (
                  <CreditCard className="h-8 w-8 text-primary" />
                )}
              </div>
            </div>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              {currency === "INR" 
                ? "Pay with UPI, cards, or net banking"
                : "Pay with international credit card"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {payment && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{payment.planName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credits</span>
                  <span className="font-medium">{formatNumber(payment.credits)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatCurrency(amountLocal, currency)}</span>
                </div>
                {currency === "INR" && payment.exchangeRate && (
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Exchange rate: 1 USD = ₹{payment.exchangeRate}
                  </div>
                )}
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground">
              This is a demo payment flow. In production, this would redirect to a payment gateway.
            </div>

            <Button 
              className="w-full gap-2"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              data-testid="button-complete-payment"
            >
              {completeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Simulate Successful Payment
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              className="w-full gap-2"
              onClick={() => failMutation.mutate()}
              disabled={failMutation.isPending}
              data-testid="button-cancel-payment"
            >
              {failMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Cancel Payment
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function Payments() {
  const [matchProcess, paramsProcess] = useRoute("/app/payments/process/:id");
  const [currency, setCurrency] = useState("INR");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const USD_RATE = 83; // Fixed conversion rate for display only
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: creditsInfo, isLoading: creditsLoading } = useQuery({
    queryKey: ["/api/credits/info"]
  });

  const { data: pricingPlans } = useQuery({
    queryKey: ["/api/pricing/plans"]
  });

  const initiateMutation = useMutation({
    mutationFn: async (tierId) => {
      const plan = pricingPlans?.plans?.find(p => p.id === tierId);
      const res = await apiRequest("POST", "/api/payments/initiate", {
        planId: tierId,
        currency: "INR",
        paymentMethod: "UPI"
      });
      return res.json();
    },
    onSuccess: (data) => {
      setShowConfirmModal(false);
      setSelectedTier(null);
      setLocation(data.redirectUrl);
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const handlePurchase = (tierId) => {
    const plan = FIXED_PLANS.find(p => p.id === tierId);
    
    // Route custom plans to contact page
    if (plan.isCustom) {
      setLocation(`/contact?reason=enterprise&plan=${encodeURIComponent(plan.name)}`);
      return;
    }
    
    // Trial plan - grant credits directly (existing logic will handle it)
    if (plan.isTrial) {
      setSelectedTier(plan);
      setShowConfirmModal(true);
      return;
    }
    
    // Paid plans - normal payment flow
    setSelectedTier(plan);
    setShowConfirmModal(true);
  };

  const handleConfirmPurchase = () => {
    if (selectedTier) {
      initiateMutation.mutate(selectedTier.id);
    }
  };

  const formatPrice = (plan) => {
    // For custom plans
    if (plan.isCustom) {
      return "Custom pricing";
    }
    // For trial plan
    if (plan.isTrial) {
      return "Free";
    }
    // For paid plans - display in selected currency
    if (currency === "USD") {
      const usdPrice = (plan.priceINR / USD_RATE).toFixed(2);
      return `$${usdPrice}`;
    }
    return `₹${plan.priceINR}`;
  };

  const formatPerCredit = (plan) => {
    // Guard against missing data
    if (!plan.credits || plan.isCustom || plan.isTrial) return "—";
    if (currency === "USD") {
      const pricePerCredit = (plan.priceINR / USD_RATE / plan.credits).toFixed(4);
      return `$${pricePerCredit}`;
    }
    return `₹${(plan.priceINR / plan.credits).toFixed(2)}`;
  };

  if (matchProcess && paramsProcess?.id) {
    return <ProcessPayment paymentId={paramsProcess.id} />;
  }

  // Fixed pricing plans (hardcoded SaaS pricing - INR only)
  const FIXED_PLANS = [
    {
      id: "trial",
      name: "Free Trial",
      credits: 1000,
      priceINR: 0,
      description: "Get started with email marketing",
      isTrial: true
    },
    {
      id: "starter",
      name: "Starter",
      credits: 3000,
      priceINR: 549,
      description: "Perfect for testing campaigns"
    },
    {
      id: "growth",
      name: "Growth",
      credits: 15000,
      priceINR: 1999,
      description: "For growing teams and regular sends",
      isPopular: true
    },
    {
      id: "scale",
      name: "Scale",
      credits: 50000,
      priceINR: 4999,
      description: "High-volume sending"
    },
    {
      id: "enterprise",
      name: "Enterprise",
      credits: null,
      priceINR: null,
      description: "Custom volumes with dedicated support",
      isCustom: true
    }
  ];

  const currentBalance = creditsInfo?.total || 0;
  const plans = FIXED_PLANS;

  return (
    <AppLayout>
      <div className="space-y-12 py-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Buy Email Credits</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Choose the package that fits your needs. All credits are valid for the specified period and never expire early.
          </p>
        </div>

        {/* Current Balance Card */}
        <div className="max-w-md mx-auto w-full">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-indigo-100 font-medium mb-1">Current Balance</div>
                <div className="text-4xl font-bold">{creditsLoading ? "..." : formatNumber(currentBalance)}</div>
                <div className="text-sm text-indigo-100 mt-1">credits</div>
              </div>
              <CreditCard className="w-16 h-16 text-white/20" />
            </div>
          </div>
        </div>

        {/* Currency Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1.5 gap-1">
            <button
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currency === "USD" 
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setCurrency("USD")}
            >
              <DollarSign className="w-4 h-4 inline mr-2" />
              USD
            </button>
            <button
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currency === "INR" 
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setCurrency("INR")}
            >
              ₹ INR
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto px-4">
          {plans.map((plan) => {
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl border-2 p-6 bg-white dark:bg-slate-900 transition-all hover:shadow-xl",
                  plan.isPopular
                    ? "border-indigo-500 shadow-xl lg:scale-105 lg:z-10"
                    : "border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700"
                )}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-indigo-600 text-white px-3 py-1 gap-1 shadow-lg">
                      <Star className="w-3 h-3 fill-current" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-6 pt-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 min-h-[2.5rem]">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">{formatPrice(plan)}</span>
                  </div>
                  {!plan.isCustom && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      {formatPerCredit(plan)} per credit
                    </div>
                  )}
                </div>

                {!plan.isCustom && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 mb-6 text-center border border-indigo-100 dark:border-indigo-800">
                    <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{formatNumber(plan.credits)}</div>
                    <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">email credits</div>
                  </div>
                )}

                <ul className="space-y-3 mb-6 min-h-[8rem]">
                  {plan.isCustom ? (
                    <li className="text-sm text-slate-600 dark:text-slate-400">
                      <div className="font-medium mb-3">Perfect for:</div>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>Custom email volumes</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>SLAs and dedicated support</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>Tailored deliverability</span>
                        </li>
                      </ul>
                    </li>
                  ) : (
                    <>
                      <li className="flex items-start gap-3 text-sm">
                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">Unlimited send frequency</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">Advanced analytics</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">24/7 customer support</span>
                      </li>
                      {plan.credits >= 10000 && (
                        <li className="flex items-start gap-3 text-sm">
                          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700 dark:text-slate-300">API access</span>
                        </li>
                      )}
                    </>
                  )}
                </ul>

                <Button
                  className={cn(
                    "w-full gap-2 font-medium py-3",
                    plan.isPopular
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : plan.isCustom
                      ? "bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  )}
                  onClick={() => handlePurchase(plan.id)}
                  disabled={initiateMutation.isPending}
                >
                  {plan.isCustom ? "Contact Sales" : plan.isTrial ? "Start Free Trial" : "Buy Credits"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-slate-600 dark:text-slate-400 pt-8 px-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span className="text-sm font-medium">Secure Payment</span>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span className="text-sm font-medium">All Cards Accepted</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span className="text-sm font-medium">Instant Delivery</span>
          </div>
        </div>

        {/* How Credits Work */}
        <div className="max-w-4xl mx-auto w-full px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6">How Credits Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center md:text-left">
              <div className="font-semibold text-slate-900 dark:text-white mb-2">1 Credit = 1 Email</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Each email sent consumes one credit from your balance.</p>
            </div>
            <div className="text-center md:text-left">
              <div className="font-semibold text-slate-900 dark:text-white mb-2">No Expiration</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Credits remain valid for the entire validity period shown.</p>
            </div>
            <div className="text-center md:text-left">
              <div className="font-semibold text-slate-900 dark:text-white mb-2">Instant Top-Up</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Credits are added to your account immediately after purchase.</p>
            </div>
          </div>
        </div>

        {/* Payment History Section */}
        <Card className="border-slate-200 dark:border-slate-700 max-w-6xl mx-auto w-full">
          <CardHeader>
            <CardTitle className="text-xl">Payment History</CardTitle>
            <CardDescription>View all your past transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentHistory />
          </CardContent>
        </Card>

        {/* Confirmation Modal */}
        {showConfirmModal && selectedTier && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <Card className="w-full max-w-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Confirm Purchase</CardTitle>
                <button 
                  className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setShowConfirmModal(false)}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Package</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{selectedTier.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Credits</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatNumber(selectedTier.credits)}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3 flex justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatPrice(selectedTier)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowConfirmModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    onClick={handleConfirmPurchase}
                    disabled={initiateMutation.isPending}
                  >
                    {initiateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : selectedTier?.isTrial ? (
                      <Gift className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    {selectedTier?.isTrial ? "Get Free Credits" : `Pay ${formatPrice(selectedTier)}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
