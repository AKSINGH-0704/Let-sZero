import { useState } from "react";
import { Button } from "@/components/ui/button";
import StatusChip from "@/components/common/StatusChip";
import Stepper from "@/components/common/Stepper";
import SectionLabel from "@/components/common/SectionLabel";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import Banner from "@/components/common/Banner";
import StatCard from "@/components/common/StatCard";
import DnsRecordRow from "@/components/common/DnsRecordRow";
import DangerZone from "@/components/common/DangerZone";
import Breadcrumb from "@/components/common/Breadcrumb";
import NavMenu from "@/components/layout/NavMenu";
import { Globe, Send, Trash2, RefreshCw, ShieldOff, CreditCard, SlidersHorizontal } from "lucide-react";

// DEV-ONLY visual QA harness for the M19 design-system primitives.
// Reachable at /_design in `npm run dev`. Excluded from production builds
// (registered behind an import.meta.env.DEV-gated lazy route in App.jsx).
// Use it to check spacing, typography, themes, responsiveness, interaction,
// focus states and reduced-motion before wiring primitives into real pages.
function Block({ title, children }) {
  return (
    <section className="space-y-3 border-b border-border pb-8">
      <SectionLabel>{title}</SectionLabel>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function DesignPreview() {
  const toggleTheme = () => document.documentElement.classList.toggle("dark");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Design System — Preview</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Dev-only. Toggle theme, resize the window, tab through for focus, and enable OS
              reduced-motion to verify the “Checking” spinner stops.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleTheme}>Toggle theme</Button>
        </div>

        {/* Typography scale */}
        <Block title="Typography scale">
          <div className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight">Page title — 24/600 tracking-tight</p>
            <p className="text-lg font-semibold">Section — 18/600</p>
            <p className="text-base font-medium">Card/row title — 16/500</p>
            <p className="text-sm">Body — 14/400</p>
            <p className="text-sm font-medium">Body-strong — 14/500</p>
            <p className="text-xs text-muted-foreground">Caption / help — 12/400 muted</p>
            <SectionLabel>Overline label — 12/600 uppercase</SectionLabel>
            <p className="font-mono text-[13px]">Mono — 13 · x._domainkey.acme.com</p>
          </div>
        </Block>

        <Block title="StatusChip — all states, two sizes">
          <div className="flex flex-wrap items-center gap-2">
            {["verified", "pending", "checking", "failed", "suspended", "neutral"].map(s => (
              <StatusChip key={s} status={s} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["verified", "pending", "checking", "failed"].map(s => (
              <StatusChip key={s} status={s} size="sm" />
            ))}
          </div>
        </Block>

        <Block title="Stepper — done / active / todo (horizontal ≥sm, vertical mobile)">
          <Stepper steps={[
            { label: "Registered", state: "done" },
            { label: "Add DNS records", state: "active" },
            { label: "Verified", state: "todo" },
          ]} />
        </Block>

        <Block title="PageHeader">
          <PageHeader
            title="Domains"
            description="Send from your own domain so deliverability stays yours."
            icon={Globe}
            actions={<Button size="sm"><Send className="mr-1.5 h-4 w-4" />Add domain</Button>}
          />
        </Block>

        <Block title="Banner — variants, action, dismiss">
          <Banner variant="info">You're in Preview Mode. Finish setup to unlock sending.</Banner>
          <Banner variant="success">acme.com is verified — you're ready to send.</Banner>
          <Banner variant="warning" action={<Button size="sm" variant="outline">Verify</Button>}>
            1 of 3 DNS records detected. We'll keep checking.
          </Banner>
          <Banner variant="danger" onDismiss={() => {}}>Verification window expired.</Banner>
        </Block>

        <Block title="StatCard — metric grid">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Sent" value="1,204" delta={{ direction: "up", label: "+12% vs last week" }} icon={Send} />
            <StatCard label="Bounce rate" value="0.4%" delta={{ direction: "down", label: "−0.2%" }} />
            <StatCard label="Domains" value="3" />
          </div>
        </Block>

        <Block title="DnsRecordRow — with detection status">
          <DnsRecordRow status="pending" record={{ type: "CNAME", name: "bobq._domainkey.acme.com", value: "bobq.dkim.amazonses.com" }} />
          <DnsRecordRow status="verified" record={{ type: "CNAME", name: "rzaw._domainkey.acme.com", value: "rzaw.dkim.amazonses.com" }} />
          <DnsRecordRow status="checking" record={{ type: "CNAME", name: "52ud._domainkey.acme.com", value: "52ud.dkim.amazonses.com" }} />
        </Block>

        <Block title="EmptyState">
          <EmptyState
            icon={Globe}
            title="Send from your own domain"
            description="Add a domain and we'll verify it automatically — usually in a few minutes."
            action={<Button><Globe className="mr-1.5 h-4 w-4" />Add your first domain</Button>}
          />
        </Block>

        <Block title="DangerZone">
          <DangerZone
            title="Remove domain"
            description="Deletes the domain and its SES identity. This cannot be undone."
            action={<Button variant="ghost" className="text-muted-foreground hover:text-destructive"><Trash2 className="mr-1.5 h-4 w-4" />Remove…</Button>}
          />
        </Block>

        <Block title="Breadcrumb — detail-page pattern">
          <Breadcrumb items={[{ label: "Domains", href: "/app/domains" }, { label: "acme.com" }]} />
        </Block>

        <Block title="NavMenu — reusable grouped 'Manage' menu (click to open)">
          <NavMenu
            trigger="Manage"
            icon={SlidersHorizontal}
            active="/app/domains"
            triggerActive
            groups={[
              { label: "Sending", items: [
                { href: "/app/domains", label: "Domains", icon: Globe, badge: "1" },
                { href: "/app/suppressions", label: "Suppressions", icon: ShieldOff },
              ] },
              { label: "Account", items: [{ href: "/app/payments", label: "Payments", icon: CreditCard }] },
            ]}
          />
        </Block>

        <Block title="Buttons (existing primitive) — CTA hierarchy">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled><RefreshCw className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" />Loading</Button>
          </div>
        </Block>
      </div>
    </div>
  );
}
