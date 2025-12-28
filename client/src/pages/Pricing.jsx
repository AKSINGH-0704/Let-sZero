import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Check, 
  Zap, 
  TrendingUp, 
  Building2,
  Sparkles,
  ArrowRight,
  Shield,
  CreditCard,
  Smartphone,
  Loader2
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["/api/pricing/plans"]
  });

  const purchaseMutation = useMutation({
    mutationFn: async (planId) => {
      const res = await apiRequest("POST", "/api/payments/initiate", { planId });
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
      setLocation("/auth");
      return;
    }
    setSelectedPlan(planId);
    purchaseMutation.mutate(planId);
  };

  const paygPlans = plans?.filter(p => p.type === "payg") || [];
  const bulkPlans = plans?.filter(p => p.type === "bulk") || [];

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
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Pay only for what you use. No monthly fees, no hidden charges.
            1 credit = 1 email sent.
          </p>
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
                      <div className="mb-4">
                        <span className="text-4xl font-bold">₹{formatNumber(plan.priceInr)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-6">
                        ₹{plan.costPerEmail} per email
                      </p>
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
                      <div className="mb-4">
                        <span className="text-4xl font-bold">₹{formatNumber(plan.priceInr)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-6">
                        Save {plan.discount}% compared to pay-as-you-go
                      </p>
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
            <p className="text-muted-foreground">All transactions are encrypted and secure</p>
          </div>
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
          <div className="flex justify-center mt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>256-bit SSL encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
