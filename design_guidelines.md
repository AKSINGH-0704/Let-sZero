# EmailFlow Pro - Design Guidelines

## Design Approach: Enterprise SaaS System

**Selected Approach:** Design System (Linear + Stripe + SendGrid hybrid)

EmailFlow Pro is a professional enterprise tool requiring clarity, trust, and efficiency. We'll draw from:
- **Linear** for clean dashboard patterns and typography hierarchy
- **Stripe** for restrained visual design and data presentation
- **SendGrid/Mailchimp** for email marketing UI patterns

**Core Principle:** Professional minimalism with purposeful data density. Every element serves a functional purpose.

---

## Typography System

**Font Stack:**
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for email previews, code-like content)

**Hierarchy:**
- Page titles: text-2xl/text-3xl, font-semibold
- Section headers: text-xl, font-semibold
- Card titles: text-lg, font-medium
- Body text: text-base, font-normal
- Helper text/metadata: text-sm, text-gray-600
- Micro labels: text-xs, uppercase, tracking-wide

---

## Layout & Spacing

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16 exclusively
- Compact spacing: p-2, p-4 (cards, buttons)
- Standard spacing: p-6, p-8 (sections)
- Generous spacing: p-12, p-16 (page containers)

**Grid System:**
- Dashboard: 4-column grid on desktop (grid-cols-4)
- Forms: 2-column on desktop where logical (grid-cols-2)
- Tables: Full-width, scrollable containers

**Container Strategy:**
- Main content: max-w-7xl mx-auto
- Forms/wizards: max-w-4xl mx-auto
- Modals: max-w-2xl

---

## Component Library

### Navigation
- **Top navbar:** Fixed header with logo, navigation items, user menu dropdown
- **Sidebar (optional):** For admin sections with hierarchical navigation
- Height: h-16 for navbar consistency

### Dashboard Cards
- Border: border border-gray-200
- Shadow: None or shadow-sm (subtle)
- Padding: p-6
- Hover: hover:border-gray-300 transition
- Metric display: Large number (text-3xl font-bold) + label (text-sm text-gray-600)

### Data Tables
- Striped rows: even:bg-gray-50
- Header: bg-gray-100 font-medium text-sm uppercase tracking-wide
- Cell padding: px-6 py-4
- Action columns: Right-aligned with icon buttons
- Status badges: Inline, pill-shaped with semantic colors

### Forms
- Input fields: border border-gray-300, focus:border-blue-500, focus:ring-2 focus:ring-blue-100
- Labels: text-sm font-medium mb-2
- Field groups: space-y-4
- Helper text: text-sm text-gray-500 mt-1
- Error states: border-red-300, text-red-600

### Buttons
- Primary: Solid with brand accent, font-medium
- Secondary: Border with transparent bg, hover:bg-gray-50
- Destructive: Red variants for delete/cancel
- Icon buttons: p-2 rounded hover:bg-gray-100
- Button heights: h-10 (standard), h-9 (compact)

### Progress & Status
- Progress bars: h-2 rounded-full bg-gray-200 with colored fill
- Status badges: px-2.5 py-0.5 rounded-full text-xs font-medium
  - Running: bg-blue-100 text-blue-800
  - Success: bg-green-100 text-green-800
  - Failed: bg-red-100 text-red-800
  - Pending: bg-yellow-100 text-yellow-800

### Modals & Overlays
- Backdrop: bg-black bg-opacity-50
- Modal: bg-white rounded-lg shadow-xl p-6
- Close button: Absolute top-right with X icon

### File Upload
- Dropzone: border-2 border-dashed border-gray-300 rounded-lg p-12 text-center
- Active state: border-blue-500 bg-blue-50
- File preview: Grid of thumbnail cards with remove button

---

## Screen-Specific Patterns

### Dashboard
- 4-card metric row at top (Available Credits, Used, Campaigns, Active)
- Recent activity list below (compact table or card list)
- Quick actions: Prominent "New Campaign" CTA button (top-right)

### Campaign Wizard (Multi-step)
- Step indicator: Horizontal stepper at top showing progress
- Content area: Centered max-w-4xl with step content
- Navigation: Back/Next buttons bottom-right, Cancel top-right
- Steps: Upload → Map → Template → Preview → Spam Check → Confirm → Progress

### Template Builder
- Split layout: Editor (60%) + Preview (40%)
- Sidebar with placeholder tokens (draggable chips)
- Rich text toolbar: Simple formatting options (bold, italic, link)
- Live preview updates as user types

### Campaign History
- Filter bar: Date range picker + status dropdown (top)
- Table: Sortable columns, pagination at bottom
- Row actions: View/Download icons (right column)
- Empty state: Centered illustration + "Create your first campaign" CTA

### User Management (Admin)
- Table with user hierarchy indication (indent or tree icon)
- Inline credit allocation input
- Role badges clearly visible
- Add user button: Top-right, prominent

---

## Icons
**Library:** Lucide Icons (via CDN)
- Navigation: Home, Users, Send, History, Settings
- Actions: Plus, Edit, Trash2, Eye, Download, Upload
- Status: CheckCircle, XCircle, Clock, AlertTriangle
- Size: Most icons w-5 h-5, larger for empty states w-12 h-12

---

## Images
No hero images required. This is a dashboard-heavy application. Use icons and illustrations for:
- Empty states (centered, w-48 h-48 grayscale illustrations)
- Email preview placeholders
- User avatars (circular, generated from initials if no photo)

---

## Animation Constraints
**Minimal animations only:**
- Hover transitions: transition-colors duration-150
- Modal enter/exit: fade + scale
- No auto-playing animations
- Progress bars: Smooth width transitions

---

## Accessibility
- All inputs have associated labels
- Focus states clearly visible (ring-2 ring-blue-500)
- Sufficient contrast ratios (WCAG AA minimum)
- Icon buttons include aria-labels
- Tables include proper headers
- Error messages announced to screen readers