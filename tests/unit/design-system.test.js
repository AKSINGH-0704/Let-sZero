import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { Globe, CheckCircle2 } from "lucide-react";

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
import DesignPreview from "@/pages/_DesignPreview";

// Phase A verification: every shared primitive must compile and render without throwing.
// renderToStaticMarkup needs no DOM/jsdom — it catches import errors, JSX errors, and
// render-time exceptions (e.g. undefined access, bad hook usage).
describe("M19 design-system primitives render", () => {
  const cases = {
    StatusChip: h(StatusChip, { status: "verified" }),
    "StatusChip.checking": h(StatusChip, { status: "checking", size: "sm" }),
    Stepper: h(Stepper, { steps: [
      { label: "Registered", state: "done" },
      { label: "Add DNS", state: "active" },
      { label: "Verified", state: "todo" },
    ] }),
    SectionLabel: h(SectionLabel, null, "Domains"),
    PageHeader: h(PageHeader, { title: "Domains", description: "desc", icon: Globe }),
    EmptyState: h(EmptyState, { icon: Globe, title: "No domains", description: "Add one" }),
    Banner: h(Banner, { variant: "warning" }, "Preview mode"),
    StatCard: h(StatCard, { label: "Sent", value: "1,204", delta: { direction: "up", label: "+12%" }, icon: CheckCircle2 }),
    DnsRecordRow: h(DnsRecordRow, { record: { type: "CNAME", name: "x._domainkey.acme.com", value: "x.dkim.amazonses.com" }, status: "pending" }),
    DangerZone: h(DangerZone, { title: "Remove domain", description: "Cannot be undone" }),
    Breadcrumb: h(Breadcrumb, { items: [{ label: "Domains", href: "/app/domains" }, { label: "acme.com" }] }),
    "_DesignPreview (dev harness)": h(DesignPreview),
  };

  for (const [name, el] of Object.entries(cases)) {
    it(`${name} renders to non-empty markup`, () => {
      // Wrap in a wouter Router with an SSR path so components using <Link> render
      // without a browser location.
      const html = renderToStaticMarkup(h(Router, { ssrPath: "/app/domains" }, el));
      expect(typeof html).toBe("string");
      expect(html.length).toBeGreaterThan(0);
    });
  }
});
