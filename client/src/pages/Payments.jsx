import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
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
  Smartphone
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
  const [, setLocation] = useLocation();

  const { data: creditsInfo, isLoading: creditsLoading } = useQuery({
    queryKey: ["/api/credits/info"]
  });

  if (matchProcess && paramsProcess?.id) {
    return <ProcessPayment paymentId={paramsProcess.id} />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Payments & Credits
            </h1>
            <p className="text-muted-foreground">
              Manage your credits and view payment history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span>USD/INR supported</span>
            </div>
            <Button 
              className="gap-2" 
              onClick={() => setLocation("/pricing")}
              data-testid="button-buy-credits"
            >
              Buy Credits
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardDescription>Total Available</CardDescription>
              <CardTitle className="text-3xl">
                {creditsLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  formatNumber(creditsInfo?.total || 0)
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">credits</p>
            </CardContent>
          </Card>
          
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardDescription>Paid Credits</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {creditsLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  formatNumber(creditsInfo?.paid || 0)
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">purchased credits</p>
            </CardContent>
          </Card>
          
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardDescription>Trial Credits</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {creditsLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  formatNumber(creditsInfo?.trial || 0)
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {creditsInfo?.isTrialUser ? "demo credits remaining" : "trial completed"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-lg">Payment History</CardTitle>
            <CardDescription>View all your past transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentHistory />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
