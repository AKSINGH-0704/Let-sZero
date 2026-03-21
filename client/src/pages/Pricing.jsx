import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { 
  Check, 
  Zap, 
  TrendingUp, 
  Building2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Shield,
  CreditCard,
  Smartphone,
  Loader2,
  Globe,
  Info,
  Mail
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

function CurrencyToggle({ currency, onChange }) {
  return (
    <div className="flex items-center justify-center gap-2" data-testid="currency-toggle">
      <span className={cn(
        "text-sm font-medium transition-colors",
        currency === "USD" ? "text-foreground" : "text-muted-foreground"
      )}>
        USD
      </span>
      <button
        onClick={() => onChange(currency === "USD" ? "INR" : "USD")}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          currency === "INR" ? "bg-primary" : "bg-muted"
        )}
        data-testid="button-currency-switch"
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
            currency === "INR" ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
      <span className={cn(
        "text-sm font-medium transition-colors",
        currency === "INR" ? "text-foreground" : "text-muted-foreground"
      )}>
        INR
      </span>
    </div>
  );
}

function PriceDisplay({ plan, currency, exchangeRate }) {
  const symbol = currency === "INR" ? "₹" : "$";
  const price = currency === "INR" ? plan.priceInr : plan.priceUsd;
  const costPerEmail = currency === "INR" ? plan.costPerEmailInr : plan.costPerEmailUsd;
  
  return (
    <div className="text-center">
      <div className="mb-1">
        <span className="text-4xl font-bold">{symbol}{formatNumber(price)}</span>
      </div>
      {costPerEmail && (
        <p className="text-sm text-muted-foreground">
          {symbol}{costPerEmail.toFixed(currency === "INR" ? 2 : 4)} per email
        </p>
      )}
    </div>
  );
}

