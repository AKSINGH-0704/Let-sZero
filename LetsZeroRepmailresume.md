# LetsZero & RepMail — Complete Project Resume

> **Version:** 2.0 · **Last Updated:** March 2026
> **Classification:** Internal Project Documentation
> **Status:** RepMail LIVE · MessageHub Q2 2026 · NotifyStream Q3 2026

---

## Table of Contents

1. [The Big Picture — What Is LetsZero?](#1-the-big-picture--what-is-letszero)
2. [Why This Is Being Built — The Problem Statement](#2-why-this-is-being-built--the-problem-statement)
3. [Real-World Impact & Market Context](#3-real-world-impact--market-context)
4. [Platform Vision, Mission & Core Principles](#4-platform-vision-mission--core-principles)
5. [Product Ecosystem](#5-product-ecosystem)
   - 5.1 [RepMail — Flagship Product (LIVE)](#51-repmail--flagship-product-live)
   - 5.2 [MessageHub (Q2 2026)](#52-messagehub-q2-2026)
   - 5.3 [NotifyStream (Q3 2026)](#53-notifystream-q3-2026)
6. [SaaS Business Model & Implementation](#6-saas-business-model--implementation)
7. [Technology Stack — Deep Dive](#7-technology-stack--deep-dive)
   - 7.1 [Frontend Stack](#71-frontend-stack)
   - 7.2 [Backend Stack](#72-backend-stack)
   - 7.3 [Database Layer](#73-database-layer)
   - 7.4 [AI & Intelligence Layer](#74-ai--intelligence-layer)
   - 7.5 [Build, Deployment & Infrastructure](#75-build-deployment--infrastructure)
   - 7.6 [Design System](#76-design-system)
8. [System Architecture — Theory & Flow](#8-system-architecture--theory--flow)
   - 8.1 [Overall Architecture Philosophy](#81-overall-architecture-philosophy)
   - 8.2 [Client–Server Communication Model](#82-clientserver-communication-model)
   - 8.3 [Authentication & Session Architecture](#83-authentication--session-architecture)
   - 8.4 [Dual-Mode Storage Architecture](#84-dual-mode-storage-architecture)
   - 8.5 [State Management Architecture](#85-state-management-architecture)
9. [Database Schema — Every Table Explained](#9-database-schema--every-table-explained)
   - 9.1 [Users](#91-users)
   - 9.2 [Sessions](#92-sessions)
   - 9.3 [Templates](#93-templates)
   - 9.4 [Contacts](#94-contacts)
   - 9.5 [Campaigns](#95-campaigns)
   - 9.6 [Campaign Emails](#96-campaign-emails)
   - 9.7 [Credit Transactions](#97-credit-transactions)
   - 9.8 [Audit Logs](#98-audit-logs)
   - 9.9 [Payments](#99-payments)
   - 9.10 [Contact Submissions](#910-contact-submissions)
   - 9.11 [Waitlist](#911-waitlist)
   - 9.12 [Schema Relationships Diagram](#912-schema-relationships-diagram)
10. [Data Validation — Zod Schema Layer](#10-data-validation--zod-schema-layer)
11. [User Role System & Hierarchy](#11-user-role-system--hierarchy)
12. [Credit Economy — Resource Governance](#12-credit-economy--resource-governance)
13. [The 7-Step Campaign Wizard](#13-the-7-step-campaign-wizard)
14. [AI-Powered Features — Theory & Implementation](#14-ai-powered-features--theory--implementation)
15. [Spam Analysis Engine](#15-spam-analysis-engine)
16. [Pricing, Plans & Payments](#16-pricing-plans--payments)
17. [Audit & Compliance System](#17-audit--compliance-system)
18. [API Surface Area](#18-api-surface-area)
19. [Routing Architecture — Every Page](#19-routing-architecture--every-page)
20. [Marketing & Landing Experience](#20-marketing--landing-experience)
21. [Waitlist & Early Access System](#21-waitlist--early-access-system)
22. [Security Model](#22-security-model)
23. [Project File Structure](#23-project-file-structure)
24. [Environment Configuration](#24-environment-configuration)
25. [Build, Development & Deployment](#25-build-development--deployment)
26. [Key Business Stats & Metrics](#26-key-business-stats--metrics)
27. [Platform Constants & Enumerations](#27-platform-constants--enumerations)
28. [Design Philosophy & UI/UX Guidelines](#28-design-philosophy--uiux-guidelines)
29. [Roadmap & Future Expansion](#29-roadmap--future-expansion)
30. [Glossary](#30-glossary)

---

## 1. The Big Picture — What Is LetsZero?

**LetsZero** is a communication infrastructure company building a suite of enterprise-grade, composable products for teams that require systems over features. It is not a single-purpose tool — it is a deliberate platform play designed to become the foundational layer through which modern B2B teams manage all forms of outbound and internal communication.

The name "LetsZero" represents the philosophy of starting from zero assumptions — building infrastructure that is clean, honest, and fundamentally sound from the ground up rather than layering features on top of technical debt.

LetsZero operates under the principle that **communication at scale is an infrastructure problem**, not a product problem. Most software in this space solves the "what do I send" question. LetsZero solves the "how do I reliably send, track, analyze, and govern communication at scale" question.

**The current live output of LetsZero is RepMail** — a full-stack SaaS email campaign management platform with a private beta waitlist for the broader platform.

---

## 2. Why This Is Being Built — The Problem Statement

### The Fragmentation Crisis in B2B Outbound

Modern outbound teams operate across an average of 5–7 disconnected tools. Each tool solves one narrow problem in isolation:

- A bulk email sender that doesn't understand deliverability
- A list management tool that doesn't connect to the sender
- An analytics dashboard that doesn't feed back into templates
- A spam checker that requires copy-pasting content manually
- A payment/credit system bolted on as an afterthought

This fragmentation creates compounding problems:

**1. Deliverability is a black box.** Teams don't know their inbox placement rate until a campaign has already underperformed. By the time open rates drop, thousands of emails have been flagged. No tool provides actionable deliverability intelligence before the send button is pressed.

**2. There is no unified credit/resource governance.** In team environments, there's no way to control how many emails sub-teams or individual users can send. Credits are either unlimited (causing runaway costs) or manually tracked in spreadsheets.

**3. Personalization is manual and error-prone.** Mail merges from CSV files are crude. Checking that `{{name}}` was correctly replaced before sending to 3,000 people requires manually building a preview system — which most teams don't have.

**4. Scaling outbound = scaling complexity.** Every new team member means another set of tool credentials, another billing relationship, another place where errors occur silently.

**5. Compliance and audit trails don't exist.** Who sent what campaign, when, with which template, how many credits it used, whether any delivery failures occurred — this data is scattered or non-existent.

### LetsZero's Answer

LetsZero builds the infrastructure layer that unifies all of this. A single system where:
- Campaign automation, deliverability intelligence, and performance analytics work together
- Resource governance (credits) flows hierarchically from platform owner to team managers to end users
- Every action is audited and reversible
- AI handles the personalization and content quality problems
- The architecture scales from startup to enterprise without redesign

---

## 3. Real-World Impact & Market Context

### The Market Opportunity

The global email marketing software market is valued at approximately **$1.5 billion USD** (2025), growing at ~13% CAGR. However, the problem LetsZero addresses is broader — the total addressable market for B2B communication infrastructure (email, messaging, notifications) exceeds **$8 billion USD**.

The specific gap LetsZero fills — unified outbound infrastructure with built-in governance, AI personalization, and deliverability intelligence — is largely unoccupied. Existing players (Mailchimp, SendGrid, Instantly, Apollo) either:
- Target consumers/small businesses with simple one-off blast tools
- Target large enterprises with expensive, over-engineered platforms
- Solve only one piece of the puzzle (sending OR analytics OR deliverability, not all three)

### Real-World Impact of RepMail

RepMail, as the live product, directly addresses:

- **For sales teams:** Replace the CSV-paste-into-Gmail workflow with a structured, auditable campaign system that personalizes automatically and scores content quality before sending
- **For agencies managing multiple clients:** The hierarchical user system (ROOT_ADMIN → SUB_ADMIN → USER) allows a single admin to govern multiple client teams, each with their own credit pools
- **For compliance-conscious organizations:** Every action from login to campaign execution to credit movement generates an immutable audit log — a requirement for industries under regulatory oversight
- **For cost-conscious operators:** The credit-per-email model ensures that costs are predictable, pre-authorized, and distributed correctly across the org

### Platform Stats (Projected/Target for Private Beta)

| Metric | Target |
|--------|--------|
| Teams on private beta waitlist | 200+ |
| Countries represented | 18+ |
| Campaign wizard completion rate | >80% |
| Spam score improvement via AI suggestions | avg −22 points |
| Credit system accuracy | 100% atomic |
| Audit coverage | 100% of write operations |
| Dual-currency coverage | USD + INR |
| Supported pricing plans | 4 paid + 1 trial + 1 enterprise custom |
| LandingExperience page sections | 5 major (Hero, Products, Mission, Stats, Contact) |

---

## 4. Platform Vision, Mission & Core Principles

**Company Tagline:** *"Communication infrastructure without compromise."*

**Mission Statement:** LetsZero builds composable communication products for teams that need systems, not features. Every tool we build is designed for reliability at scale — transparent, modular, and built to last.

### The Four Core Principles

These are not marketing copy — they are the literal architectural and product decisions that govern every feature decision in LetsZero:

| Principle | What It Means in Practice |
|-----------|--------------------------|
| **Reliability** | Infrastructure designed for uptime, consistency, and predictable performance. Credits are deducted atomically. Sessions never partially commit. Every state transition is logged. |
| **Scalability** | From Day 1, the user model is hierarchical (not flat). The storage layer abstracts the database. The credit system handles unlimited sub-trees. No architectural changes needed when org size grows 100x. |
| **Transparency** | No black boxes. Users see their exact credit balance, campaign delivery log per email, spam score with specific word flags, and full audit history. Admins see everything. |
| **Thoughtful Engineering** | Every schema column has a reason. Every API response shape is deliberate. The build system is explicit. Dual-mode storage means no "it works on my machine" problems. |

---

## 5. Product Ecosystem

### 5.1 RepMail — Flagship Product (LIVE)

RepMail is a full-stack B2B email campaign management platform. It is what the current codebase implements end-to-end. The name "RepMail" represents "Representative Mail" — email that represents your brand credibly, consistently, and at scale.

**What RepMail Does (Complete Capability List):**

- Upload contact lists from CSV or Excel files (.csv, .xlsx, .xls)
- Intelligent column detection and manual override for field mapping
- Dynamic email template builder with `{{name}}`, `{{email}}`, `{{company}}`, `{{category}}` merge-field placeholders
- AI-powered email personalization — GPT-4o rewrites each email naturally for each recipient's context
- Tone selection for AI output: Professional, Friendly, Formal, Casual
- Real-time email preview with sample contact data before sending
- Built-in spam analysis with a 0–100 risk score, risky word identification, and one-click word replacement suggestions
- AI-powered spam analysis via GPT-4o with detailed deliverability guidance
- Credit-based email sending governance — 1 credit = 1 email
- Pre-send credit sufficiency check — blocks campaigns if credits are insufficient
- Hierarchical user management: one ROOT_ADMIN controls SUB_ADMINs, who control USERs
- Per-user credit allocation with ledger-based tracking
- Real-time campaign progress tracking with live delivery log
- Full campaign history with search and status filtering
- Template library with CRUD operations
- Dual-currency pricing: USD (global) + INR (India-localized)
- Payment processing with multiple methods per currency
- Trial plan with free credits
- Comprehensive audit logging (27+ action types)
- Dark/light theme toggle persisted per user
- Contact form for sales, support, billing, and partnership inquiries
- Responsive design for all screen sizes

### 5.2 MessageHub (Q2 2026)

MessageHub is the second product in the LetsZero suite. It is a unified messaging platform targeting team collaboration, customer support, and workflow automation at scale.

**Planned Capabilities:**
- Unified inbox across channels (email, SMS, in-app)
- Advanced conversation routing with rule-based assignment
- Team collaboration features (internal notes, assignments, handoffs)
- Workflow automation (trigger-based message sequences)
- SLA tracking and response time analytics
- Integration with RepMail campaigns (close the loop between outbound and inbound)

*Currently in planning stage. No code exists yet.*

### 5.3 NotifyStream (Q3 2026)

NotifyStream is the third product — a multi-channel notification engine designed for product teams that need to send transactional, behavioral, and marketing notifications reliably at enterprise scale.

**Planned Capabilities:**
- Multi-channel delivery: push notifications, email, SMS, in-app
- Intelligent delivery timing (based on user behavior patterns)
- Compliance-ready templates with opt-out management
- Real-time delivery status and observability dashboard
- A/B testing for notification content
- Rate limiting and suppression list management
- Webhook-based event triggers from external systems

*Currently in planning stage. No code exists yet.*

---

## 6. SaaS Business Model & Implementation

LetsZero operates as a **credit-based SaaS** business model. This is a deliberate architectural and commercial decision with specific advantages over subscription-only or usage-billed models.

### Why Credit-Based?

**Predictability for users:** Credits are purchased upfront. Teams know exactly how many emails they can send before buying. No surprise bills.

**Governance for teams:** Credits flow from platform owner to team managers to end users in a controlled hierarchy. Each level has a defined budget. Overspending at any level is structurally impossible.

**Revenue model clarity:** For LetsZero, credit purchases are the primary revenue event. Credit consumption is the primary cost driver. This alignment between revenue and cost creates healthy unit economics.

**Flexibility:** Different teams consume credits at different rates. A flat monthly subscription would either under-charge heavy users or over-charge light users. Credit packs allow each team to right-size their spend.

### The SaaS Stack (Business Layer)

| Layer | Implementation |
|-------|----------------|
| **Pricing plans** | 4 paid tiers + 1 free trial + 1 enterprise custom, defined in `shared/schema.js` |
| **Credit purchase** | Payment initiation → processing → completion flow with audit trail |
| **Credit governance** | Hierarchical allocation — ROOT_ADMIN → SUB_ADMIN → USER |
| **Currency support** | USD (base) + INR (localized), exchange rate configurable |
| **Payment methods** | Card/International (USD), UPI/Card/Net Banking (INR) |
| **Trial offer** | 5 trial credits on account creation + 100 additional credits via Trial plan |
| **Revenue tracking** | Every payment stored with plan, amount in both currencies, method, transaction ID |
| **Invoice system** | Invoice number generated on payment completion, invoice URL stored |

### Multi-Tenant Architecture

RepMail implements true multi-tenancy at the data level:

- Every database record is scoped to a `user_id` (UUID)
- A ROOT_ADMIN can view all users' data for platform management
- SUB_ADMINs can view only their direct child users' data
- USERs can see only their own campaigns, templates, contacts, and credits
- Cross-tenant data access is blocked at the query level in the storage layer

---

## 7. Technology Stack — Deep Dive

### 7.1 Frontend Stack

The frontend is a React Single-Page Application (SPA) built with modern tooling optimized for developer experience and production performance.

| Technology | Version | Role | Why This Choice |
|-----------|---------|------|-----------------|
| **React** | 18 | UI framework | Concurrent features, stable ecosystem, hooks-based architecture |
| **Vite** | Latest | Build tool & dev server | 10-100x faster than Create React App, native ESM, HMR |
| **Wouter** | Latest | Client-side routing | 1.5KB vs React Router's 50KB — perfect for a focused SPA |
| **TanStack Query v5** | Latest | Server state management | Purpose-built for async server data; replaces Redux for most data needs |
| **Tailwind CSS** | v3 | Styling | Utility-first, eliminates CSS file maintenance, excellent with design systems |
| **shadcn/ui** | Latest | Component library | Accessible, composable, copy-paste architecture (owned components, not a black box) |
| **Radix UI** | Latest | Headless primitives | WCAG-compliant behavior for 30+ component types without style opinions |
| **Framer Motion** | Latest | Animations | Declarative animation API, layout animations, gesture support |
| **Lucide React** | Latest | Icons | Consistent 1,000+ icon set, tree-shakeable |
| **Recharts** | Latest | Data visualization | Composable chart library built on D3, React-native API |
| **React Hook Form** | Latest | Form management | Uncontrolled inputs for performance, integrates perfectly with Zod |
| **Zod** | Latest | Form validation (client) | Shared schemas with server — single source of truth |
| **xlsx** | Latest | Excel parsing (client) | Handles .xlsx and .xls formats without server round-trip for small files |
| **date-fns** | Latest | Date utilities | Lightweight, immutable, tree-shakeable alternative to Moment.js |
| **clsx + tailwind-merge** | Latest | Class name utilities | Safe conditional class combining without specificity conflicts |

**Notable Frontend Patterns:**

- **Path aliases:** `@/` resolves to `client/src/` for clean imports
- **`staleTime: Infinity`** on TanStack Query — data is never automatically refetched; mutations trigger manual invalidation for precise control
- **`credentials: "include"`** on all API requests — session cookie automatically included
- **Campaign polling:** `/app/campaigns/:id` polls every 2 seconds via `refetchInterval` until campaign reaches terminal state (COMPLETED or FAILED)
- **Optimistic updates:** Not used — consistency over speed; all mutations wait for server confirmation

### 7.2 Backend Stack

The backend is an Express.js API server running on Node.js, serving both the REST API and the React SPA in production.

| Technology | Role | Key Details |
|-----------|------|-------------|
| **Node.js** | Runtime | ESM modules throughout (`import/export`), runs via `tsx` in dev |
| **Express** | HTTP framework | Handles routing, middleware, static serving, cookie management |
| **Drizzle ORM** | Database interface | Type-safe queries, schema-as-code, migration via `drizzle-kit push` |
| **Zod** | Schema validation (server) | All request bodies validated before processing |
| **express-session** | Session middleware | Token-based, not Passport — custom `authMiddleware` reads the cookie |
| **connect-pg-simple** | Session store (prod) | Persists sessions in PostgreSQL `sessions` table |
| **memorystore** | Session store (dev) | In-memory equivalent when running without PostgreSQL |
| **pg** | PostgreSQL client | Low-level client used by Drizzle and the session store |
| **xlsx** | Server-side Excel parsing | Used for the `/api/parse-excel` endpoint when file exceeds client capacity |
| **crypto (built-in)** | Security primitives | SHA-256 for password hashing, 32-byte random hex for session tokens |
| **OpenAI SDK** | AI integration | `openai` npm package, `gpt-4o` model for all three AI features |

**Key Server Middleware Stack (in order):**

1. Cookie parser
2. JSON body parser
3. URL-encoded body parser
4. Express session
5. Request logging (timestamp + method + path + status + duration)
6. Static file serving (`dist/public/`) in production
7. API routes (`/api/*`)
8. SPA fallback (`index.html` for all unmatched non-API routes)

**Three middleware functions for route protection:**

- `authMiddleware` — validates session token from cookie or Authorization header, attaches `req.user`
- `adminMiddleware` — requires `role` to be `ROOT_ADMIN` or `SUB_ADMIN`
- `rootAdminMiddleware` — requires `role` to be exactly `ROOT_ADMIN`

### 7.3 Database Layer

**Primary Database:** PostgreSQL (production)
**Development Mode:** In-memory JavaScript Maps (same interface)

**Drizzle ORM** is used as the database interaction layer. Drizzle is chosen specifically because:
- Schema is defined in TypeScript/JavaScript (not SQL migrations files) — schema is the code
- Zero runtime magic — Drizzle generates explicit SQL, no hidden queries
- `drizzle-kit push` synchronizes schema to PostgreSQL without a separate migration file system
- `drizzle-zod` automatically generates Zod validation schemas from the Drizzle table definitions

**Dual-Mode Storage Pattern:**

This is one of the most important architectural decisions in the project. The server exports a unified `storage` object that is selected at startup:

- If `DATABASE_URL` is set AND `NODE_ENV === "production"` → use `dbStorage` (PostgreSQL via Drizzle)
- Otherwise → use `memoryStorage` (in-memory Maps, same interface)

Both implementations expose the **identical function signatures**. Every route handler calls `storage.getUserById()` or `storage.createCampaign()` — it never knows which backend it's talking to. This means:
- Development requires zero database setup
- Production uses real PostgreSQL with no code changes
- Testing can use the in-memory implementation

### 7.4 AI & Intelligence Layer

**Provider:** OpenAI
**Model:** `gpt-4o` (OpenAI's flagship model, used for all three AI features)
**Integration file:** `server/ai.js`

All AI features:
- Use `response_format: { type: "json_object" }` to guarantee parseable structured output
- Throw if `OPENAI_API_KEY` is not configured (caught by routes, which fall back to rule-based logic)
- Log all errors with `[AI]` prefix to console
- Have a complete non-AI fallback so the product works without the API key

**Three AI functions:**

| Function | Model Settings | Purpose |
|----------|----------------|---------|
| `generatePreviews()` | temp: 0.7, max_tokens: 2000 | Personalize up to 3 email previews in selected tone |
| `analyzeSpam()` | temp: 0.3, max_tokens: 1000 | Deep spam analysis with actionable suggestions |
| `generateTemplate()` | temp: 0.8, max_tokens: 1200 | Generate a complete template from a campaign description |

Temperature rationale:
- **0.3** for spam analysis — needs to be precise and consistent, not creative
- **0.7** for preview generation — needs natural variation between contacts, but grounded in facts
- **0.8** for template generation — needs creativity to write compelling copy

### 7.5 Build, Deployment & Infrastructure

**Development:** `tsx` (TypeScript execute) runs `server/index.js` directly, with Vite dev middleware embedded in Express for HMR.

**Production Build (two-phase):**

Phase 1 — Frontend: Vite compiles the React SPA into `dist/public/` (static HTML/CSS/JS bundle)
Phase 2 — Backend: esbuild bundles the entire Express server into `dist/index.cjs` (CommonJS, minified, externals excluded)

The single `dist/index.cjs` file is the entire application. It serves:
- The REST API at `/api/*`
- Static frontend assets from `dist/public/`
- SPA fallback (`index.html`) for all client-side routes

**Deployment Platform:** Vercel
Vercel's `@vercel/node` runtime executes `dist/index.cjs` as a serverless function. All traffic routes through it via `vercel.json`.

**`.env` loading:** The project uses a custom inline `.env` file reader at the top of `server/index.js` — no `dotenv` package required. It reads the file, parses `KEY=VALUE` lines, and sets `process.env` only if the key isn't already set (system env vars take precedence).

### 7.6 Design System

The LetsZero design system is a deliberate hybrid of Linear, Stripe, and SendGrid aesthetics — enterprise SaaS grade without being sterile.

| Aspect | Specification |
|--------|--------------|
| **App Component Library** | shadcn/ui — New York variant |
| **App Primary Font** | Inter (Google Fonts CDN, weights 300–600) |
| **Marketing Heading Font** | Space Grotesk (bold, geometric sans-serif) |
| **Monospace Font** | JetBrains Mono (email content, code-like text) |
| **Marketing Background** | `#0A0A0F` (near-black, not pure black) |
| **Accent Colors** | Violet `#8B5CF6`, Cyan `#06B6D4`, Amber `#F59E0B`, Emerald `#34D399` |
| **Theme System** | CSS custom properties, HSL values, dark/light mode via Tailwind `dark:` |
| **Theme Persistence** | `localStorage` key: `emailflow-theme` |
| **Motion Library** | Framer Motion (all animations — entrance, hover, scroll-triggered) |
| **Animation Philosophy** | Subtle entrance animations (fade + translate 20px, 0.6s), scroll-triggered via `whileInView`, hover lifts (-4px), no jarring transitions |

---

## 8. System Architecture — Theory & Flow

### 8.1 Overall Architecture Philosophy

LetsZero is a **monolithic SaaS** — a single Express server handles both the API and frontend delivery. This is an intentional architecture decision for the current stage:

- **No microservices complexity** at a stage where traffic is manageable
- **Simplified deployment** — one Vercel deployment, one `vercel.json`
- **Shared schemas** between client and server via `shared/schema.js` — types and validation are defined once
- **Easy developer onboarding** — one `npm run dev` starts everything

The architecture is designed to be **split later**: when MessageHub and NotifyStream launch, each product can become a separate service, sharing the authentication infrastructure and the `shared/schema.js` contract layer.

### 8.2 Client–Server Communication Model

**Protocol:** HTTP REST with JSON payloads
**Base URL Prefix:** `/api/`
**Authentication Mechanism:** HTTP-only cookie (`token`) or `Authorization: Bearer <token>` header

The client uses a custom `apiRequest()` function (in `client/src/lib/queryClient.js`) for all API calls. This function:
- Always includes `credentials: "include"` so the cookie is sent automatically
- Throws an error on any non-2xx response (caught by TanStack Query's `onError` handlers)
- Returns the raw `Response` object (caller calls `.json()` as needed)

TanStack Query wraps all `apiRequest()` calls:
- `queryKey` arrays mirror the API endpoint path (e.g., `["/api/dashboard/stats"]`)
- `staleTime: Infinity` — data is cached indefinitely; mutations explicitly invalidate related queries
- Mutations use `onSuccess` callbacks to invalidate relevant cache keys, triggering refetches

### 8.3 Authentication & Session Architecture

LetsZero uses **custom token-based session management** — not Passport, not JWT.

**The flow in detail:**

1. User submits `username + password` to `POST /api/auth/login`
2. Server fetches user by username from storage
3. Server hashes the submitted password with SHA-256 and compares to stored hash
4. If valid, server calls `crypto.randomBytes(32).toString("hex")` to generate a 64-char session token
5. Session record is inserted: `{ userId, token, expiresAt: now + 24h }`
6. Express sets an HTTP-only cookie: `token=<session_token>; HttpOnly; SameSite=Lax; Secure (prod)`
7. Server returns the sanitized user object (no `passwordHash`)
8. All subsequent requests include the cookie; `authMiddleware` validates it by querying the sessions table
9. On logout, the session record is deleted from the database and the cookie is cleared

**Forced Password Reset:**
New users have `mustResetPassword: true`. After login, the frontend's `AuthContext` detects this flag and redirects to `/reset-password`. The reset page skips the "current password" field (server-side logic also bypasses current password validation when `mustResetPassword === true`). After reset, the flag is set to `false`.

### 8.4 Dual-Mode Storage Architecture

The `server/storage.js` file is the heart of the backend. It defines a `StorageInterface` with all required methods and exports a single `storage` object that is one of two implementations:

**In-Memory Storage (`memoryStorage.js`):**
- Uses JavaScript `Map` objects as tables
- UUIDs generated via `crypto.randomUUID()`
- All query methods are `async` for interface compatibility
- Data scoped per user via filter operations on Maps
- Initialized with a ROOT_ADMIN on first run (reads from environment variables or defaults)

**PostgreSQL Storage (`dbStorage`, part of `storage.js`):**
- Uses Drizzle ORM with the `pg` client
- All queries are fully typed against the Drizzle table definitions in `shared/schema.js`
- Credit operations use PostgreSQL transactions for atomicity
- Session data persisted in the `sessions` table

**Selection Logic:**
```
DATABASE_URL set AND NODE_ENV === "production"
  → PostgreSQL (dbStorage)

Otherwise
  → In-Memory (memoryStorage)
```

### 8.5 State Management Architecture

The frontend uses four layers of state, each appropriate for its scope:

| Layer | Technology | What It Manages |
|-------|-----------|-----------------|
| **Server State** | TanStack Query v5 | All API data: user, campaigns, templates, contacts, transactions, audit logs |
| **Auth State** | React Context (`AuthContext`) | `user`, `isAuthenticated`, `isAdmin`, `isRootAdmin`, `login()`, `logout()`, `resetPassword()` |
| **Campaign Wizard State** | React Context (`CampaignContext`) | Step progression, parsed contacts, column mapping, template, AI previews, spam analysis result |
| **Theme State** | React Context (`ThemeContext`) | `theme` ("dark"/"light"), `toggleTheme()`, persisted in localStorage |
| **Local UI State** | React `useState` | Form field values, modal open/close, active tab, loading indicators within components |

---

## 9. Database Schema — Every Table Explained

All tables follow these conventions:
- **Primary Keys:** UUID (`uuid().defaultRandom()`) — not auto-increment integers
- **Timestamps:** UTC, stored as PostgreSQL `TIMESTAMP`
- **Foreign Keys:** Reference the parent UUID with `CASCADE` delete where child records should die with the parent
- **Nullable Fields:** Explicitly noted; all others are `NOT NULL`

### 9.1 Users

The central table. Every authenticated actor in the system is a user.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `username` | TEXT | — | Unique login identifier |
| `email` | TEXT | — | Unique email address |
| `password_hash` | TEXT | — | SHA-256 hash of the password |
| `role` | TEXT | `"USER"` | `ROOT_ADMIN` / `SUB_ADMIN` / `USER` |
| `parent_id` | UUID | null | FK → users.id (the user who created this user) |
| `credits_received` | INTEGER | 0 | Total credits ever received (allocated or purchased) |
| `credits_allocated` | INTEGER | 0 | Credits this user has given away to children |
| `credits_used` | INTEGER | 0 | Credits consumed by sending campaigns |
| `trial_credits` | INTEGER | 5 | Free trial credits given on account creation |
| `trial_credits_used` | INTEGER | 0 | Trial credits consumed |
| `is_trial_user` | BOOLEAN | true | Whether user is on trial tier |
| `must_reset_password` | BOOLEAN | true | Forces password change on first login |
| `is_active` | BOOLEAN | true | Soft-disable without deleting |
| `created_at` | TIMESTAMP | NOW() | Account creation time |
| `updated_at` | TIMESTAMP | NOW() | Last profile update |
| `last_login_at` | TIMESTAMP | null | Updated on successful login |

**Derived (computed, not stored):**
`credits_remaining = credits_received - credits_allocated - credits_used`

### 9.2 Sessions

One row per active login session. Sessions expire after 24 hours.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users.id (CASCADE) |
| `token` | TEXT | 64-char random hex, the cookie value |
| `expires_at` | TIMESTAMP | 24 hours from session creation |
| `created_at` | TIMESTAMP | When session was created |

### 9.3 Templates

Email templates with dynamic placeholder syntax.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users.id (CASCADE) — template owner |
| `name` | TEXT | Display name for the template |
| `subject` | TEXT | Email subject (may contain `{{placeholder}}` tokens) |
| `body` | TEXT | Email body (may contain `{{placeholder}}` tokens) |
| `is_default` | BOOLEAN | Whether this is the user's default template |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last edit time |

**Placeholder Syntax:**
Templates support four built-in placeholders: `{{name}}`, `{{email}}`, `{{company}}`, `{{category}}`. These are replaced per-recipient at preview time (AI-powered) and at send time.

### 9.4 Contacts

Individual recipients imported from CSV/Excel files.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users.id (CASCADE) — owner |
| `email` | TEXT | Recipient email address (required) |
| `name` | TEXT / null | Recipient name |
| `company` | TEXT / null | Company name |
| `category` | TEXT / null | Industry or category label |
| `custom_fields` | JSONB / null | Arbitrary key-value pairs for additional data |
| `created_at` | TIMESTAMP | Import time |

### 9.5 Campaigns

A campaign is a batch email send operation. It references a template and a set of contacts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users.id (CASCADE) — owner |
| `template_id` | UUID / null | FK → templates.id (nullable — template may be deleted) |
| `name` | TEXT | Campaign display name |
| `status` | TEXT | `DRAFT` / `PENDING` / `RUNNING` / `PAUSED` / `COMPLETED` / `FAILED` |
| `total_emails` | INTEGER | Number of recipients |
| `sent_emails` | INTEGER | Successfully delivered count |
| `failed_emails` | INTEGER | Failed delivery count |
| `credits_used` | INTEGER | Credits consumed so far |
| `contact_ids` | JSONB | Array of contact UUID strings |
| `template_snapshot` | JSONB / null | Frozen copy of the template at send time |
| `scheduled_at` | TIMESTAMP / null | Future scheduled send time |
| `started_at` | TIMESTAMP / null | When execution began |
| `completed_at` | TIMESTAMP / null | When campaign reached terminal state |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last status update |

**Template Snapshot:** When a campaign executes, the current template is frozen into `template_snapshot` as JSONB. This means editing the template later doesn't retroactively change historical campaign records — campaigns carry their own immutable copy of what was sent.

### 9.6 Campaign Emails

One row per individual email within a campaign. This is the per-recipient delivery ledger.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `campaign_id` | UUID | FK → campaigns.id (CASCADE) |
| `contact_id` | UUID | FK → contacts.id |
| `status` | TEXT | `pending` / `sent` / `failed` |
| `sent_at` | TIMESTAMP / null | Delivery timestamp |
| `error_message` | TEXT / null | Failure reason if status is `failed` |
| `credit_deducted` | BOOLEAN | Whether 1 credit was deducted for this email |
| `created_at` | TIMESTAMP | Record creation time |

### 9.7 Credit Transactions

The complete double-entry ledger for all credit movements. Every credit movement creates one or two records here.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users.id (CASCADE) — subject of the transaction |
| `type` | TEXT | `allocation_out` / `allocation_in` / `usage` / `purchase` |
| `amount` | INTEGER | Credits moved (positive = received, negative = spent) |
| `balance_before` | INTEGER | User's credit balance before this transaction |
| `balance_after` | INTEGER | User's credit balance after this transaction |
| `from_user_id` | UUID / null | Who gave the credits (allocation_in scenario) |
| `to_user_id` | UUID / null | Who received the credits (allocation_out scenario) |
| `campaign_id` | UUID / null | The campaign that consumed the credits (usage scenario) |
| `description` | TEXT / null | Human-readable description |
| `created_at` | TIMESTAMP | Transaction time |

**Double-Entry for Allocations:**
When ROOT_ADMIN allocates 500 credits to a SUB_ADMIN, two records are created:
1. ROOT_ADMIN row: `type: allocation_out, amount: -500`
2. SUB_ADMIN row: `type: allocation_in, amount: +500`

### 9.8 Audit Logs

The immutable event log. Every significant action in the system creates a record here. Records are never deleted.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID / null | Who performed the action (null for system actions) |
| `action` | TEXT | One of 27 defined `AUDIT_ACTIONS` enum values |
| `target_type` | TEXT / null | What kind of object was acted upon (`user`, `campaign`, `template`, `contacts`) |
| `target_id` | UUID / null | The specific object's UUID |
| `details` | JSONB / null | Action-specific metadata (e.g., credit amount, campaign name, error reason) |
| `ip_address` | TEXT / null | Requestor's IP |
| `user_agent` | TEXT / null | Browser/client identifier |
| `created_at` | TIMESTAMP | Exactly when the action occurred |

### 9.9 Payments

Records every payment transaction, successful or not.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users.id (CASCADE) — purchaser |
| `plan_name` | TEXT | Human-readable plan name (e.g., "Growth") |
| `credits` | INTEGER | Credits purchased |
| `amount_inr` | INTEGER | Amount in Indian Rupees |
| `amount_usd` | INTEGER | Amount in US Dollars |
| `amount_local` | INTEGER | Amount in user's selected currency |
| `currency` | TEXT | `USD` or `INR` |
| `exchange_rate` | TEXT / null | INR-per-USD rate at time of purchase |
| `status` | TEXT | `PENDING` / `SUCCESS` / `FAILED` / `REFUNDED` |
| `payment_method` | TEXT / null | `UPI` / `CARD` / `NET_BANKING` / `FREE` (trial) |
| `transaction_id` | TEXT / null | Generated on completion (format: `TXN-{timestamp}-{random}`) |
| `invoice_number` | TEXT / null | Generated on completion (format: `INV-{year}-{padded_number}`) |
| `invoice_url` | TEXT / null | Downloadable invoice link |
| `metadata` | JSONB / null | Additional payment gateway data |
| `created_at` | TIMESTAMP | Payment initiation time |
| `completed_at` | TIMESTAMP / null | Payment completion time |

### 9.10 Contact Submissions

Inbound contact form submissions from any visitor (authenticated or not).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Submitter's name |
| `email` | TEXT | Submitter's email |
| `company` | TEXT / null | Company name |
| `reason` | TEXT | `SALES` / `SUPPORT` / `BILLING` / `PARTNERSHIP` / `OTHER` |
| `message` | TEXT | The message body (min 10 characters) |
| `user_id` | UUID / null | FK → users.id if submitted by an authenticated user |
| `is_read` | BOOLEAN | Whether admin has viewed it |
| `responded_at` | TIMESTAMP / null | When admin responded |
| `created_at` | TIMESTAMP | Submission time |

### 9.11 Waitlist

Captures early access signups for the platform.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | TEXT | Signee's email (UNIQUE) |
| `source` | TEXT / null | Where the signup came from (`"hero"`, `"footer"`, etc.) |
| `created_at` | TIMESTAMP | Signup time |

### 9.12 Schema Relationships Diagram

```
users ──────────────────────────────────────────────────────────┐
  │ id (PK)                                                      │ parent_id
  │                                                              │ (self-referential
  ├──────────────────────────────────────────────────────────────┘  hierarchy)
  │
  ├── sessions (user_id FK, CASCADE)
  │     └── token: unique session identifier
  │
  ├── templates (user_id FK, CASCADE)
  │     └── subject/body: support {{placeholder}} tokens
  │
  ├── contacts (user_id FK, CASCADE)
  │     └── custom_fields: JSONB for extensible data
  │
  ├── campaigns (user_id FK, CASCADE)
  │     ├── template_id FK → templates (nullable)
  │     ├── contact_ids: JSONB array of contact UUIDs
  │     ├── template_snapshot: JSONB frozen copy at send time
  │     │
  │     └── campaign_emails (campaign_id FK, CASCADE)
  │           ├── contact_id FK → contacts
  │           └── credit_deducted: boolean ledger flag
  │
  ├── credit_transactions (user_id FK, CASCADE)
  │     ├── from_user_id FK → users (nullable)
  │     ├── to_user_id FK → users (nullable)
  │     └── campaign_id FK → campaigns (nullable)
  │
  ├── audit_logs (user_id FK, nullable)
  │     └── target_id: polymorphic UUID reference
  │
  ├── payments (user_id FK, CASCADE)
  │     └── dual-currency: amount_usd + amount_inr + exchange_rate
  │
  └── contact_submissions (user_id FK, nullable)

waitlist (standalone — no FK to users)
```

---

## 10. Data Validation — Zod Schema Layer

All validation is defined once in `shared/schema.js` and used on both client (form validation) and server (request body parsing). This is a single source of truth for data contracts.

| Schema Name | Used For | Key Constraints |
|-------------|---------|-----------------|
| `insertUserSchema` | Creating a new user | username ≥ 3 chars, password ≥ 6 chars, valid email format |
| `loginSchema` | Login form | username and password both required (non-empty) |
| `resetPasswordSchema` | Password change | currentPassword required, newPassword ≥ 6 chars, confirmPassword must match newPassword |
| `insertContactSchema` | Adding a contact | Valid email required; name/company/category optional |
| `insertTemplateSchema` | Creating a template | name, subject, body all required |
| `insertCampaignSchema` | Creating a campaign | name, status required |
| `insertAuditLogSchema` | Creating audit log | action required |
| `allocateCreditsSchema` | Credit allocation | targetUserId must be valid UUID, amount must be positive integer |
| `spamAnalysisSchema` | Spam check request | subject and body both required (non-empty) |
| `aiPreviewSchema` | AI preview request | subject, body required; contacts array max length 3 |
| `contactSubmissionSchema` | Contact form | name, valid email, reason enum (`SALES/SUPPORT/BILLING/PARTNERSHIP/OTHER`), message ≥ 10 chars |
| `purchaseCreditsSchema` | Credit purchase | planId required; paymentMethod optional enum (`UPI/CARD/NET_BANKING`) |
| `waitlistSchema` | Waitlist signup | Valid email required; source optional string |

**Validation Pattern (Server):**
Every route that accepts a request body calls `schema.safeParse(req.body)`. If it fails, the route returns HTTP 400 with the Zod error messages. Routes never trust unvalidated input.

---

## 11. User Role System & Hierarchy

LetsZero implements a strict three-tier role hierarchy with explicit parent-child relationships.

```
ROOT_ADMIN (Platform Level)
│
│  Capabilities:
│  ✓ View ALL users across the entire platform
│  ✓ Create SUB_ADMINs
│  ✓ Allocate credits to SUB_ADMINs
│  ✓ View ALL campaigns, templates, contacts
│  ✓ Access audit logs (read-only)
│  ✓ View all contact form submissions
│  ✓ Delete any non-ROOT_ADMIN user
│  ✓ Access /app/audit and /app/users pages
│  ✗ Cannot allocate credits directly to USERs (must go through SUB_ADMIN)
│
├── SUB_ADMIN (Team Manager Level)
│   │
│   │  Capabilities:
│   │  ✓ View own child USERs only
│   │  ✓ Create USERs (assigned as their own children)
│   │  ✓ Allocate credits to own child USERs only
│   │  ✓ Access /app/users (sees only own tree)
│   │  ✗ Cannot create other SUB_ADMINs
│   │  ✗ Cannot view other SUB_ADMIN's users
│   │  ✗ Cannot access /app/audit
│   │
│   ├── USER (End-User Level)
│   │     Capabilities:
│   │     ✓ Create and manage own campaigns
│   │     ✓ Create and manage own templates
│   │     ✓ Import contacts and run campaigns
│   │     ✓ View own credit balance and transactions
│   │     ✓ Purchase credits (via Payments page)
│   │     ✗ Cannot allocate credits to anyone
│   │     ✗ Cannot create any users
│   │     ✗ Cannot access Users or Audit pages
│   │
│   └── USER ... (more child users)
│
└── SUB_ADMIN ... (more sub-admins)
```

**Credit flow is constrained to this hierarchy.** Credits can only flow downward:
ROOT_ADMIN → SUB_ADMIN → USER. Credits cannot flow sideways or upward.

**Parent constraint:** When SUB_ADMIN allocates credits to a USER, the system verifies `user.parentId === subAdmin.id`. Allocation to anyone outside the direct parent-child relationship is rejected.

**Root Admin auto-creation:** On every server startup, `storage.initializeRootAdmin()` checks if a ROOT_ADMIN exists. If not, it creates one using environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`). If those aren't set, it falls back to defaults (`admin`, `changeme123`, `admin@repmail.io`).

---

## 12. Credit Economy — Resource Governance

Credits are the atomic resource unit. They represent a commitment: "I have the right to send this many emails."

### Credit Lifecycle

```
1. PURCHASE
   User buys a plan → payment.complete() called
   → user.credits_received += plan.credits
   → credit_transaction created (type: "purchase")
   → CREDITS_PURCHASED audit log

2. ALLOCATION (ROOT_ADMIN → SUB_ADMIN)
   Admin calls allocate-credits API
   → sender.credits_allocated += amount
   → receiver.credits_received += amount
   → 2x credit_transactions (allocation_out, allocation_in)
   → CREDITS_ALLOCATED audit log

3. ALLOCATION (SUB_ADMIN → USER)
   Same as above — receiver must be a direct child

4. CONSUMPTION (Campaign Send)
   Campaign starts execution
   → Pre-check: credits_remaining >= total_emails
   → If insufficient: blocked, CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS logged
   → For each email sent: user.credits_used += 1
   → credit_transaction created (type: "usage", campaign_id set)
   → EMAIL_SENT or EMAIL_FAILED audit log per email
```

### Credit Balance Formula

```
credits_remaining = credits_received - credits_allocated - credits_used
```

This formula ensures:
- Credits given away (allocated to children) are not available to spend
- Credits actually used (emails sent) reduce the balance
- Credits received include both purchased and allocated credits

### Trial Credits

Every new user starts with:
- `trial_credits: 5` — immediately available, no purchase needed
- `is_trial_user: true`

Additionally, the "Trial" pricing plan gives 100 more credits for free (simulated payment, auto-completed).

### Atomicity Guarantee

In PostgreSQL mode, credit deductions within a campaign use database transactions. If the deduction of any single email's credit fails, the entire operation is rolled back — the user's balance is never left in an inconsistent state. The `credit_deducted` boolean column on `campaign_emails` ensures exactly-once deduction per email.

---

## 13. The 7-Step Campaign Wizard

The New Campaign page is the core product experience. It guides users through a structured, irreversible workflow that validates at each step before proceeding. State is managed in `CampaignContext`.

### Step 1 — File Upload

**What happens:** User uploads a contact list file.

- Accepts `.csv`, `.xlsx`, `.xls`
- Maximum file size: 10 MB
- CSV files: parsed entirely client-side using a custom `parseCSV()` utility with auto-detection of comma, semicolon, or tab delimiters
- Excel files: converted to base64 and sent to `POST /api/parse-excel` for server-side parsing via the `xlsx` library
- On success: displays a preview table of the first 5 rows with header and total row count
- Parsed contacts stored in `CampaignContext.contacts`

### Step 2 — Column Mapping

**What happens:** User defines which CSV column maps to which data field.

- Auto-detection scans column headers for words like "email", "name", "company", "category" (case-insensitive)
- Four mappable fields: Email (required), Name, Company, Category
- Manual override dropdowns for each field
- Validation ensures the mapped email column contains actual email addresses
- Displays a badge showing how many columns were detected

### Step 3 — Template Builder

**What happens:** User creates the email template.

- Three fields: Template Name (optional), Subject Line (required), Email Body (required)
- Subject line character count shown (target: under 50 characters)
- Body is a monospace textarea for clear placeholder visibility
- **Click-to-insert placeholder buttons:** Clicking `{{name}}`, `{{email}}`, `{{company}}`, or `{{category}}` inserts the token at the cursor position in the body
- **Edit/Preview tab toggle:** Preview tab shows the template rendered with first contact's actual data
- **AI Generate (Collapsible panel):** User describes their campaign goal in plain English, selects a tone (Professional/Friendly/Formal/Casual), clicks Generate — GPT-4o writes the entire subject and body with proper placeholders, which auto-fills the form fields

### Step 4 — AI-Powered Preview

**What happens:** User sees the email as it will look for specific contacts.

- Sends `{ subject, body, contacts (up to 3), tone }` to `POST /api/ai/preview`
- GPT-4o receives the template with actual contact data (name, company, email, category) and rewrites each email in the selected tone — not just placeholder replacement, but natural language personalization
- Results displayed as three side-by-side preview cards, each showing the contact's details alongside their personalized subject and body
- Tone selection persists: changing tone and clicking "Regenerate" produces noticeably different output
- **Fallback:** If the OpenAI API is unavailable, client-side `replacePlaceholders()` is used (simple token replacement, no tone rewriting)
- Each AI preview generation is logged as `AI_PREVIEW_GENERATED` in audit logs

### Step 5 — Spam Analysis

**What happens:** User checks the template for deliverability risks.

- Sends `{ subject, body }` to `POST /api/ai/spam-analysis`
- GPT-4o analyzes the email across five dimensions:
  1. Spam trigger words and phrases
  2. Subject line issues (ALL CAPS, excessive punctuation)
  3. Body issues (exclamation overuse, misleading claims, promotional language)
  4. Structural problems (too many links, no unsubscribe mention)
  5. Tone issues (aggressive sales language, false urgency)
- Returns: `{ score: 0–100, riskyWords: string[], suggestions: [{original, suggestion}], summary: string }`
- Spam score display: 0–30 green (Safe), 31–60 yellow (Caution), 61–100 red (High Risk)
- **One-click suggestion acceptance:** Clicking "Accept" on a suggestion auto-replaces the word in the template and recalculates the spam score
- AI summary shown as a highlighted callout
- **Fallback:** If API unavailable, rule-based keyword scanner runs client-side (15 hardcoded trigger words)
- Each analysis is logged as `SPAM_ANALYSIS_RUN`

### Step 6 — Campaign Confirmation

**What happens:** User reviews the complete campaign before launching.

- Campaign name field (editable)
- Summary stats: total recipients, credits required, credits available
- Template preview rendered with first contact's data
- Spam score summary (color-coded)
- Credit sufficiency check — if `credits_remaining < total_emails`, send is blocked with a warning and "Buy Credits" link
- Confirmation checkbox: user must explicitly acknowledge before the send button activates
- Clicking "Send Campaign" → `POST /api/campaigns` with `{ name, template, contacts, totalEmails }`

### Step 7 — Progress Tracker

**What happens:** User watches their campaign execute in real time.

- Polls `GET /api/campaigns/:id` every 2 seconds via TanStack Query's `refetchInterval`
- Displays: status badge (RUNNING / COMPLETED / FAILED), progress bar (sent/total), sent count, failed count, credits consumed
- Per-email delivery log table (up to 50 entries) showing contact name, email, status, and timestamp
- Polling stops automatically when campaign reaches `COMPLETED` or `FAILED`
- On completion: success message, links to Dashboard and Campaign History
- "Start New Campaign" button resets `CampaignContext` state

---

## 14. AI-Powered Features — Theory & Implementation

### The AI Strategy

LetsZero uses AI at three distinct points in the user workflow, each with different temperature and purpose settings. All AI runs through `server/ai.js` via OpenAI's `gpt-4o` model.

**Core design principle:** AI is an enhancement, never a dependency. Every AI feature has a complete non-AI fallback that runs transparently when the API key is missing or the API is unavailable.

### AI Feature 1: Email Personalization (Step 4)

**Problem it solves:** A template with `{{name}}` replaced produces stilted, obviously templated emails. Real personalization means adapting the phrasing, greeting style, and tone to feel hand-written.

**How it works:**
A single GPT-4o call receives the template plus all three contacts (to generate three previews efficiently). The system prompt establishes GPT as an expert B2B email copywriter. The user prompt includes the template, contact details, and detailed tone instructions:

- **Professional:** Authoritative yet approachable, first-name greeting, confident but not stiff — for B2B outreach
- **Friendly:** Warm and conversational, upbeat, short sentences, uses first name freely — for rapport-building
- **Formal:** No contractions, full sentences, structured paragraphs, respectful and polished — for enterprise/legal
- **Casual:** Relaxed, direct, contractions everywhere, reads like a colleague wrote it — for internal or startup audiences

**Output format:** `response_format: { type: "json_object" }` ensures the response is always parseable JSON with a `previews` array.

### AI Feature 2: Spam Analysis (Step 5)

**Problem it solves:** Users don't know why their emails go to spam. A number without explanation doesn't help. What's needed is specific flagged phrases, why they're problematic, and exact replacements.

**How it works:**
A single GPT-4o call with `temperature: 0.3` (lower creativity, higher precision). The prompt defines five evaluation dimensions and instructs GPT to reference only actual text found in the email (not hypothetical issues). The AI returns:
- A score from 0 to 100
- An array of exact phrases found that are problematic
- Replacement suggestions with the original text and a professional alternative
- A one-sentence plain-English summary of the primary concern

This goes far beyond keyword matching — GPT understands context (e.g., "limited time" in a legal context is different from "LIMITED TIME OFFER!!!").

### AI Feature 3: Template Generation (Step 3, Collapsible)

**Problem it solves:** Most users know what they want to communicate but don't know how to structure a professional cold email. The blank page problem.

**How it works:**
User describes their campaign goal in plain English (e.g., "cold outreach to fintech founders introducing our AI email marketing platform and offering a free demo"). GPT-4o receives this plus the selected tone and generates a complete template — subject and body — with natural placeholder usage. The AI is briefed on all four available placeholders so it incorporates them naturally rather than awkwardly.

`temperature: 0.8` is used here because template generation benefits from creativity and variety — different runs of the same prompt should produce meaningfully different templates.

---

## 15. Spam Analysis Engine

### Rule-Based Fallback (No AI)

When the OpenAI API is unavailable, a deterministic spam checker runs client-side in `client/src/lib/utils.js`:

**15 Spam Trigger Words:**
`free`, `winner`, `click here`, `buy now`, `limited time`, `act now`, `urgent`, `congratulations`, `guarantee`, `no obligation`, `risk free`, `special offer`, `exclusive deal`, `you won`, `cash`

**Scoring rules:**
- +5 points per spam word found (case-insensitive, checked in both subject and body)
- +15 points if subject is ALL CAPS and longer than 5 characters
- +2 points per exclamation mark in subject or body
- Score capped at 100

**10 Built-in Replacement Suggestions:**

| Spam Word | Professional Replacement |
|-----------|------------------------|
| free | complimentary |
| winner | selected participant |
| click here | learn more |
| buy now | explore options |
| limited time | time-sensitive |
| act now | consider this opportunity |
| urgent | important |
| congratulations | we're pleased to inform you |
| guarantee | assurance |
| no obligation | no commitment required |

### AI-Enhanced Analysis

When GPT-4o is available, analysis goes far deeper:
- Context-aware detection (not just keyword presence)
- Detection of ALL CAPS subject lines and aggressive formatting
- Structural analysis (link-to-text ratio, unsubscribe language)
- Pressure tactics identification (false scarcity, false urgency)
- Natural language explanatory summary
- Exact phrase recommendations (not just word-level swaps)

---

## 16. Pricing, Plans & Payments

### Pricing Plans

| Plan | Credits | Price (USD) | Price (INR) | Type | Notes |
|------|---------|-------------|-------------|------|-------|
| **Trial** | 100 | Free | Free | Trial | Auto-completed, grants credits immediately |
| **Starter** | 1,000 | $2.39 | ₹199 | Pay-as-you-go | Entry level |
| **Growth** | 10,000 | $15.55 | ₹1,299 | Pay-as-you-go | Most popular |
| **Scale** | 50,000 | $59.95 | ₹4,999 | Bulk | High volume |
| **Enterprise** | Custom | Custom | Custom | Custom | Contact sales |

**Cost per email (Starter):** ~$0.00239 (< 1 paisa per email in INR)
**Cost per email (Growth):** ~$0.001555 (better unit economics at volume)
**Cost per email (Scale):** ~$0.001199 (bulk rate)

### Dual-Currency System

Base currency for all backend logic is **USD**. INR is a display and payment currency for Indian users.

- Default exchange rate: **83.50 INR per USD** (stored in `DEFAULT_EXCHANGE_RATE` constant)
- Rate is stored with each payment record so historical transactions show the rate that was in effect
- The `/api/pricing/plans` endpoint returns plans with prices calculated in both currencies
- Pricing page has a currency toggle (USD / INR) with instant recalculation

### Payment Methods by Currency

| Currency | Methods |
|----------|---------|
| **USD** | Visa, Mastercard, American Express, International cards |
| **INR** | UPI (PhonePe, Google Pay, Paytm), Credit Card, Debit Card, Net Banking |

### Payment Flow (Step by Step)

1. User selects a plan on the Payments page
2. `POST /api/payments/initiate` called with `{ planId, paymentMethod?, currency? }`
3. **Trial plan:** Credits granted immediately, payment auto-completed, redirect to dashboard
4. **Paid plans:** Payment record created with `status: PENDING`, user redirected to `/app/payments/process/:id`
5. Processing page shows payment details — user confirms
6. `POST /api/payments/:id/complete` called → credits added, transaction ID generated, invoice number assigned, audit log created
7. User can also cancel → `POST /api/payments/:id/fail` with optional reason
8. Payment history at `/app/payments` shows all payments with status, plan, amount, method, and transaction ID

### Invoice System

On payment completion:
- `transaction_id`: `TXN-{timestamp}-{6-char random hex}` (e.g., `TXN-1741234567890-a3f2d1`)
- `invoice_number`: `INV-{year}-{zero-padded sequential number}` (e.g., `INV-2026-00042`)
- Both stored in the `payments` table for retrieval

---

## 17. Audit & Compliance System

Every significant write operation in the platform creates an immutable audit log record. The audit system serves compliance, debugging, and transparency purposes.

### Complete List of Audited Actions (27 types)

| Action | When Triggered |
|--------|---------------|
| `USER_LOGIN` | Successful authentication |
| `USER_LOGOUT` | Explicit logout |
| `USER_CREATED` | Admin creates a new user |
| `USER_UPDATED` | User profile fields changed |
| `USER_DELETED` | Admin soft-deletes a user |
| `PASSWORD_CHANGED` | User resets their password |
| `PASSWORD_RESET_FORCED` | Admin forces a password reset |
| `CREDITS_ALLOCATED` | Credits transferred to a child user |
| `CREDITS_DEALLOCATED` | Credits taken back from a child user |
| `CREDITS_USED` | Credits consumed during campaign send |
| `CREDITS_PURCHASED` | Credits added via payment |
| `CAMPAIGN_CREATED` | New campaign record created |
| `CAMPAIGN_STARTED` | Campaign begins execution |
| `CAMPAIGN_PAUSED` | Running campaign paused |
| `CAMPAIGN_COMPLETED` | Campaign reaches COMPLETED state |
| `CAMPAIGN_FAILED` | Campaign reaches FAILED state |
| `CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS` | Campaign rejected due to insufficient credits |
| `EMAIL_SENT` | Individual email delivered successfully |
| `EMAIL_FAILED` | Individual email delivery failed |
| `TEMPLATE_CREATED` | New template saved |
| `TEMPLATE_UPDATED` | Existing template edited |
| `TEMPLATE_DELETED` | Template deleted |
| `CONTACT_IMPORTED` | Contacts uploaded from CSV/Excel |
| `AI_PREVIEW_GENERATED` | AI personalization preview requested |
| `SPAM_ANALYSIS_RUN` | Spam analysis performed |
| `PAYMENT_INITIATED` | Payment process started |
| `PAYMENT_SUCCESS` | Payment completed |
| `PAYMENT_FAILED` | Payment failed or cancelled |
| `CONTACT_FORM_SUBMITTED` | Contact form submitted by any visitor |

### Audit Log UI

The Audit Logs page (`/app/audit`, ROOT_ADMIN only):
- Full-text search across user, action, and detail fields
- Filter by action type via dropdown
- Each row shows: User, Action (color-coded badge with icon), Details (formatted JSONB), Target, Timestamp
- Pagination for large audit histories

---

## 18. API Surface Area

All endpoints are prefixed `/api/`. Protected endpoints require a valid session token.

### Authentication

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/login` | Public | Authenticate, set cookie, return user |
| POST | `/api/auth/logout` | Required | Invalidate session, clear cookie |
| GET | `/api/auth/me` | Required | Return current authenticated user |
| POST | `/api/auth/reset-password` | Required | Change password (skips current password check on mustResetPassword) |

### Dashboard

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/dashboard/stats` | Required | Aggregated stats — ROOT_ADMIN sees platform-wide, others see own data |

### User Management

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/users` | Admin | List accessible users |
| POST | `/api/users` | Admin | Create user (role limited by caller's role) |
| POST | `/api/users/:id/allocate-credits` | Admin | Allocate credits to a child user |
| DELETE | `/api/users/:id` | Admin | Soft-delete a user |

### Credits

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/credits/transactions` | Required | User's credit transaction history |
| GET | `/api/credits/info` | Required | User's current credit balance |

### Campaigns

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/campaigns` | Required | List campaigns |
| POST | `/api/campaigns` | Required | Create and execute campaign |
| GET | `/api/campaigns/:id` | Required | Get single campaign (used for progress polling) |
| PATCH | `/api/campaigns/:id` | Required | Update campaign fields |

### Templates

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/templates` | Required | List user's templates |
| POST | `/api/templates` | Required | Create template |
| PATCH | `/api/templates/:id` | Required | Update template |
| DELETE | `/api/templates/:id` | Required | Delete template |

### AI & Analysis

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/ai/preview` | Required | Generate personalized email previews (GPT-4o or fallback) |
| POST | `/api/ai/spam-analysis` | Required | Analyze email for spam risk (GPT-4o or fallback) |
| POST | `/api/ai/generate-template` | Required | Generate email template from description (GPT-4o) |

### Pricing & Payments

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/pricing/plans` | Public | All plans with dual-currency prices |
| POST | `/api/payments/initiate` | Required | Start a payment |
| POST | `/api/payments/:id/complete` | Required | Complete a payment, grant credits |
| POST | `/api/payments/:id/fail` | Required | Mark payment as failed |
| GET | `/api/payments` | Required | Payment history |

### Contact & Waitlist

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/contact` | Public | Submit a contact form inquiry |
| POST | `/api/waitlist` | Public | Join the early access waitlist |

### Admin

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/audit-logs` | ROOT_ADMIN | Query audit logs with filters |
| GET | `/api/admin/contact-submissions` | ROOT_ADMIN | View all contact form submissions |

### Utility

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/parse-excel` | Required | Parse base64-encoded Excel file server-side |

---

## 19. Routing Architecture — Every Page

### Public Pages (No Authentication Required)

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LandingExperience.tsx` | LetsZero platform marketing landing |
| `/early-access` | `WaitlistLanding.jsx` | Early access / waitlist signup |
| `/products/repmail` | `Landing.jsx` | RepMail product-specific landing |
| `/login` | `Login.jsx` | Authentication page (redirects if already logged in) |
| `/pricing` | `PublicPricing.jsx` | Public pricing page with currency toggle |
| `/contact` | `Contact.jsx` | Contact form |
| `*` | `not-found.jsx` | 404 page |

### Authenticated App Pages

| Route | Component | Access Level | Description |
|-------|-----------|-------------|-------------|
| `/app/dashboard` | `Dashboard.jsx` | All users | Stats grid, credit summary, charts, recent campaigns, quick actions |
| `/app/campaigns/new` | `NewCampaign.jsx` | All users | 7-step campaign wizard container |
| `/app/history` | `History.jsx` | All users | Campaign history with search and status filter |
| `/app/templates` | `Templates.jsx` | All users | Template CRUD with grid and list view modes |
| `/app/payments` | `Payments.jsx` | All users | Pricing plans, payment processing, payment history |
| `/app/payments/:rest*` | `Payments.jsx` | All users | Payments sub-routes (processing, success, etc.) |
| `/app/users` | `Users.jsx` | Admin only | User management, creation, credit allocation |
| `/app/audit` | `Audit.jsx` | ROOT_ADMIN only | Audit trail with search and filter |
| `/app/profile` | `Profile.jsx` | All users | Account info, role, credit summary, theme toggle |

### Route Protection

`ProtectedRoute` component (in `App.jsx`):
1. Checks `isAuthenticated` from `AuthContext`
2. If not authenticated → redirect to `/login`
3. If authenticated but `mustResetPassword === true` → redirect to `/reset-password`
4. If authenticated and password set → render the protected page

---

## 20. Marketing & Landing Experience

### LetsZero Platform Landing (`/` — `LandingExperience.tsx`)

The root landing page is a premium dark-themed marketing experience (`#0A0A0F` background). Built as a single large TypeScript component in `marketing/LFP_final/`.

**Sections:**
1. **Navigation bar** — Logo, Products dropdown (RepMail, MessageHub, NotifyStream), Mission link, Contact link, "Explore RepMail" + "Request Early Access" CTAs
2. **Hero Section** — "Communication infrastructure without compromise" headline with animated floating UI fragments (delivery metrics card, API health card, product capability card)
3. **Stats Bar** — 200+ Teams, 1.2B+ Messages Delivered, 99.98% Uptime, 1 Live · 2 Soon
4. **Product Suite Section** — Three product cards (RepMail LIVE, MessageHub Q2 2026, NotifyStream Q3 2026) with status indicators and feature bullets
5. **Mission Section** — Four principle cards in a constellation grid layout (Reliability, Scalability, Transparency, Thoughtful Engineering)
6. **Contact Section** — Inline contact form with category selection (Sales, Support, Billing, Partnership)
7. **Footer** — LetsZero branding, year

### RepMail Product Landing (`/products/repmail` — `Landing.jsx`)

A dedicated product page for RepMail within the main React app:

1. **Hero** — "Enterprise Email Campaign Control" with feature pill highlights
2. **6-Step Workflow Visualization** — Visual row: Upload → Column Mapping → AI Personalization → Spam Analysis → Credit Validation → Analytics
3. **Features Grid** — 99.9% Deliverability, Real-Time Analytics, Credit Governance, Hierarchical Management, AI-Powered, Spam Protection
4. **CTA** — Login and Dashboard links

### Early Access / Waitlist (`/early-access` — `WaitlistLanding.jsx`)

The private beta signup page for the LetsZero platform:

1. **Animated Background** — Floating violet/cyan/amber orbs with framer-motion drift animations, 50-particle star field, fine grid overlay
2. **Hero** — "Outbound infrastructure that actually works." headline with violet-to-cyan gradient text, email capture form
3. **Floating Metric Cards** — 4 semi-transparent glassmorphism cards showing live RepMail metrics (Campaign Complete, Anti-Spam Check, AI Preview Ready, Open Rate) drifting on the right side (desktop only)
4. **Stats Row** — 200+ Teams, 18 Countries, Private Beta invite-only
5. **Value Section** — Three feature cards (Campaign Automation, Deliverability Infrastructure, Performance Intelligence) with data-flow SVG animation
6. **Problem Section** — "Outbound is broken." with problem tag pills
7. **Vision Section** — "Building the infrastructure layer" with product roadmap timeline (RepMail live, MessageHub Q2 2026, NotifyStream Q3 2026)
8. **CTA Section** — Morse code animation (dots/dashes spelling "EARLY ACCESS" lighting up sequentially), email capture form with animated glow ring
9. **Footer** — LetsZero branding

---

## 21. Waitlist & Early Access System

### Purpose

The waitlist captures interest from potential users before general availability. It is LetsZero-platform branded (not RepMail-specific) because the pitch is the full infrastructure story, not just email.

### Implementation

**Signup Flow:**
1. User enters email on `/early-access` page
2. Client validates email format
3. `POST /api/waitlist` called with `{ email, source }`
4. Server validates via `waitlistSchema` (Zod)
5. If email already exists → HTTP 409 with "You're already on the list"
6. If new → record created in `waitlist` table with optional `source` field
7. Success state shown: "You're on the list. We'll reach out when it's your turn."

**Source Tracking:** The `source` field distinguishes where the signup came from:
- `"hero"` — from the hero section form
- `"footer"` — from the CTA section at the bottom of the page
- Extensible for future attribution tracking (social links, specific campaigns)

**Navigation Integration:** The "Request Early Access" button appears in:
- The LetsZero main landing navigation
- The RepMail product landing CTA
- The main Login page (redirects away from the sign-in flow)

---

## 22. Security Model

### Password Security

- Passwords are never stored in plaintext
- Storage: SHA-256 hash via Node.js built-in `crypto` module
- Note: SHA-256 without salt is the current implementation — bcrypt/Argon2 with salting is the production hardening path

### Session Security

- Session tokens: 32 cryptographically random bytes → 64-character hex string
- Cookie flags: `HttpOnly` (not accessible to JavaScript), `Secure` (HTTPS only in production), `SameSite=Lax` (CSRF protection)
- Sessions expire after 24 hours
- Logout explicitly deletes the session record from the database (token immediately invalidated)
- Middleware validates the token on every protected request — no JWT "trust the payload" vulnerability

### Input Validation

- All request bodies validated via Zod schemas before any processing
- SQL injection: not possible — Drizzle ORM uses parameterized queries exclusively
- XSS: React's default JSX escaping prevents XSS in rendered content

### Credential Management

- Admin credentials managed via environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`)
- `.env` file is gitignored — never committed to version control
- No credentials appear in source code
- Users without the credentials cannot access the admin account

### Authorization

- Three distinct middleware layers: `authMiddleware` (any authenticated user), `adminMiddleware` (admin+), `rootAdminMiddleware` (root only)
- Every admin action verifies the caller's role server-side — client-side role hiding is UI-only

---

## 23. Project File Structure

```
Let-sZero/
│
├── client/                          # React SPA frontend
│   ├── index.html                   # HTML shell — loads Google Fonts
│   └── src/
│       ├── App.jsx                  # Root — providers, router, protected routes
│       ├── main.jsx                 # ReactDOM.createRoot entry point
│       ├── index.css                # Tailwind directives + CSS custom properties
│       │
│       ├── components/
│       │   ├── campaign/            # 7 campaign wizard step components
│       │   │   ├── FileUpload.jsx        # Step 1
│       │   │   ├── ColumnMapping.jsx     # Step 2
│       │   │   ├── TemplateBuilder.jsx   # Step 3 (+ AI generate panel)
│       │   │   ├── AiPreview.jsx         # Step 4
│       │   │   ├── SpamAnalyzer.jsx      # Step 5 (+ AI summary)
│       │   │   ├── CampaignConfirmation.jsx # Step 6
│       │   │   ├── ProgressTracker.jsx   # Step 7
│       │   │   └── StepIndicator.jsx     # Step progress bar
│       │   │
│       │   ├── layout/
│       │   │   ├── AppLayout.jsx    # Authenticated page wrapper
│       │   │   ├── Navbar.jsx       # Top navigation bar
│       │   │   └── ThemeToggle.jsx  # Dark/light toggle
│       │   │
│       │   └── ui/                  # 40+ shadcn/ui components
│       │       └── (accordion, alert, badge, button, card, checkbox,
│       │            dialog, dropdown-menu, form, input, label, progress,
│       │            select, separator, table, tabs, textarea, toast,
│       │            tooltip, collapsible, and more...)
│       │
│       ├── context/
│       │   ├── AuthContext.jsx      # Auth state, login/logout/reset methods
│       │   ├── CampaignContext.jsx  # Campaign wizard multi-step state
│       │   └── ThemeContext.jsx     # Dark/light theme
│       │
│       ├── hooks/
│       │   ├── use-mobile.js        # Breakpoint detection hook
│       │   └── use-toast.js         # Toast notification hook
│       │
│       ├── lib/
│       │   ├── queryClient.js       # TanStack Query config + apiRequest()
│       │   └── utils.js             # cn(), parseCSV(), replacePlaceholders(),
│       │                            # calculateSpamScore(), formatDate(), etc.
│       │
│       └── pages/
│           ├── Audit.jsx            # Audit logs (ROOT_ADMIN)
│           ├── Contact.jsx          # Public contact form
│           ├── Dashboard.jsx        # Main dashboard
│           ├── History.jsx          # Campaign history
│           ├── Landing.jsx          # RepMail product landing
│           ├── Login.jsx            # Auth page (Sign In / Request Access tabs)
│           ├── NewCampaign.jsx      # Campaign wizard container
│           ├── not-found.jsx        # 404
│           ├── Payments.jsx         # Payments + pricing
│           ├── Profile.jsx          # User profile
│           ├── PublicPricing.jsx    # Public pricing
│           ├── ResetPassword.jsx    # Forced password reset
│           ├── Templates.jsx        # Template library
│           ├── Users.jsx            # User management (admin)
│           └── WaitlistLanding.jsx  # Early access waitlist
│
├── marketing/LFP_final/            # LetsZero platform marketing site
│   ├── LandingExperience.tsx       # Full landing page (monolithic)
│   ├── index.html
│   └── src/ styles/                # Marketing-specific code
│
├── server/                         # Express API backend
│   ├── index.js                    # App entry — .env loader, Express setup, server start
│   ├── routes.js                   # All API route handlers
│   ├── storage.js                  # Unified storage interface + PostgreSQL adapter
│   ├── memoryStorage.js            # In-memory storage adapter (dev mode)
│   ├── db.js                       # Drizzle + pg connection setup
│   ├── ai.js                       # OpenAI GPT-4o integration (3 functions)
│   ├── static.js                   # Production static file serving
│   └── vite.js                     # Development Vite middleware setup
│
├── shared/
│   └── schema.js                   # Drizzle tables + Zod schemas + pricing + constants
│
├── script/
│   └── build.js                    # Production build orchestrator (Vite + esbuild)
│
├── .env                            # Local secrets (gitignored)
├── .gitignore                      # Includes .env, node_modules, dist
├── components.json                 # shadcn/ui configuration (New York style)
├── drizzle.config.js               # Drizzle Kit config (points to shared/schema.js)
├── package.json                    # All dependencies and npm scripts
├── postcss.config.js               # PostCSS (Tailwind integration)
├── tailwind.config.js              # Tailwind config with shadcn/ui extension
├── tsconfig.json                   # TypeScript config (for shadcn/ui + marketing)
├── vercel.json                     # Vercel deployment configuration
└── vite.config.js                  # Vite config with @/ alias and server proxy
```

---

## 24. Environment Configuration

| Variable | Required For | Description | Default |
|----------|-------------|-------------|---------|
| `DATABASE_URL` | Production only | PostgreSQL connection string | none (uses in-memory) |
| `NODE_ENV` | Recommended | `development` or `production` | `development` |
| `PORT` | Optional | Server listening port | `5000` |
| `OPENAI_API_KEY` | AI features | OpenAI API key for GPT-4o | none (AI uses fallback) |
| `ADMIN_USERNAME` | Optional | Root admin login username | `admin` |
| `ADMIN_PASSWORD` | Optional | Root admin login password | `changeme123` |
| `ADMIN_EMAIL` | Optional | Root admin email | `admin@repmail.io` |

**`.env` file format (gitignored):**
```
ADMIN_USERNAME=yourUsername
ADMIN_PASSWORD=yourSecurePassword
ADMIN_EMAIL=you@yourdomain.com
OPENAI_API_KEY=sk-proj-...
NODE_ENV=development
```

The server loads this file via an inline parser at the top of `server/index.js` — no `dotenv` package dependency. System-level environment variables always take precedence over `.env` file values.

---

## 25. Build, Development & Deployment

### Development Mode

**Command:** `npm run dev`

1. `tsx server/index.js` starts the Express server
2. Vite dev middleware is embedded in Express (via `server/vite.js`)
3. HMR (Hot Module Replacement) runs at `/vite-hmr`
4. API requests to `/api/*` are handled by Express
5. All other requests are served by Vite dev middleware (React SPA)
6. In-memory storage initializes, ROOT_ADMIN created from env vars
7. Server logs every request: `[timestamp] METHOD /path - STATUS (Xms)`

### Production Build

**Command:** `npm run build`

Orchestrated by `script/build.js`:

1. **Phase 1 — Frontend (Vite):**
   Vite compiles React SPA → `dist/public/` (HTML + CSS + JS bundles, tree-shaken)

2. **Phase 2 — Backend (esbuild):**
   esbuild bundles Express server → `dist/index.cjs` (CommonJS, minified)
   External packages (not bundled): `express`, `drizzle-orm`, `pg`, `openai`, `xlsx`, etc.

3. **Result:** Two directories — `dist/public/` (frontend) and `dist/index.cjs` (server)

### Production Run

**Command:** `npm run start`

Runs `node dist/index.cjs`:
1. Express loads, reads environment variables
2. If `DATABASE_URL` present → Drizzle PostgreSQL mode
3. Serves API at `/api/*`
4. Serves static assets from `dist/public/`
5. All non-API routes serve `dist/public/index.html` (SPA fallback)

### Vercel Deployment

`vercel.json` configuration:
- Builds from `dist/index.cjs` using `@vercel/node` runtime
- All traffic (`/(.*)`) routes through the Express bundle
- Vercel's CDN caches static assets; dynamic API routes bypass CDN

### Database Setup (PostgreSQL)

**Command:** `npm run db:push`

Uses `drizzle-kit push` to synchronize `shared/schema.js` table definitions to the PostgreSQL database specified by `DATABASE_URL`. No migration files needed — schema is the single source of truth.

### Available Commands Summary

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (HMR + Express + in-memory) |
| `npm run build` | Production build (Vite + esbuild → `dist/`) |
| `npm run start` | Start production server from `dist/index.cjs` |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push Drizzle schema to PostgreSQL |

---

## 26. Key Business Stats & Metrics

### Platform-Level (LetsZero)

| Metric | Value / Target |
|--------|---------------|
| Products planned | 3 (RepMail, MessageHub, NotifyStream) |
| Products live | 1 (RepMail) |
| Private beta waitlist target | 200+ teams |
| Countries represented on waitlist | 18+ |
| Platform uptime target | 99.98% |
| Messages delivered milestone | 1.2B+ (platform target) |

### RepMail Technical Specs

| Metric | Value |
|--------|-------|
| Campaign wizard steps | 7 |
| AI features count | 3 (preview, spam analysis, template generation) |
| AI model | GPT-4o (OpenAI flagship) |
| Spam trigger words checked | 15 (rule-based), unlimited (AI) |
| Word replacement suggestions | 10 (rule-based), dynamic (AI) |
| Max contacts per AI preview | 3 (single API call, all contacts) |
| Spam score range | 0–100 |
| Campaign statuses | 6 (DRAFT, PENDING, RUNNING, PAUSED, COMPLETED, FAILED) |
| Audit action types | 27 |
| User role levels | 3 (ROOT_ADMIN, SUB_ADMIN, USER) |
| Database tables | 11 |
| API endpoints | 30+ |
| Supported file formats | CSV, XLSX, XLS |
| Max file upload size | 10 MB |
| Session duration | 24 hours |
| Credit model | 1 credit = 1 email |
| Pricing plans | 5 (Trial, Starter, Growth, Scale, Enterprise) |
| Currencies | 2 (USD, INR) |
| Payment methods | 5 (Card, Amex, UPI, Net Banking, Free/Trial) |
| Default exchange rate | 83.50 INR/USD |
| Campaign progress poll interval | 2 seconds |
| Per-campaign email log limit | 50 entries (UI display) |

---

## 27. Platform Constants & Enumerations

### User Roles

```
ROOT_ADMIN  — Platform owner, full access
SUB_ADMIN   — Team manager, manages own child users
USER        — End user, runs own campaigns
```

### Campaign Statuses

```
DRAFT       — Campaign created but not yet submitted
PENDING     — Submitted, waiting to start
RUNNING     — Currently executing
PAUSED      — Manually paused mid-execution
COMPLETED   — All emails processed (some may have failed)
FAILED      — Campaign encountered a fatal error
```

### Audit Actions (27 total)

```
USER_LOGIN, USER_LOGOUT, USER_CREATED, USER_UPDATED, USER_DELETED
PASSWORD_CHANGED, PASSWORD_RESET_FORCED
CREDITS_ALLOCATED, CREDITS_DEALLOCATED, CREDITS_USED, CREDITS_PURCHASED
CAMPAIGN_CREATED, CAMPAIGN_STARTED, CAMPAIGN_PAUSED, CAMPAIGN_COMPLETED,
CAMPAIGN_FAILED, CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS
EMAIL_SENT, EMAIL_FAILED
TEMPLATE_CREATED, TEMPLATE_UPDATED, TEMPLATE_DELETED
CONTACT_IMPORTED
AI_PREVIEW_GENERATED, SPAM_ANALYSIS_RUN
PAYMENT_INITIATED, PAYMENT_SUCCESS, PAYMENT_FAILED
CONTACT_FORM_SUBMITTED
```

### Payment Statuses

```
PENDING     — Initiated, awaiting user confirmation
SUCCESS     — Completed, credits granted
FAILED      — Failed or cancelled by user
REFUNDED    — Credits returned (manual process)
```

### Contact Reason Types

```
SALES           — "I want to buy or learn more"
SUPPORT         — "I need help with the product"
BILLING         — "Question about payment or invoice"
PARTNERSHIP     — "I want to partner or integrate"
OTHER           — Anything else
```

### Pricing Plan IDs

```
trial       — Free (100 credits, auto-approved)
starter     — $2.39 / ₹199 (1,000 credits)
growth      — $15.55 / ₹1,299 (10,000 credits) [Most Popular]
scale       — $59.95 / ₹4,999 (50,000 credits)
enterprise  — Custom pricing, contact sales
```

### Template Placeholders

```
{{name}}       — Recipient's first or full name
{{email}}      — Recipient's email address
{{company}}    — Recipient's company name
{{category}}   — Recipient's industry or category
```

### AI Tone Options

```
professional — Authoritative, clear, B2B appropriate
friendly     — Warm, conversational, rapport-building
formal       — No contractions, structured, enterprise/legal
casual       — Relaxed, direct, colleague-to-colleague
```

### Supported Currencies

```
USD — US Dollar  ($)  — Global default
INR — Indian Rupee (₹) — India-localized pricing
```

---

## 28. Design Philosophy & UI/UX Guidelines

### Overall Design Direction

The product aims for an aesthetic that sits at the intersection of:
- **Linear** — minimalist, dark, developer-friendly
- **Stripe** — confident, premium, data-dense
- **SendGrid** — email-native, functional, clear hierarchy

The result is a design that communicates enterprise credibility without requiring a designer's eye to navigate.

### Marketing vs. App Design

| Dimension | Marketing Pages | App Pages |
|-----------|----------------|-----------|
| Background | `#0A0A0F` (near-black) | CSS custom properties (dark/light modes) |
| Font - Headings | Space Grotesk | Inter (system stack fallback) |
| Font - Body | Inter | Inter |
| Font - Mono | JetBrains Mono | JetBrains Mono (email content) |
| Animations | Framer Motion (rich, continuous) | Framer Motion (subtle, purposeful) |
| Component system | Custom Tailwind | shadcn/ui (New York) |
| Color accents | Violet, Cyan, Amber, Emerald | shadcn/ui CSS variables |

### Animation Guidelines

- **Entrance animations:** Fade (`opacity: 0 → 1`) + translate up (`y: 20 → 0`), duration 0.6–0.8s
- **Scroll-triggered:** `whileInView` with `viewport={{ once: true, margin: "-80px" }}` — triggers just before element enters view
- **Hover effects:** Card lift (`y: -4px`), glow box-shadow matching the accent color
- **Marketing background:** Continuous floating orbs (22–35 second loops), 50-particle star field, section separator gradient lines
- **Stagger delay:** 0.1s between related elements appearing in sequence
- **Spring interactions:** Logo hover uses `type: "spring", stiffness: 400, damping: 25` for natural feel
- **Rule:** Animations must never delay critical content loading or block user interaction

### Accessibility

- All interactive elements are keyboard-accessible (shadcn/ui provides WCAG-compliant Radix primitives)
- Color is never the sole indicator of state (always accompanied by text or icon)
- Form fields have associated `<label>` elements
- Error messages are announced to screen readers via `aria-live` regions (via shadcn/ui `Alert`)

### Dark/Light Mode

The app supports full dark and light modes via Tailwind's `dark:` variant system:
- Mode stored in `localStorage` with key `emailflow-theme`
- Toggle available in the app navbar and profile page
- All shadcn/ui components respond to the mode via CSS custom property overrides
- Marketing pages are dark-mode only (design is intrinsically dark)

---

## 29. Roadmap & Future Expansion

### Immediate (RepMail v1.x)

- Real email delivery integration (SMTP relay via SendGrid, Amazon SES, or Mailgun)
- bcrypt/Argon2 password hashing (replacing current SHA-256)
- Domain reputation monitoring (DKIM, DMARC, SPF checks)
- Email open/click tracking via pixel and redirect link
- Unsubscribe link management and suppression list
- Scheduled campaign delivery (execute at a specific future time)
- Campaign analytics charts on the Dashboard page
- CSV export for campaign email logs
- Bulk contact import validation with error row highlighting

### Q2 2026 — MessageHub

- Architecture groundwork for multi-product platform
- Shared authentication layer across products
- Unified billing dashboard

### Q3 2026 — NotifyStream

- Multi-channel notification routing (email, push, SMS, in-app)
- Behavioral trigger system (webhook-based)
- Delivery observability dashboard

### Long-Term Platform Vision

- API-first: Public REST API with developer keys for programmatic campaign management
- White-labeling: Allow SUB_ADMINs to present the platform under their own brand
- Workflow builder: Visual drag-and-drop automation (if contact opens email X, send Y after 3 days)
- Multi-language template support
- AI writing assistant persistent across the whole platform (not just during campaign creation)

---

## 30. Glossary

| Term | Definition |
|------|-----------|
| **Credit** | The atomic resource unit in RepMail. 1 credit = 1 email sent. Purchased in packs and distributed hierarchically. |
| **Campaign** | A batch email send operation targeting a set of contacts using a defined template. Progresses through 7 states from DRAFT to COMPLETED. |
| **Template** | A reusable email with subject and body fields. Supports `{{placeholder}}` tokens for dynamic personalization. |
| **Template Snapshot** | An immutable frozen copy of the template stored in the campaign record at execution time. Preserves what was actually sent. |
| **Contact** | A recipient record with at minimum an email address. May also have name, company, category, and custom fields. |
| **Column Mapping** | The user-defined link between CSV column names and the four template fields (email, name, company, category). |
| **Spam Score** | A 0–100 risk indicator for email deliverability. 0–30: Safe, 31–60: Caution, 61–100: High Risk. |
| **Risky Words** | Specific phrases identified in the email content that are known to trigger spam filters. |
| **Suggestions** | AI-generated or rule-based replacement recommendations for risky words (original → professional alternative). |
| **Tone** | The stylistic register applied by GPT-4o when personalizing emails: Professional, Friendly, Formal, or Casual. |
| **Placeholder** | A `{{double-brace}}` token in a template that is replaced with contact-specific data at preview or send time. |
| **ROOT_ADMIN** | The platform owner. Has full visibility and control over all data. One per platform instance. |
| **SUB_ADMIN** | A team manager created by ROOT_ADMIN. Can manage their own child users and allocate credits to them. |
| **USER** | An end user created by a SUB_ADMIN. Can run campaigns within their credit allocation. |
| **Credit Allocation** | The act of a parent user granting a portion of their credits to a child user. |
| **Audit Log** | An immutable record of a significant system event. Contains actor, action type, target, timestamp, IP, and details. |
| **Dual-Mode Storage** | The architecture where the server transparently switches between PostgreSQL (production) and in-memory Maps (development) using an identical interface. |
| **Drizzle ORM** | The TypeScript ORM used for PostgreSQL interactions. Schema-as-code, generates explicit SQL, no hidden queries. |
| **SPA Fallback** | The server behavior of serving `index.html` for all non-API routes, allowing Wouter to handle client-side routing. |
| **mustResetPassword** | A user flag (boolean) that forces a new user to change their password on first login before accessing any app functionality. |
| **Trial Credits** | 5 free credits given to every new user on account creation, usable immediately without a payment. |
| **Exchange Rate** | The INR-per-USD conversion rate used for dual-currency pricing. Default: 83.50. Stored with each payment for historical accuracy. |
| **Source (Waitlist)** | A field tracking where a waitlist signup originated (hero section, footer, external link, etc.) for attribution analysis. |
| **Template Snapshot** | An immutable copy of the email template frozen into the campaign record at the moment the campaign executes. Ensures historical accuracy regardless of future template edits. |
| **GPT-4o** | OpenAI's flagship language model used for all three RepMail AI features. Selected for highest quality copywriting, analysis, and personalization capabilities. |

---

*Document compiled from live codebase — `shared/schema.js`, `server/routes.js`, `server/ai.js`, `client/src/` component tree, `marketing/LFP_final/LandingExperience.tsx`, and `LetsZero.md`.*
*LetsZero · RepMail · March 2026*
