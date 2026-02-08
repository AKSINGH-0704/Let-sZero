/**
 * PUBLIC PRICING PAGE — Read-only duplicate of Payments UI
 * 
 * Accessible without authentication.
 * No auth checks, no user balance, no payment history, no backend API calls.
 * CTA buttons route to /login (Sign In / Start Free Trial).
 */

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  CheckCircle, 
  ArrowRight,
  Zap,
  Star,
  Check,
  Shield,
  DollarSign,
  Mail
} from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";

export default function PublicPricing() {
  const [currency, setCurrency] = useState("INR");
  const USD_RATE = 83;

  const formatPrice = (plan) => {
    if (plan.isCustom) return "Custom pricing";
    if (plan.isTrial) return "Free";
    if (currency === "USD") {
      const usdPrice = (plan.priceINR / USD_RATE).toFixed(2);
      return `$${usdPrice}`;
    }
    return `₹${plan.priceINR}`;
  };

  const formatPerCredit = (plan) => {
    if (!plan.credits || plan.isCustom || plan.isTrial) return "—";
    if (currency === "USD") {
      const pricePerCredit = (plan.priceINR / USD_RATE / plan.credits).toFixed(4);
      return `$${pricePerCredit}`;
    }
    return `₹${(plan.priceINR / plan.credits).toFixed(2)}`;
  };

  const FIXED_PLANS = [
    {
      id: "trial",
      name: "Free Trial",
      credits: 500,
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

  const plans = FIXED_PLANS;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/products/repmail" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">REPMAIL</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="space-y-12 py-16 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Buy Email Credits</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Choose the package that fits your needs. All credits are valid for the specified period and never expire early.
          </p>
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

                <Link href={plan.isCustom ? "/contact?reason=enterprise" : "/login"}>
                  <Button
                    className={cn(
                      "w-full gap-2 font-medium py-3",
                      plan.isPopular
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : plan.isCustom
                        ? "bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    )}
                  >
                    {plan.isCustom ? "Contact Sales" : plan.isTrial ? "Start Free Trial" : "Get Started"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
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

        {/* Contact Sales */}
        <div className="text-center pt-8">
          <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Need a custom plan?</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-lg mx-auto">
            For enterprise needs or custom volume requirements, contact our sales team for a tailored solution.
          </p>
          <Link href="/contact?reason=enterprise">
            <Button variant="outline" className="gap-2">
              Contact Sales
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-medium">REPMAIL</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Home
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Contact
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