function PaymentMethodsDisplay({ currency }) {
  if (currency === "INR") {
    return (
      <div className="flex flex-wrap justify-center gap-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Smartphone className="h-5 w-5" />
          <span>UPI</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CreditCard className="h-5 w-5" />
          <span>Credit Card</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CreditCard className="h-5 w-5" />
          <span>Debit Card</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-5 w-5" />
          <span>Net Banking</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-wrap justify-center gap-8">
      <div className="flex items-center gap-2 text-muted-foreground">
        <CreditCard className="h-5 w-5" />
        <span>Visa</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <CreditCard className="h-5 w-5" />
        <span>Mastercard</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <CreditCard className="h-5 w-5" />
        <span>American Express</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Globe className="h-5 w-5" />
        <span>International Cards</span>
      </div>
    </div>
  );
}

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currency, setCurrency] = useState("USD");

  const { data: pricingData, isLoading } = useQuery({
    queryKey: ["/api/pricing/plans"]
  });

  const plans = pricingData?.plans || [];
  const exchangeRate = pricingData?.exchangeRate || 83.5;

  const purchaseMutation = useMutation({
    mutationFn: async (planId) => {
      const res = await apiRequest("POST", "/api/payments/initiate", { 
        planId,
        currency
      });
      return res.json();
    },
    onSuccess: (data) => {
      setLocation(data.redirectUrl);
    },
    onError: (err) => {
      toast({ title: "Failed to initiate payment", description: err.message, variant: "destructive" });
    }
  });

  const handleSelectPlan = (planId) => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    setSelectedPlan(planId);
    purchaseMutation.mutate(planId);
  };

  const paygPlans = plans.filter(p => p.type === "payg") || [];
  const bulkPlans = plans.filter(p => p.type === "bulk") || [];

  const planIcons = {
    payg_1000: Zap,
    payg_5000: TrendingUp,
    payg_10000: Building2,
    bulk_50000: Building2,
    bulk_100000: Sparkles,
    bulk_500000: Sparkles
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
            <img src="/repmail-logo.png" alt="RepMail" className="h-14 w-auto" style={{ objectFit: "contain" }} />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link href="/app/dashboard">
                <Button variant="ghost" data-testid="link-dashboard">Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="ghost" data-testid="link-login">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Pay only for what you use. No monthly fees, no hidden charges.
            1 credit = 1 email sent.
          </p>
          
          <div className="flex flex-col items-center gap-4">
            <CurrencyToggle currency={currency} onChange={setCurrency} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>
                {currency === "INR" 
                  ? `1 USD = ₹${exchangeRate.toFixed(2)} (indicative rate)`
                  : "Switch to INR for local pricing"
                }
              </span>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">Pay-As-You-Go Plans</h2>
            <p className="text-muted-foreground">Perfect for small to medium campaigns</p>
          </div>
          
          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="border-card-border">
                  <CardHeader>
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {paygPlans.map((plan, index) => {
                const Icon = planIcons[plan.id] || Zap;
                const isPopular = index === 1;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={cn(
                      "border-card-border relative",
                      isPopular && "border-primary shadow-lg"
                    )}
                    data-testid={`card-plan-${plan.id}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription>
                        {formatNumber(plan.credits)} credits
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="mb-6">
                        <PriceDisplay plan={plan} currency={currency} exchangeRate={exchangeRate} />
                      </div>
                      <ul className="space-y-3 text-sm text-left">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>{formatNumber(plan.credits)} email credits</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>No expiration</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Full analytics</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>AI personalization</span>
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full gap-2"
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={purchaseMutation.isPending && selectedPlan === plan.id}
                        data-testid={`button-buy-${plan.id}`}
                      >
                        {purchaseMutation.isPending && selectedPlan === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Buy Now
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">Bulk Plans</h2>
            <p className="text-muted-foreground">Best value for high-volume senders</p>
          </div>
          
          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="border-card-border">
                  <CardHeader>
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {bulkPlans.map((plan) => {
                const Icon = planIcons[plan.id] || Building2;
                
                return (
                  <Card 
                    key={plan.id} 
                    className="border-card-border"
                    data-testid={`card-plan-${plan.id}`}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {plan.discount}% OFF
                        </Badge>
                      </div>
                      <CardDescription>
                        {formatNumber(plan.credits)} credits
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="mb-6">
                        <PriceDisplay plan={plan} currency={currency} exchangeRate={exchangeRate} />
                        <p className="text-sm text-green-600 mt-2">
                          Save {plan.discount}% compared to pay-as-you-go
                        </p>
                      </div>
                      <ul className="space-y-3 text-sm text-left">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>{formatNumber(plan.credits)} email credits</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Priority support</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Dedicated account manager</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Custom integrations</span>
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full gap-2"
                        variant="outline"
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={purchaseMutation.isPending && selectedPlan === plan.id}
                        data-testid={`button-buy-${plan.id}`}
                      >
                        {purchaseMutation.isPending && selectedPlan === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Buy Now
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-muted/50 rounded-lg p-8">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold mb-2">Secure Payment Methods</h3>
            <p className="text-muted-foreground mb-4">
              {currency === "USD" 
                ? "Accept all major international credit cards"
                : "Pay with UPI, cards, or net banking"
              }
            </p>
          </div>
          
          <PaymentMethodsDisplay currency={currency} />
          
          <div className="flex flex-col items-center gap-3 mt-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>256-bit SSL encryption</span>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              {currency === "INR" 
                ? "Billed in USD. Local currency shown for convenience at current exchange rates."
                : "All transactions are processed securely in USD."
              }
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold mb-4">Need a custom plan?</h3>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            For enterprise needs or custom volume requirements, contact our sales team for a tailored solution.
          </p>
          <Link href="/contact">
            <Button variant="outline" className="gap-2" data-testid="button-contact-sales">
              Contact Sales
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/repmail-logo.png" alt="RepMail" className="h-10 w-auto" style={{ objectFit: "contain" }} />
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-muted-foreground hover:text-foreground text-sm transition-colors" data-testid="link-home-footer">
              Home
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground text-sm transition-colors" data-testid="link-contact-footer">
              Contact
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground text-sm transition-colors" data-testid="link-login-footer">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
