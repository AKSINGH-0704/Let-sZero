// M23-II-D — hand-authored, theme-aware explanatory diagrams for articles.
// Inline SVG (not raster) so every stroke/fill reads a design token and
// re-tunes in dark mode. Referenced by an article's optional `heroDiagram`
// frontmatter key and rendered as a captioned <figure> near the top of the
// piece. Decorative-but-informative: the caption carries the takeaway, the
// SVG is aria-hidden so screen readers get the caption, not the geometry.
//
// These are genuine visual explanations of the article's real content, not
// decoration. Add a new one here and reference it by key; nothing else changes.

function Frame({ children, viewBox = "0 0 640 240" }) {
  return (
    <svg viewBox={viewBox} className="w-full" fill="none" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rcf-brand" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="hsl(var(--primary))" />
          <stop offset="1" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

function node(x, y, label, sub, accentVar) {
  const accent = accentVar ? `hsl(var(${accentVar}))` : "hsl(var(--primary))";
  return (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="150" height="66" rx="12" fill="hsl(var(--card))" stroke={accent} strokeOpacity="0.4" />
      <text x={x + 16} y={y + 27} fill="hsl(var(--foreground))" fontSize="14" fontWeight="600" fontFamily="inherit">{label}</text>
      <text x={x + 16} y={y + 47} fill="hsl(var(--muted-foreground))" fontSize="11.5" fontFamily="inherit">{sub}</text>
    </g>
  );
}

function EmailAuthentication() {
  return (
    <Frame viewBox="0 0 640 210">
      {/* flow line */}
      <path d="M40 105 H600" stroke="url(#rcf-brand)" strokeWidth="2.5" strokeDasharray="2 10" strokeLinecap="round" opacity="0.5" />
      {/* sender */}
      <g>
        <circle cx="40" cy="105" r="10" fill="hsl(var(--primary))" />
      </g>
      {node(70, 20, "SPF", "Allowed to send?", "--rc-deliverability")}
      {node(250, 130, "DKIM", "Signature valid?", "--rc-deliverability")}
      {node(430, 20, "DMARC", "What if it fails?", "--rc-deliverability")}
      {/* inbox */}
      <g transform="translate(590 105)">
        <rect x="-8" y="-22" width="44" height="44" rx="9" fill="hsl(var(--success) / 0.15)" stroke="hsl(var(--success))" />
        <path d="M0 0 l7 7 l13 -14" stroke="hsl(var(--success))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(2 -2)" />
      </g>
    </Frame>
  );
}

function WarmupRamp() {
  const weeks = [
    { w: "Week 1", h: 34, label: "20–30/day" },
    { w: "Week 2", h: 74, label: "50–80/day" },
    { w: "Week 3", h: 118, label: "100–150/day" },
    { w: "Week 4+", h: 150, label: "Full volume" },
  ];
  const base = 180;
  return (
    <Frame viewBox="0 0 640 220">
      <line x1="40" y1={base} x2="600" y2={base} stroke="hsl(var(--border))" strokeWidth="1.5" />
      {weeks.map((d, i) => {
        const x = 80 + i * 140;
        return (
          <g key={i}>
            <rect x={x} y={base - d.h} width="82" height={d.h} rx="8" fill="hsl(var(--rc-deliverability) / 0.18)" stroke="hsl(var(--rc-deliverability))" strokeOpacity="0.5" />
            <rect x={x} y={base - d.h} width="82" height="6" rx="3" fill="hsl(var(--rc-deliverability))" />
            <text x={x + 41} y={base + 18} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12.5" fontWeight="600" fontFamily="inherit">{d.w}</text>
            <text x={x + 41} y={base - d.h - 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="inherit">{d.label}</text>
          </g>
        );
      })}
    </Frame>
  );
}

function WorkflowSplit() {
  const stages = [
    { label: "List", who: "you" },
    { label: "Write", who: "you" },
    { label: "Send + auth", who: "rep" },
    { label: "Deliver", who: "rep" },
    { label: "Track", who: "rep" },
    { label: "Follow up", who: "you" },
  ];
  return (
    <Frame viewBox="0 0 640 170">
      <path d="M40 85 H600" stroke="hsl(var(--border))" strokeWidth="2" />
      {stages.map((s, i) => {
        const x = 52 + i * 98;
        const rep = s.who === "rep";
        const c = rep ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
        return (
          <g key={i}>
            <circle cx={x} cy="85" r="13" fill={rep ? "hsl(var(--primary) / 0.14)" : "hsl(var(--muted))"} stroke={c} strokeOpacity="0.5" />
            <circle cx={x} cy="85" r="4" fill={c} />
            <text x={x} y="120" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="600" fontFamily="inherit">{s.label}</text>
            <text x={x} y="137" textAnchor="middle" fill={c} fontSize="10.5" fontFamily="inherit">{rep ? "RepMail" : "You"}</text>
          </g>
        );
      })}
    </Frame>
  );
}

// M27 — the layered gateway a message passes through before placement. Each
// layer is a distinct check; a message is scored, not simply passed/failed.
function SpamFilterLayers() {
  const layers = [
    { label: "Connection", sub: "IP & reverse DNS" },
    { label: "Authentication", sub: "SPF · DKIM · DMARC" },
    { label: "Content", sub: "text, HTML, links" },
    { label: "Engagement", sub: "opens, replies, spam" },
  ];
  return (
    <Frame viewBox="0 0 640 210">
      <path d="M40 105 H600" stroke="url(#rcf-brand)" strokeWidth="2.5" strokeDasharray="2 10" strokeLinecap="round" opacity="0.5" />
      <circle cx="40" cy="105" r="10" fill="hsl(var(--primary))" />
      {layers.map((l, i) => {
        const x = 74 + i * 132;
        return (
          <g key={i}>
            <rect x={x} y={72} width="118" height="66" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--rc-deliverability))" strokeOpacity="0.45" />
            <text x={x + 14} y={100} fill="hsl(var(--foreground))" fontSize="13.5" fontWeight="600" fontFamily="inherit">{l.label}</text>
            <text x={x + 14} y={120} fill="hsl(var(--muted-foreground))" fontSize="10.5" fontFamily="inherit">{l.sub}</text>
          </g>
        );
      })}
      <g transform="translate(590 105)">
        <rect x="-8" y="-22" width="44" height="44" rx="9" fill="hsl(var(--success) / 0.15)" stroke="hsl(var(--success))" />
        <path d="M0 0 l7 7 l13 -14" stroke="hsl(var(--success))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(2 -2)" />
      </g>
    </Frame>
  );
}

// M27 — accepted mail is not the same as inbox mail. After acceptance the
// receiver sorts every message into one of several destinations.
function InboxPlacementFunnel() {
  const dests = [
    { label: "Inbox", tone: "--success" },
    { label: "Promotions", tone: "--warning" },
    { label: "Spam", tone: "--destructive" },
  ];
  return (
    <Frame viewBox="0 0 640 210">
      {node(40, 88, "Accepted", "delivered is not seen", "--rc-deliverability")}
      <path d="M200 121 H250" stroke="hsl(var(--border))" strokeWidth="2" />
      {dests.map((d, i) => {
        const y = 24 + i * 66;
        return (
          <g key={i}>
            <path d={`M250 121 C 285 121, 285 ${y + 33}, 320 ${y + 33}`} stroke={`hsl(var(${d.tone}))`} strokeOpacity="0.5" strokeWidth="2" fill="none" />
            <rect x={320} y={y} width="150" height="52" rx="11" fill={`hsl(var(${d.tone}) / 0.12)`} stroke={`hsl(var(${d.tone}))`} strokeOpacity="0.5" />
            <text x={332} y={y + 31} fill="hsl(var(--foreground))" fontSize="13.5" fontWeight="600" fontFamily="inherit">{d.label}</text>
          </g>
        );
      })}
    </Frame>
  );
}

const FIGURES = {
  "email-authentication": { Art: EmailAuthentication, caption: "SPF, DKIM, and DMARC are three checks a receiving server runs before it trusts your mail. Pass all three and you reach the inbox." },
  "warmup-ramp": { Art: WarmupRamp, caption: "A typical four-week warm-up: start small, raise volume gradually, and let your bounce and complaint rates set the pace." },
  "workflow-split": { Art: WorkflowSplit, caption: "Where RepMail fits: it owns sending, authentication, deliverability, and tracking. You own the list, the message, and the follow-up." },
  "spam-filter-layers": { Art: SpamFilterLayers, caption: "A message passes through layered checks before placement: connection, authentication, content, then live engagement. Each layer scores you, rather than simply letting you through." },
  "inbox-placement-funnel": { Art: InboxPlacementFunnel, caption: "Acceptance is one decision; placement is the next. After a server accepts your mail it still sorts it into the inbox, Promotions, or spam." },
};

export default function RcFigure({ name }) {
  const fig = FIGURES[name];
  if (!fig) return null;
  const { Art, caption } = fig;
  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-card-border bg-card p-5 sm:p-6" data-testid={`article-figure-${name}`}>
      <Art />
      <figcaption className="mt-3 text-sm text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
