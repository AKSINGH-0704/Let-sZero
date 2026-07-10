/**
 * Campaign Readiness panel — Campaign Creation Experience milestone.
 *
 * Compact, non-blocking status strip shown throughout the wizard (steps 1–6,
 * hidden on step 7 where the campaign has already sent — readiness is moot by
 * then). Purpose: eliminate late surprises. Every prerequisite it checks was
 * already enforced somewhere in the flow (mostly at step 6, CampaignConfirmation)
 * — this panel only makes those same checks visible from the beginning, using
 * data the app already fetches elsewhere. It never disables navigation; it is
 * informational only.
 *
 * No new backend endpoints — reuses GET /api/domains, GET /api/credits/info,
 * and fields already present on the AuthContext user object.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useCampaign } from "@/context/CampaignContext";
import { CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

function ReadinessItem({ state, label, detail, href }) {
  const Icon = state === "ready" ? CheckCircle2 : state === "attention" ? AlertCircle : Circle;
  const iconColor =
    state === "ready" ? "text-emerald-500" : state === "attention" ? "text-amber-500" : "text-muted-foreground/50";
  const content = (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} aria-hidden="true" />
      <span className="font-medium text-foreground">{label}</span>
      {detail && <span className="text-muted-foreground">— {detail}</span>}
    </div>
  );
  return href ? (
    <Link href={href} className="rounded hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  ) : content;
}

export default function CampaignReadinessPanel() {
  const { user } = useAuth();
  const { contacts, listId } = useCampaign();

  const { data: domains } = useQuery({ queryKey: ["/api/domains"] });
  const { data: creditsInfo } = useQuery({ queryKey: ["/api/credits/info"] });

  const hasVerifiedDomain = Array.isArray(domains) && domains.some(d => d.status === "VERIFIED");
  const hasSenderIdentity = !!user?.senderName?.trim();
  const hasContacts = contacts.length > 0 || !!listId;
  const creditsTotal = creditsInfo?.total ?? null;

  // Only the raw-upload path (contacts array populated) gives an honest contact
  // count here — a library-selected list's count lives in FileUpload's own local
  // state, not in CampaignContext, and isn't worth a second fetch to duplicate.
  // For that path we still show the flat credit balance, just without the
  // "enough for N contacts" comparison.
  const knownContactCount = contacts.length > 0 ? contacts.length : null;
  const creditsSufficient = creditsTotal == null ? null : knownContactCount == null
    ? creditsTotal > 0
    : creditsTotal >= knownContactCount;

  const items = [
    {
      key: "domain",
      label: "Sending domain",
      state: hasVerifiedDomain ? "ready" : "attention",
      detail: hasVerifiedDomain ? "verified" : "not verified yet",
      href: hasVerifiedDomain ? null : "/app/domains",
    },
    {
      key: "identity",
      label: "Sender identity",
      state: hasSenderIdentity ? "ready" : "attention",
      detail: hasSenderIdentity ? "set" : "not set",
      href: hasSenderIdentity ? null : "/app/profile",
    },
    {
      key: "credits",
      label: "Credits",
      state: creditsTotal == null ? "unknown" : creditsSufficient ? "ready" : "attention",
      detail: creditsTotal == null
        ? null
        : knownContactCount == null
          ? `${creditsTotal.toLocaleString()} available`
          : `${creditsTotal.toLocaleString()} available for ~${knownContactCount.toLocaleString()} contacts`,
      href: creditsTotal != null && !creditsSufficient ? "/app/payments" : null,
    },
    {
      key: "contacts",
      label: "Contacts",
      state: hasContacts ? "ready" : "unknown",
      detail: knownContactCount != null
        ? `${knownContactCount.toLocaleString()} imported`
        : hasContacts
          ? "list selected"
          : "not added yet",
      href: null,
    },
  ];

  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5"
      aria-label="Campaign readiness"
    >
      {items.map(item => (
        <ReadinessItem key={item.key} {...item} />
      ))}
    </div>
  );
}
