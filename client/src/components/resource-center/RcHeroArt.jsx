// M23-II-B — the homepage hero illustration. Inline SVG (not a raster asset),
// so it is theme-aware for free: every fill/stroke reads a design token, so it
// re-tunes in dark mode with the rest of the palette. Purely decorative
// (aria-hidden), lightweight, and abstract on purpose: a message clearing
// authentication checkpoints and landing in the inbox, which is exactly what
// the Resource Center teaches. No text, so nothing to translate or maintain.
export default function RcHeroArt({ className = "" }) {
  return (
    <svg
      viewBox="0 0 460 360"
      className={className}
      fill="none"
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="rc-hero-env" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(var(--primary))" />
          <stop offset="1" stopColor="hsl(var(--accent))" />
        </linearGradient>
        <linearGradient id="rc-hero-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--card))" />
          <stop offset="1" stopColor="hsl(var(--muted))" />
        </linearGradient>
      </defs>

      {/* soft backdrop panel */}
      <rect x="24" y="40" width="412" height="286" rx="26" fill="url(#rc-hero-panel)" stroke="hsl(var(--border))" />

      {/* dotted delivery trajectory */}
      <path d="M70 250 C 150 250, 150 130, 250 130 S 360 120, 392 110"
        stroke="hsl(var(--accent))" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 12" opacity="0.55" />

      {/* three authentication checkpoints (SPF / DKIM / DMARC), abstract */}
      {[[112, 232], [206, 178], [300, 150]].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="17" fill="hsl(var(--primary) / 0.10)" stroke="hsl(var(--primary) / 0.35)" />
          <path d={`M${cx - 6} ${cy} l4 4 l8 -8`} stroke="hsl(var(--primary))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      ))}

      {/* the envelope, mid-flight */}
      <g transform="translate(150 60)">
        <rect x="0" y="0" width="150" height="100" rx="14" fill="url(#rc-hero-env)" />
        <path d="M10 14 L75 60 L140 14" stroke="hsl(var(--primary-foreground))" strokeOpacity="0.9" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* the inbox target, with a delivered check */}
      <g transform="translate(346 236)">
        <rect x="-34" y="-30" width="68" height="60" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <rect x="-34" y="-30" width="68" height="16" rx="8" fill="hsl(var(--accent) / 0.18)" />
        <circle cx="20" cy="-24" r="12" fill="hsl(var(--success))" />
        <path d="M15 -24 l3.5 3.5 l6.5 -7" stroke="hsl(var(--success-foreground))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* accent motes for a touch of life */}
      <circle cx="70" cy="96" r="4" fill="hsl(var(--accent))" opacity="0.7" />
      <circle cx="398" cy="180" r="5" fill="hsl(var(--primary))" opacity="0.5" />
      <circle cx="120" cy="300" r="3" fill="hsl(var(--rc-cold-email))" opacity="0.7" />
    </svg>
  );
}
