# LetsZero — Comprehensive Project Documentation

> **Version:** 1.0  
> **Last Updated:** March 3, 2026  
> **Status:** Active Development — RepMail (LIVE), MessageHub (Q2 2026), NotifyStream (Q3 2026)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Platform Vision & Mission](#2-platform-vision--mission)
3. [Product Ecosystem](#3-product-ecosystem)
   - 3.1 [RepMail (LIVE)](#31-repmail-live)
   - 3.2 [MessageHub (Coming Q2 2026)](#32-messagehub-coming-q2-2026)
   - 3.3 [NotifyStream (Coming Q3 2026)](#33-notifystream-coming-q3-2026)
4. [Tech Stack](#4-tech-stack)
   - 4.1 [Frontend](#41-frontend)
   - 4.2 [Backend](#42-backend)
   - 4.3 [Database](#43-database)
   - 4.4 [Build & Deployment](#44-build--deployment)
   - 4.5 [Design System](#45-design-system)
5. [Architecture & Wiring](#5-architecture--wiring)
   - 5.1 [System Architecture Overview](#51-system-architecture-overview)
   - 5.2 [Client-Server Communication](#52-client-server-communication)
   - 5.3 [Authentication Flow](#53-authentication-flow)
   - 5.4 [Routing Architecture](#54-routing-architecture)
   - 5.5 [State Management](#55-state-management)
   - 5.6 [Storage Layer (Dual-Mode)](#56-storage-layer-dual-mode)
6. [Database Schema](#6-database-schema)
   - 6.1 [Users Table](#61-users-table)
   - 6.2 [Sessions Table](#62-sessions-table)
   - 6.3 [Templates Table](#63-templates-table)
   - 6.4 [Contacts Table](#64-contacts-table)
   - 6.5 [Campaigns Table](#65-campaigns-table)
   - 6.6 [Campaign Emails Table](#66-campaign-emails-table)
   - 6.7 [Credit Transactions Table](#67-credit-transactions-table)
   - 6.8 [Audit Logs Table](#68-audit-logs-table)
   - 6.9 [Payments Table](#69-payments-table)
   - 6.10 [Contact Submissions Table](#610-contact-submissions-table)
   - 6.11 [Waitlist Table](#611-waitlist-table)
7. [Validation Schemas (Zod)](#7-validation-schemas-zod)
8. [API Reference](#8-api-reference)
   - 8.1 [Authentication Endpoints](#81-authentication-endpoints)
   - 8.2 [Dashboard Endpoints](#82-dashboard-endpoints)
   - 8.3 [User Management Endpoints](#83-user-management-endpoints)
   - 8.4 [Credit Management Endpoints](#84-credit-management-endpoints)
   - 8.5 [Campaign Endpoints](#85-campaign-endpoints)
   - 8.6 [Template Endpoints](#86-template-endpoints)
   - 8.7 [AI & Analysis Endpoints](#87-ai--analysis-endpoints)
   - 8.8 [Pricing & Payment Endpoints](#88-pricing--payment-endpoints)
   - 8.9 [Contact & Waitlist Endpoints](#89-contact--waitlist-endpoints)
   - 8.10 [Admin Endpoints](#810-admin-endpoints)
   - 8.11 [Utility Endpoints](#811-utility-endpoints)
9. [User Role System & Hierarchy](#9-user-role-system--hierarchy)
10. [Credit System](#10-credit-system)
11. [Campaign Wizard (7-Step Flow)](#11-campaign-wizard-7-step-flow)
12. [Pricing & Payments](#12-pricing--payments)
13. [Waitlist / Early Access System](#13-waitlist--early-access-system)
14. [Audit & Compliance System](#14-audit--compliance-system)
15. [AI-Powered Features](#15-ai-powered-features)
16. [Spam Analysis Engine](#16-spam-analysis-engine)
17. [Landing Pages & Marketing](#17-landing-pages--marketing)
18. [Pages & Navigation Map](#18-pages--navigation-map)
19. [File & Folder Structure](#19-file--folder-structure)
20. [Environment Variables](#20-environment-variables)
21. [Development & Build Commands](#21-development--build-commands)
22. [Deployment](#22-deployment)
23. [Design Guidelines Summary](#23-design-guidelines-summary)
24. [Constants & Enums Reference](#24-constants--enums-reference)

---

## 1. Executive Summary

**LetsZero** is a communication infrastructure platform that builds composable, enterprise-grade products for teams that need systems — not just features. The platform is designed around four principles: **Reliability**, **Scalability**, **Transparency**, and **Thoughtful Engineering**.

The first product, **RepMail**, is a full-stack SaaS email marketing platform currently LIVE. It provides end-to-end email campaign management with hierarchical user management, credit-based resource governance, AI-powered personalization, built-in spam analysis, dual-currency payments, comprehensive audit logging, and a multi-step campaign wizard.

LetsZero operates as a parent brand with a planned suite of three communication products:

| Product | Status | Description |
|---------|--------|-------------|
| **RepMail** | LIVE | Enterprise email campaign infrastructure |
| **MessageHub** | Q2 2026 | Unified messaging platform |
| **NotifyStream** | Q3 2026 | Multi-channel notification engine |

---

## 2. Platform Vision & Mission

**Tagline:** *"Communication infrastructure without compromise."*

LetsZero builds composable communication products for teams that need systems, not features. Starting with RepMail, every tool is designed for reliability at scale — transparent, modular, and built to last.

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Reliability** | Infrastructure designed for uptime, consistency, and predictable performance at any scale |
| **Scalability** | Built to grow from startup to enterprise without architectural compromise |
| **Transparency** | No black boxes — full visibility into metrics, operations, and system health |
| **Thoughtful Engineering** | Every decision is deliberate — long-term thinking, not short-term hacks |

---

## 3. Product Ecosystem

### 3.1 RepMail (LIVE)

RepMail is the flagship product — an enterprise-grade email campaign management platform. It is what the existing codebase implements end-to-end.

**Core Capabilities:**
- Multi-step campaign creation wizard (7 steps)
- CSV/Excel contact import with smart column detection
- Dynamic email template builder with merge-field placeholders (`{{name}}`, `{{email}}`, `{{company}}`, `{{category}}`)
- AI-powered email preview with personalization per recipient
- Built-in spam analysis with risk scoring and actionable suggestions
- Credit-based email sending governance
- Hierarchical user management (ROOT_ADMIN → SUB_ADMIN → USER)
- Real-time campaign progress tracking
- Campaign history with filtering and search
- Dual-currency pricing (USD/INR) with localized payment methods
- Comprehensive audit logging for compliance
- Contact form for sales/support/billing/partnership inquiries
- Dark/light theme toggle
- Responsive design

### 3.2 MessageHub (Coming Q2 2026)

Unified messaging platform with advanced routing, workflow automation, and team collaboration built for scale. *Currently in planning — no code exists yet.*

### 3.3 NotifyStream (Coming Q3 2026)

Multi-channel notification engine designed for compliance, intelligent delivery, and observability at enterprise scale. *Currently in planning — no code exists yet.*

---

## 4. Tech Stack

### 4.1 Frontend

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework (JSX, not TypeScript for app code) |
| **Vite** | Build tool and dev server with HMR |
| **Wouter** | Client-side routing (lightweight alternative to React Router) |
| **TanStack Query (React Query) v5** | Server state management, caching, and data fetching |
| **Tailwind CSS** | Utility-first CSS framework |
| **shadcn/ui (New York style)** | Pre-built accessible component library on Radix UI primitives |
| **Radix UI** | Headless accessible UI primitives (30+ components) |
| **Framer Motion / Motion** | Animation library for page transitions and micro-interactions |
| **Lucide React** | Icon library |
| **React Icons** | Additional icons (Google, LinkedIn logos) |
| **Recharts** | Charting library for dashboard analytics |
| **React Hook Form + Zod** | Form handling with schema-based validation |
| **date-fns** | Date formatting utilities |
| **clsx + tailwind-merge** | Conditional class name utilities |
| **cmdk** | Command menu component |
| **embla-carousel-react** | Carousel component |
| **input-otp** | OTP input component |
| **react-day-picker** | Date picker component |
| **react-resizable-panels** | Resizable panel layouts |
| **vaul** | Drawer component |
| **xlsx** | Client-side Excel parsing support |

### 4.2 Backend

| Technology | Purpose |
|-----------|---------|
| **Node.js** | Runtime environment |
| **Express** | HTTP server framework |
| **Drizzle ORM** | Type-safe PostgreSQL ORM |
| **drizzle-zod** | Auto-generate Zod schemas from Drizzle tables |
| **Zod** | Runtime schema validation |
| **Passport + passport-local** | Authentication framework |
| **express-session** | Session management |
| **connect-pg-simple** | PostgreSQL session store |
| **memorystore** | In-memory session store (dev mode) |
| **pg** | PostgreSQL client |
| **xlsx** | Server-side Excel file parsing |
| **ws** | WebSocket support |
| **crypto (built-in)** | Password hashing (SHA-256), token generation |

### 4.3 Database

| Technology | Purpose |
|-----------|---------|
| **PostgreSQL** | Primary relational database (production) |
| **In-Memory Store** | Development mode fallback (Map-based, same API as production) |
| **Drizzle Kit** | Database migration tooling (`drizzle-kit push`) |

**Dual-Mode Storage:** The system automatically switches between PostgreSQL (when `DATABASE_URL` is provided and `NODE_ENV=production`) and in-memory storage (for development). Both modes expose the identical storage interface — zero code changes required.

### 4.4 Build & Deployment

| Technology | Purpose |
|-----------|---------|
| **Vite** | Frontend build (`dist/public/`) |
| **esbuild** | Server-side bundling to `dist/index.cjs` (CJS, minified) |
| **Custom build script** | `script/build.js` orchestrates Vite + esbuild |
| **Vercel** | Deployment platform (configured via `vercel.json`) |
| **cross-env** | Cross-platform environment variable setting |

**Build Flow:**
1. `npm run build` → Runs `script/build.js`
2. Vite builds the React SPA → `dist/public/`
3. esbuild bundles the Express server → `dist/index.cjs`
4. Vercel serves `dist/index.cjs` which serves both API and static frontend

### 4.5 Design System

| Aspect | Detail |
|--------|--------|
| **Base Approach** | Enterprise SaaS (Linear + Stripe + SendGrid hybrid) |
| **Primary Font** | Inter (body text via Google Fonts CDN) |
| **Heading Font** | Space Grotesk (marketing/landing pages) |
| **Monospace Font** | JetBrains Mono (email previews, code-like content) |
| **Component Style** | shadcn/ui New York variant |
| **Color System** | CSS custom properties with HSL values, dark/light mode |
| **Theme Toggle** | Persisted in `localStorage` as `emailflow-theme` |
| **Landing Page BG** | `#0A0A0F` (near-black) |
| **Accent Colors** | Violet, Cyan, Amber, Emerald |

---

## 5. Architecture & Wiring

### 5.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (React SPA)                │
│  ┌──────┐ ┌──────────┐ ┌───────────┐ ┌───────────┐ │
│  │Wouter│ │TanStack  │ │Context    │ │shadcn/ui  │ │
│  │Router│ │Query     │ │Providers  │ │Components │ │
│  └──┬───┘ └────┬─────┘ └─────┬─────┘ └───────────┘ │
│     │          │              │                      │
│     └──────────┴──────┬───────┘                      │
│                       │                              │
│              ┌────────▼────────┐                     │
│              │  API Client     │                     │
│              │  (fetch + creds)│                     │
│              └────────┬────────┘                     │
└───────────────────────┼─────────────────────────────┘
                        │ HTTP (JSON)
                        │ Cookie-based auth token
┌───────────────────────┼─────────────────────────────┐
│                SERVER (Express)                      │
│              ┌────────▼────────┐                     │
│              │  /api/* Routes  │                     │
│              │  (routes.js)    │                     │
│              └────┬────┬───┬──┘                     │
│    ┌──────────────┘    │   └──────────────┐         │
│    ▼                   ▼                  ▼         │
│ ┌──────────┐  ┌──────────────┐  ┌──────────────┐   │
│ │Auth      │  │Business      │  │Middleware     │   │
│ │Middleware│  │Logic         │  │(CORS, JSON,   │   │
│ │(token)  │  │(credits,     │  │ logging)      │   │
│ └────┬─────┘  │campaigns)   │  └──────────────┘   │
│      │        └──────┬───────┘                      │
│      └───────────────┼──────────────────────┐       │
│              ┌───────▼───────┐               │      │
│              │ Storage Layer │               │      │
│              │ (Unified API) │               │      │
│              └───┬───────┬───┘               │      │
│           ┌──────┘       └──────┐            │      │
│           ▼                     ▼            │      │
│  ┌────────────────┐   ┌─────────────────┐   │      │
│  │ PostgreSQL     │   │ In-Memory Store │   │      │
│  │ (Production)   │   │ (Development)   │   │      │
│  │ via Drizzle ORM│   │ via Map objects │   │      │
│  └────────────────┘   └─────────────────┘   │      │
└─────────────────────────────────────────────────────┘
```

### 5.2 Client-Server Communication

- **Protocol:** HTTP REST (JSON payloads)
- **Base URL prefix:** `/api/`
- **Authentication:** Token-based via HTTP-only cookies (`token` cookie) or `Authorization: Bearer <token>` header
- **API Client:** Custom `apiRequest()` function in `client/src/lib/queryClient.js`
  - All requests include `credentials: "include"` for cookie-based auth
  - Automatic error handling — throws on non-OK responses
- **Server State:** Managed entirely via TanStack Query with `queryKey` arrays matching API paths
  - `staleTime: Infinity` — data is never considered stale automatically
  - Manual invalidation via `queryClient.invalidateQueries()` after mutations
  - No `refetchOnWindowFocus` or `refetchInterval` (except for campaign progress polling at 2s)

### 5.3 Authentication Flow

```
1. User submits username + password → POST /api/auth/login
2. Server validates credentials (SHA-256 hash comparison)
3. Server creates session (random 32-byte token, 24hr expiry)
4. Server sets HTTP-only cookie: token=<session_token>
5. Server returns sanitized user object (no passwordHash)
6. Client stores user in TanStack Query cache under ["/api/auth/me"]
7. Subsequent requests include cookie automatically
8. AuthContext provides: user, isAuthenticated, isAdmin, isRootAdmin, etc.
9. ProtectedRoute component redirects unauthenticated users to /login
10. If user.mustResetPassword === true → forced redirect to ResetPassword page
```

### 5.4 Routing Architecture

**Client-Side Routing via Wouter:**

| Route | Component | Access |
|-------|-----------|--------|
| `/` | LandingExperience (marketing) | Public |
| `/early-access` | WaitlistLanding | Public |
| `/products/repmail` | Landing (RepMail product page) | Public |
| `/login` | Login | Public (redirects if authenticated) |
| `/pricing` | PublicPricing | Public |
| `/contact` | Contact | Public |
| `/app/dashboard` | Dashboard | Authenticated |
| `/app/campaigns/new` | NewCampaign (7-step wizard) | Authenticated |
| `/app/history` | History | Authenticated |
| `/app/templates` | Templates | Authenticated |
| `/app/payments` | Payments | Authenticated |
| `/app/payments/:rest*` | Payments (sub-routes) | Authenticated |
| `/app/users` | Users | ROOT_ADMIN or SUB_ADMIN |
| `/app/audit` | Audit | ROOT_ADMIN only |
| `/app/profile` | Profile | Authenticated |
| `*` | Not Found (404) | Public |

**Server-Side Routes:** All under `/api/*` prefix, handled by Express.

### 5.5 State Management

| Layer | Technology | Scope |
|-------|-----------|-------|
| **Server State** | TanStack Query v5 | API data caching, fetching, invalidation |
| **Auth State** | React Context (`AuthContext`) | Current user, login/logout/reset, role checks |
| **Campaign Wizard State** | React Context (`CampaignContext`) | Multi-step wizard data: contacts, mapping, template, previews, spam analysis |
| **Theme State** | React Context (`ThemeContext`) | Dark/light mode, persisted in localStorage |
| **Component State** | React `useState` | Local UI state within individual components |

### 5.6 Storage Layer (Dual-Mode)

The storage layer (`server/storage.js`) provides a **unified interface** that automatically selects between:

1. **PostgreSQL Storage (`dbStorage`)** — Used when `DATABASE_URL` environment variable is present and `NODE_ENV=production`
   - Real Drizzle ORM queries
   - PostgreSQL transactions for atomic credit operations
   - Persistent data

2. **In-Memory Storage (`memoryStorage`)** — Used in development/when no `DATABASE_URL`
   - JavaScript `Map` objects for each table
   - Same schema constraints, validations, and role checks
   - Data persists only during the server session

Both implementations expose the exact same function signatures. The switch is transparent.

---

## 6. Database Schema

All tables use UUID primary keys (`uuid("id").defaultRandom().primaryKey()`) and UTC timestamps.

### 6.1 Users Table

```
Table: users
├── id                UUID (PK, auto-generated)
├── username          TEXT (NOT NULL, UNIQUE)
├── email             TEXT (NOT NULL, UNIQUE)
├── password_hash     TEXT (NOT NULL) — SHA-256 hash
├── role              TEXT (NOT NULL, default: "USER") — ROOT_ADMIN | SUB_ADMIN | USER
├── parent_id         UUID (FK → users.id, nullable) — hierarchical parent
├── credits_received  INTEGER (NOT NULL, default: 0)
├── credits_allocated INTEGER (NOT NULL, default: 0)
├── credits_used      INTEGER (NOT NULL, default: 0)
├── trial_credits     INTEGER (NOT NULL, default: 5)
├── trial_credits_used INTEGER (NOT NULL, default: 0)
├── is_trial_user     BOOLEAN (NOT NULL, default: true)
├── must_reset_password BOOLEAN (NOT NULL, default: true)
├── is_active         BOOLEAN (NOT NULL, default: true)
├── created_at        TIMESTAMP (NOT NULL, default: NOW)
├── updated_at        TIMESTAMP (NOT NULL, default: NOW)
└── last_login_at     TIMESTAMP (nullable)

Computed (in-app): credits_remaining = credits_received - credits_allocated - credits_used
```

### 6.2 Sessions Table

```
Table: sessions
├── id          UUID (PK)
├── user_id     UUID (FK → users.id, CASCADE)
├── token       TEXT (NOT NULL, UNIQUE) — 32-byte random hex
├── expires_at  TIMESTAMP (NOT NULL) — 24 hours from creation
└── created_at  TIMESTAMP (NOT NULL, default: NOW)
```

### 6.3 Templates Table

```
Table: templates
├── id          UUID (PK)
├── user_id     UUID (FK → users.id, CASCADE)
├── name        TEXT (NOT NULL)
├── subject     TEXT (NOT NULL) — Supports {{placeholder}} syntax
├── body        TEXT (NOT NULL) — Supports {{placeholder}} syntax
├── is_default  BOOLEAN (NOT NULL, default: false)
├── created_at  TIMESTAMP (NOT NULL, default: NOW)
└── updated_at  TIMESTAMP (NOT NULL, default: NOW)
```

### 6.4 Contacts Table

```
Table: contacts
├── id            UUID (PK)
├── user_id       UUID (FK → users.id, CASCADE)
├── email         TEXT (NOT NULL)
├── name          TEXT (nullable)
├── company       TEXT (nullable)
├── category      TEXT (nullable)
├── custom_fields JSONB (nullable) — arbitrary key-value pairs
└── created_at    TIMESTAMP (NOT NULL, default: NOW)
```

### 6.5 Campaigns Table

```
Table: campaigns
├── id                UUID (PK)
├── user_id           UUID (FK → users.id, CASCADE)
├── template_id       UUID (FK → templates.id, nullable)
├── name              TEXT (NOT NULL)
├── status            TEXT (NOT NULL, default: "DRAFT")
│                     — DRAFT | PENDING | RUNNING | PAUSED | COMPLETED | FAILED
├── total_emails      INTEGER (NOT NULL, default: 0)
├── sent_emails       INTEGER (NOT NULL, default: 0)
├── failed_emails     INTEGER (NOT NULL, default: 0)
├── credits_used      INTEGER (NOT NULL, default: 0)
├── contact_ids       JSONB (NOT NULL, default: []) — array of contact UUIDs
├── template_snapshot JSONB (nullable) — frozen template at send time
├── scheduled_at      TIMESTAMP (nullable)
├── started_at        TIMESTAMP (nullable)
├── completed_at      TIMESTAMP (nullable)
├── created_at        TIMESTAMP (NOT NULL, default: NOW)
└── updated_at        TIMESTAMP (NOT NULL, default: NOW)
```

### 6.6 Campaign Emails Table

```
Table: campaign_emails
├── id              UUID (PK)
├── campaign_id     UUID (FK → campaigns.id, CASCADE)
├── contact_id      UUID (FK → contacts.id)
├── status          TEXT (NOT NULL, default: "pending")
├── sent_at         TIMESTAMP (nullable)
├── error_message   TEXT (nullable)
├── credit_deducted BOOLEAN (NOT NULL, default: false)
└── created_at      TIMESTAMP (NOT NULL, default: NOW)
```

### 6.7 Credit Transactions Table

```
Table: credit_transactions
├── id              UUID (PK)
├── user_id         UUID (FK → users.id, CASCADE)
├── type            TEXT (NOT NULL) — "allocation_out" | "allocation_in" | "usage" | "purchase"
├── amount          INTEGER (NOT NULL) — positive for incoming, negative for outgoing
├── balance_before  INTEGER (NOT NULL)
├── balance_after   INTEGER (NOT NULL)
├── from_user_id    UUID (FK → users.id, nullable)
├── to_user_id      UUID (FK → users.id, nullable)
├── campaign_id     UUID (FK → campaigns.id, nullable)
├── description     TEXT (nullable)
└── created_at      TIMESTAMP (NOT NULL, default: NOW)
```

### 6.8 Audit Logs Table

```
Table: audit_logs
├── id          UUID (PK)
├── user_id     UUID (FK → users.id, nullable)
├── action      TEXT (NOT NULL) — see AUDIT_ACTIONS enum
├── target_type TEXT (nullable) — "user" | "campaign" | "template" | "contacts"
├── target_id   UUID (nullable)
├── details     JSONB (nullable) — action-specific metadata
├── ip_address  TEXT (nullable)
├── user_agent  TEXT (nullable)
└── created_at  TIMESTAMP (NOT NULL, default: NOW)
```

### 6.9 Payments Table

```
Table: payments
├── id              UUID (PK)
├── user_id         UUID (FK → users.id, CASCADE)
├── plan_name       TEXT (NOT NULL)
├── credits         INTEGER (NOT NULL)
├── amount_inr      INTEGER (NOT NULL)
├── amount_usd      INTEGER (NOT NULL)
├── amount_local    INTEGER (NOT NULL)
├── currency        TEXT (NOT NULL, default: "USD")
├── exchange_rate   TEXT (nullable)
├── status          TEXT (NOT NULL, default: "PENDING")
│                   — PENDING | SUCCESS | FAILED | REFUNDED
├── payment_method  TEXT (nullable) — "UPI" | "CARD" | "NET_BANKING" | "FREE"
├── transaction_id  TEXT (nullable) — generated on completion
├── invoice_number  TEXT (nullable)
├── invoice_url     TEXT (nullable)
├── metadata        JSONB (nullable)
├── created_at      TIMESTAMP (NOT NULL, default: NOW)
└── completed_at    TIMESTAMP (nullable)
```

### 6.10 Contact Submissions Table

```
Table: contact_submissions
├── id           UUID (PK)
├── name         TEXT (NOT NULL)
├── email        TEXT (NOT NULL)
├── company      TEXT (nullable)
├── reason       TEXT (NOT NULL) — SALES | SUPPORT | BILLING | PARTNERSHIP | OTHER
├── message      TEXT (NOT NULL)
├── user_id      UUID (FK → users.id, nullable) — if submitted by authenticated user
├── is_read      BOOLEAN (NOT NULL, default: false)
├── responded_at TIMESTAMP (nullable)
└── created_at   TIMESTAMP (NOT NULL, default: NOW)
```

### 6.11 Waitlist Table

```
Table: waitlist
├── id         UUID (PK)
├── email      TEXT (NOT NULL, UNIQUE)
├── source     TEXT (nullable) — tracks where signup originated ("hero", "footer", etc.)
└── created_at TIMESTAMP (NOT NULL, default: NOW)
```

---

## 7. Validation Schemas (Zod)

All validation schemas are defined in `shared/schema.js` using Zod and shared between client and server.

| Schema | Purpose | Key Rules |
|--------|---------|-----------|
| `insertUserSchema` | User creation | username ≥ 3 chars, password ≥ 6 chars, valid email |
| `loginSchema` | Login | username and password required |
| `resetPasswordSchema` | Password reset | currentPassword required, newPassword ≥ 6 chars, confirmPassword must match |
| `insertContactSchema` | Contact creation | valid email required |
| `insertTemplateSchema` | Template creation | name, subject, body required |
| `insertCampaignSchema` | Campaign creation | name, status required |
| `insertAuditLogSchema` | Audit log creation | action required |
| `allocateCreditsSchema` | Credit allocation | valid UUID for targetUserId, positive integer amount |
| `spamAnalysisSchema` | Spam analysis request | subject and body required |
| `aiPreviewSchema` | AI preview request | subject, body required; max 3 contacts |
| `contactSubmissionSchema` | Contact form | name, email, reason (enum), message ≥ 10 chars |
| `purchaseCreditsSchema` | Credit purchase | planId required, optional paymentMethod enum |
| `waitlistSchema` | Waitlist signup | valid email required, optional source string |

---

## 8. API Reference

All endpoints are prefixed with `/api/`. Authenticated routes require a valid session token via cookie or Authorization header.

### 8.1 Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | Public | Login with username/password. Sets HTTP-only cookie. Returns sanitized user. |
| `POST` | `/api/auth/logout` | Required | Invalidates session, clears cookie. |
| `GET` | `/api/auth/me` | Required | Returns current authenticated user object. |
| `POST` | `/api/auth/reset-password` | Required | Change password. Body: `{ currentPassword, newPassword }`. |

### 8.2 Dashboard Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/dashboard/stats` | Required | Returns dashboard statistics. ROOT_ADMIN sees all data; others see own data. |

### 8.3 User Management Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/users` | Admin | List users. ROOT_ADMIN sees all; SUB_ADMIN sees own children. |
| `POST` | `/api/users` | Admin | Create user. ROOT_ADMIN creates SUB_ADMINs; SUB_ADMIN creates USERs. Body: `{ username, email, password, role, credits }`. |
| `POST` | `/api/users/:id/allocate-credits` | Admin | Allocate credits to a child user. Body: `{ credits }`. |
| `DELETE` | `/api/users/:id` | Admin | Soft-delete a user. Cannot delete ROOT_ADMIN. |

### 8.4 Credit Management Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/credits/transactions` | Required | List credit transactions for current user. |
| `GET` | `/api/credits/info` | Required | Get total credits available for current user. |

### 8.5 Campaign Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/campaigns` | Required | List campaigns. ROOT_ADMIN sees all; others see own. |
| `POST` | `/api/campaigns` | Required | Create and execute campaign. Validates credit balance, deducts credits atomically, marks completed. Body: `{ name, template, contacts, totalEmails }`. |
| `GET` | `/api/campaigns/:id` | Required | Get single campaign details. |
| `PATCH` | `/api/campaigns/:id` | Required | Update campaign fields. |

### 8.6 Template Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/templates` | Required | List user's templates. |
| `POST` | `/api/templates` | Required | Create template. Body: `{ name, subject, body }`. |
| `PATCH` | `/api/templates/:id` | Required | Update template. |
| `DELETE` | `/api/templates/:id` | Required | Delete template. |

### 8.7 AI & Analysis Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/ai/preview` | Required | Generate AI-powered email previews with placeholder replacement. Body: `{ subject, body, contacts }`. Returns personalized previews per contact. |
| `POST` | `/api/ai/spam-analysis` | Required | Analyze email for spam risk. Body: `{ subject, body }`. Returns `{ score, riskyWords, suggestions }`. |

### 8.8 Pricing & Payment Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/pricing/plans` | Public | Returns all pricing plans with dual-currency prices and exchange rate. |
| `POST` | `/api/payments/initiate` | Required | Start a payment. Body: `{ planId, paymentMethod?, currency? }`. Trial plan grants credits immediately. Returns payment object and redirect URL. |
| `POST` | `/api/payments/:id/complete` | Required | Mark payment as successful. Generates transaction ID, adds credits. |
| `POST` | `/api/payments/:id/fail` | Required | Mark payment as failed. Body: `{ reason? }`. |
| `GET` | `/api/payments` | Required | List user's payment history. |

### 8.9 Contact & Waitlist Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/contact` | Public | Submit contact form. Validated by `contactSubmissionSchema`. |
| `POST` | `/api/waitlist` | Public | Add email to waitlist. Returns 409 if duplicate. |

### 8.10 Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/audit-logs` | ROOT_ADMIN | Query audit logs. Supports `?userId`, `?action`, `?limit` params. |
| `GET` | `/api/admin/contact-submissions` | ROOT_ADMIN | View all contact form submissions. |

### 8.11 Utility Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/parse-excel` | Required | Parse uploaded Excel file (base64 encoded). Returns `{ headers, rows, fileName }`. |

---

## 9. User Role System & Hierarchy

LetsZero implements a three-tier hierarchical user model:

```
ROOT_ADMIN (Platform Owner)
├── Can create SUB_ADMINs
├── Can allocate credits to SUB_ADMINs
├── Can view ALL users, campaigns, audit logs
├── Can delete any non-ROOT_ADMIN user
├── Has unlimited root-level credit pool (purchased)
│
├── SUB_ADMIN (Team Manager)
│   ├── Can create USERs only
│   ├── Can allocate credits to own USERs only
│   ├── Can view own child USERs
│   ├── Credits come from ROOT_ADMIN allocation
│   │
│   ├── USER (End User)
│   │   ├── Can create/manage own campaigns
│   │   ├── Can create/manage own templates
│   │   ├── Can upload contacts and run campaigns
│   │   ├── Credits come from parent SUB_ADMIN
│   │   └── Cannot allocate credits to anyone
│   └── ...more USERs
└── ...more SUB_ADMINs
```

**Key Constraints:**
- ROOT_ADMIN can only allocate to SUB_ADMINs (not directly to USERs)
- SUB_ADMIN can only allocate to USERs (not to other SUB_ADMINs)
- USERs cannot allocate credits at all
- Credits can only flow to direct children (`parentId` must match)
- A ROOT_ADMIN account is auto-created on server startup via `storage.initializeRootAdmin()`
- New users have `mustResetPassword: true` — forced to change password on first login

---

## 10. Credit System

Credits are the core resource governance mechanism. Every email sent consumes 1 credit.

### Credit Lifecycle

```
Purchase (Payment) → ROOT_ADMIN receives credits (credits_received ↑)
  └→ ROOT_ADMIN allocates to SUB_ADMIN (ROOT's credits_allocated ↑, SUB's credits_received ↑)
      └→ SUB_ADMIN allocates to USER (SUB's credits_allocated ↑, USER's credits_received ↑)
          └→ USER sends campaign (USER's credits_used ↑, 1 credit per email)
```

### Credit Formula

```
credits_remaining = credits_received - credits_allocated - credits_used
```

### Credit Rules

- Before a campaign starts, the system checks: `credits_remaining >= totalEmails`
- If insufficient credits: campaign is **blocked** and `CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS` audit log is created
- Credits are deducted **atomically** (within a database transaction) — 1 credit per email
- Each deduction creates a `credit_transaction` record with `type: "usage"`
- Allocation also creates paired transactions: `allocation_out` (from) and `allocation_in` (to)
- Trial users receive 5 free trial credits by default
- The Trial plan provides 100 free credits on first use

---

## 11. Campaign Wizard (7-Step Flow)

The New Campaign page (`/app/campaigns/new`) guides users through a comprehensive 7-step wizard:

### Step 1: File Upload

- Drag-and-drop or browse for CSV/Excel files (.csv, .xlsx, .xls)
- **CSV:** Parsed client-side with smart delimiter detection (comma, semicolon, tab)
- **Excel:** Sent as base64 to `/api/parse-excel` for server-side parsing via `xlsx` library
- File size limit: 10MB
- Displays data preview (first 5 rows) with header and row counts
- Stores parsed contacts in CampaignContext

### Step 2: Column Mapping

- Auto-detects columns matching "email", "name", "company", "category"
- Allows manual override of all column mappings
- **Email** column is required; others are optional
- Validates that the mapped email column contains valid email addresses
- Shows column count badge

### Step 3: Template Builder

- Split view: Editor (60%) + Live Preview (40%)
- Fields: Template Name, Subject Line, Email Body (textarea)
- **Placeholders:** `{{name}}`, `{{email}}`, `{{company}}`, `{{category}}`
- Click-to-insert placeholder buttons
- Real-time preview with sample contact data
- Edit/Preview tab toggle

### Step 4: AI-Powered Preview

- Generates personalized email previews for up to 3 sample contacts
- Replaces `{{placeholder}}` tokens with actual contact data
- Tone selection: Professional, Friendly, Formal, Casual
- Falls back to client-side preview generation if API fails
- Shows per-contact preview cards with name, email, company, category display

### Step 5: Spam Analysis

- Sends subject + body to `/api/ai/spam-analysis` endpoint
- Checks for 15 common spam trigger words (free, winner, click here, buy now, etc.)
- Detects ALL-CAPS subjects and excessive exclamation marks
- Returns a score (0–100):
  - **0–30:** Low Risk (green) ✅
  - **31–60:** Medium Risk (yellow) ⚠️
  - **61–100:** High Risk (red) ❌
- Provides word-by-word replacement suggestions (e.g., "free" → "complimentary")
- Users can **accept suggestions** which auto-replace words in the template and re-score
- Falls back to client-side analysis if API fails

### Step 6: Campaign Confirmation

- Displays full campaign summary:
  - Campaign name (editable)
  - Total recipients count
  - Credits required vs. available
  - Template preview (subject + body with one sample contact)
  - Spam score summary
  - Estimated send time
- Credit sufficiency check (blocks send if insufficient)
- Confirmation checkbox required before sending
- Sends `POST /api/campaigns` on confirm

### Step 7: Progress Tracker

- Real-time campaign progress display
- Shows: status badge, progress bar (sent/total), sent count, failed count, credits used
- Polls campaign status every 2 seconds until COMPLETED or FAILED
- Displays per-email delivery log (up to 50 entries)
- Completion celebration with links to Dashboard and Campaign History
- Reset campaign button to start a new one

---

## 12. Pricing & Payments

### Pricing Plans

| Plan ID | Name | Credits | Price (USD) | Price (INR) | Type |
|---------|------|---------|-------------|-------------|------|
| `trial` | Trial | 100 | $0 (Free) | ₹0 (Free) | Trial |
| `starter` | Starter | 1,000 | $2.39 | ₹199 | Pay-as-you-go |
| `growth` | Growth | 10,000 | $15.55 | ₹1,299 | Pay-as-you-go (Popular) |
| `scale` | Scale | 50,000 | $59.95 | ₹4,999 | Bulk |
| `enterprise` | Enterprise | Custom | Custom | Custom | Custom (Contact Sales) |

### Dual-Currency System

- **Base currency:** USD for all pricing logic and backend storage
- **Display currencies:** USD (default) and INR (localized for Indian users)
- **Exchange rate:** 83.50 INR per USD (configurable via `DEFAULT_EXCHANGE_RATE`)
- Currency toggle on Pricing page with real-time price conversion
- Payment records store: `amount_usd`, `amount_local`, `currency`, `exchange_rate`

### Payment Methods by Currency

| Currency | Methods |
|----------|---------|
| **USD** | Visa, Mastercard, American Express, International Cards |
| **INR** | UPI, Credit Card, Debit Card, Net Banking |

### Payment Flow

1. User selects plan and clicks "Purchase" → `POST /api/payments/initiate`
2. **Trial plan:** Credits granted immediately, payment auto-completed
3. **Paid plans:** Payment record created as PENDING, redirects to `/app/payments/process/:id`
4. User confirms payment → `POST /api/payments/:id/complete`
5. Credits are added to user account, transaction ID generated, audit log created
6. User can also cancel → `POST /api/payments/:id/fail`
7. Payment history viewable under `/app/payments` with invoice numbers and download buttons

---

## 13. Waitlist / Early Access System

The waitlist system captures interest for the LetsZero platform (not just RepMail) before general availability.

### How It Works

1. **Waitlist Landing Page** (`/early-access`) — dedicated page with:
   - LetsZero branding (not RepMail)
   - Email capture form with validation
   - Value proposition blocks (Campaign Automation, Deliverability Infrastructure, Performance Intelligence)
   - Visual design matching the main landing experience (#0A0A0F background, Space Grotesk headings)
   
2. **API Endpoint:** `POST /api/waitlist`
   - Validates email via Zod schema
   - Stores in `waitlist` table with optional `source` field (tracks where the signup came from, e.g., "hero", "footer")
   - Returns 409 if email already exists
   - Returns success message: "You're on the list. We'll be in touch."

3. **Form States:**
   - Idle → Loading (with spinner) → Success ("You're on the list") or Error (with specific message)
   - Client-side email validation before API call
   - Duplicate detection with friendly "You're already on the list" message

4. **Navigation:** The "Request Early Access" button appears on the main LetsZero landing page and in the navigation bar.

---

## 14. Audit & Compliance System

Every significant action in the platform generates an audit log entry. This provides a complete compliance trail.

### Tracked Actions

| Action | Trigger |
|--------|---------|
| `USER_LOGIN` | Successful login |
| `USER_LOGOUT` | Logout |
| `USER_CREATED` | New user created by admin |
| `USER_UPDATED` | User profile updated |
| `USER_DELETED` | User deleted by admin |
| `PASSWORD_CHANGED` | Password reset |
| `PASSWORD_RESET_FORCED` | Admin forces password reset |
| `CREDITS_ALLOCATED` | Credits transferred between users |
| `CREDITS_DEALLOCATED` | Credits removed |
| `CREDITS_USED` | Credits consumed (1 per email) |
| `CREDITS_PURCHASED` | Credits bought via payment |
| `CAMPAIGN_CREATED` | New campaign created |
| `CAMPAIGN_STARTED` | Campaign execution started |
| `CAMPAIGN_PAUSED` | Campaign paused |
| `CAMPAIGN_COMPLETED` | Campaign finished successfully |
| `CAMPAIGN_FAILED` | Campaign failed |
| `CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS` | Campaign blocked due to low credits |
| `EMAIL_SENT` | Individual email sent |
| `EMAIL_FAILED` | Individual email failed |
| `TEMPLATE_CREATED` | New template created |
| `TEMPLATE_UPDATED` | Template edited |
| `TEMPLATE_DELETED` | Template deleted |
| `CONTACT_IMPORTED` | Contacts imported from file |
| `AI_PREVIEW_GENERATED` | AI preview requested |
| `SPAM_ANALYSIS_RUN` | Spam analysis executed |
| `PAYMENT_INITIATED` | Payment process started |
| `PAYMENT_SUCCESS` | Payment completed |
| `PAYMENT_FAILED` | Payment failed |
| `CONTACT_FORM_SUBMITTED` | Contact form submitted |

### Audit Log UI (ROOT_ADMIN Only)

- Accessible at `/app/audit`
- Searchable by username, action, or detail text
- Filterable by action type via dropdown
- Displays: User, Action (badge), Details, Target, Timestamp
- Each action type has a unique icon and color-coded badge

---

## 15. AI-Powered Features

### Email Preview (AI Personalization)

- **Endpoint:** `POST /api/ai/preview`
- Takes a template (subject + body) with `{{placeholder}}` syntax and an array of up to 3 contacts
- Replaces placeholders with actual contact data
- Returns personalized preview for each contact
- **Fallback:** If the API fails, client-side `replacePlaceholders()` utility handles it
- **Audit:** Every AI preview generation is logged

### Planned Integrations

- **OpenAI API** — For advanced AI personalization and content generation
- **Supabase** — For Auth and Database services (noted in project requirements)

---

## 16. Spam Analysis Engine

### How It Works

1. Takes email subject and body as input
2. Scans against 15 known spam trigger words:
   - free, winner, click here, buy now, limited time, act now, urgent, congratulations, guarantee, no obligation, risk free, special offer, exclusive deal, you won, cash
3. **Scoring rules:**
   - Each spam word found: +5 points
   - ALL-CAPS subject (>5 chars): +15 points
   - Each exclamation mark: +2 points
   - Score capped at 100
4. **Suggestions map** (10 word replacements):
   - "free" → "complimentary"
   - "winner" → "selected participant"
   - "click here" → "learn more"
   - "buy now" → "explore options"
   - "limited time" → "time-sensitive"
   - "act now" → "consider this opportunity"
   - "urgent" → "important"
   - "congratulations" → "we're pleased to inform you"
   - "guarantee" → "assurance"
   - "no obligation" → "no commitment required"

5. Returns: `{ score: number, riskyWords: string[], suggestions: { original, suggestion }[] }`

---

## 17. Landing Pages & Marketing

### LetsZero Main Landing (`/` — LandingExperience.tsx)

The root route displays the LetsZero platform landing page — a premium, dark-themed (#0A0A0F) marketing experience built with:

- **Hero Section:** "Communication infrastructure without compromise" headline with animated floating UI fragments (delivery metrics card, API health card, product card)
- **Product Suite Section:** Showcases RepMail (LIVE), MessageHub (Q2 2026), NotifyStream (Q3 2026)
- **Mission Section:** Four pillars displayed in a constellation layout (Reliability, Scalability, Transparency, Thoughtful Engineering)
- **Contact Section:** Inline contact form
- **Stats Bar:** 200+ Teams, 1.2B+ Messages Delivered, 99.98% Uptime, 1 Live · 2 Soon
- **Navigation:** Products dropdown, Mission anchor, Contact anchor, "Explore RepMail" + "Request Early Access" buttons

### RepMail Product Landing (`/products/repmail` — Landing.jsx)

A dedicated product page for RepMail featuring:

- **Hero:** "Enterprise Email Campaign Control" with feature highlights
- **Workflow Steps:** 6-step visual showing Upload → AI Personalization → Spam Analysis → Credit Validation → Secure Delivery → Analytics
- **Features Grid:** 99.9% Deliverability, Real-Time Analytics, + more
- **CTA:** Links to Login and Dashboard
- **Scroll indicator** with animated mouse icon

### Waitlist / Early Access (`/early-access` — WaitlistLanding.jsx)

- Dedicated private beta signup page
- LetsZero-branded (not RepMail-specific)
- Email capture with validation and duplicate detection
- Value blocks: Campaign Automation, Deliverability Infrastructure, Performance Intelligence
- Navigation links: Home, RepMail, Login

---

## 18. Pages & Navigation Map

### Public Pages (No Auth Required)

| Page | Route | Description |
|------|-------|-------------|
| LetsZero Home | `/` | Platform landing page |
| RepMail Landing | `/products/repmail` | Product-specific landing |
| Early Access | `/early-access` | Waitlist signup |
| Login | `/login` | Authentication page with branding panel |
| Pricing | `/pricing` | Public pricing page with currency toggle |
| Contact | `/contact` | Contact form (sales, support, billing, partnership) |

### Authenticated App Pages

| Page | Route | Access | Description |
|------|-------|--------|-------------|
| Dashboard | `/app/dashboard` | All users | Credit balance, stats grid, charts, recent campaigns, quick actions |
| New Campaign | `/app/campaigns/new` | All users | 7-step campaign wizard |
| History | `/app/history` | All users | Campaign history with search and status filter |
| Templates | `/app/templates` | All users | CRUD for email templates with grid/list view |
| Payments | `/app/payments` | All users | Pricing plans, payment processing, payment history |
| Profile | `/app/profile` | All users | Account info, role, credit summary |
| Users | `/app/users` | Admin only | User management, creation, credit allocation, deletion |
| Audit Logs | `/app/audit` | ROOT_ADMIN | Comprehensive audit trail with search and filter |

### App Navigation Bar

Fixed top navbar with: Logo (REPMAIL), Dashboard, New Campaign, History, Templates, Payments, Users (admin), Audit Logs (root admin), Theme Toggle, User Menu (Profile, Logout).

---

## 19. File & Folder Structure

```
Let-sZero/
├── client/                          # Frontend (React SPA)
│   ├── index.html                   # HTML entry point (loads Google Fonts)
│   ├── public/                      # Static assets
│   └── src/
│       ├── App.jsx                  # Root component: providers, routing
│       ├── index.css                # Global CSS (Tailwind directives, CSS vars)
│       ├── main.jsx                 # ReactDOM render entry
│       ├── components/
│       │   ├── campaign/            # Campaign wizard step components
│       │   │   ├── AiPreview.jsx        # Step 4: AI personalization preview
│       │   │   ├── CampaignConfirmation.jsx  # Step 6: Review & send
│       │   │   ├── ColumnMapping.jsx    # Step 2: Map CSV columns
│       │   │   ├── FileUpload.jsx       # Step 1: CSV/Excel upload
│       │   │   ├── ProgressTracker.jsx  # Step 7: Real-time progress
│       │   │   ├── SpamAnalyzer.jsx     # Step 5: Spam risk analysis
│       │   │   ├── StepIndicator.jsx    # Horizontal step progress bar
│       │   │   └── TemplateBuilder.jsx  # Step 3: Email template editor
│       │   ├── layout/
│       │   │   ├── AppLayout.jsx        # Authenticated page wrapper (Navbar + content)
│       │   │   ├── Navbar.jsx           # Top navigation bar
│       │   │   └── ThemeToggle.jsx      # Dark/light mode toggle
│       │   └── ui/                  # shadcn/ui components (40+ primitives)
│       │       ├── accordion.jsx, alert.jsx, avatar.jsx, badge.jsx...
│       │       ├── button.jsx, card.jsx, checkbox.jsx, dialog.jsx...
│       │       ├── dropdown-menu.jsx, form.jsx, input.jsx, label.jsx...
│       │       ├── progress.jsx, select.jsx, separator.jsx, table.jsx...
│       │       ├── tabs.jsx, textarea.jsx, toast.jsx, tooltip.jsx...
│       │       └── ...etc
│       ├── context/
│       │   ├── AuthContext.jsx          # Authentication state & methods
│       │   ├── CampaignContext.jsx      # Campaign wizard multi-step state
│       │   └── ThemeContext.jsx         # Dark/light theme state
│       ├── hooks/
│       │   ├── use-mobile.js            # Mobile breakpoint detection
│       │   └── use-toast.js             # Toast notification hook
│       ├── lib/
│       │   ├── queryClient.js           # TanStack Query setup, apiRequest(), getQueryFn()
│       │   └── utils.js                 # cn(), formatNumber(), formatDate(), parseCSV(), etc.
│       └── pages/
│           ├── Audit.jsx                # Audit logs page (ROOT_ADMIN)
│           ├── Contact.jsx              # Contact form page
│           ├── Dashboard.jsx            # Main dashboard with stats & charts
│           ├── History.jsx              # Campaign history table
│           ├── Landing.jsx              # RepMail product landing page
│           ├── Login.jsx                # Login page with branding panel
│           ├── NewCampaign.jsx          # Campaign wizard container
│           ├── not-found.jsx            # 404 page
│           ├── Payments.jsx             # Pricing plans + payment processing + history
│           ├── Pricing.jsx              # In-app pricing page (authenticated)
│           ├── Profile.jsx              # User profile page
│           ├── PublicPricing.jsx         # Public pricing page
│           ├── ResetPassword.jsx        # Forced password reset page
│           ├── Templates.jsx            # Template CRUD with grid/list view
│           ├── Users.jsx                # User management (admin)
│           └── WaitlistLanding.jsx      # Early access waitlist page
│
├── marketing/                       # Marketing site assets
│   └── LFP_final/
│       ├── index.html               # Marketing HTML entry
│       ├── LandingExperience.tsx     # Main LetsZero landing (monolithic component)
│       ├── package.json             # Marketing-specific deps
│       ├── README.md                # Marketing setup notes
│       ├── vite.config.js           # Marketing Vite config
│       ├── src/
│       │   ├── App.jsx
│       │   └── main.jsx
│       └── styles/
│           ├── fonts.css
│           ├── index.css
│           ├── tailwind.css
│           └── theme.css
│
├── server/                          # Backend (Express API)
│   ├── db.js                        # Database connection (auto-switches PG/memory)
│   ├── index.js                     # Express app setup, middleware, server start
│   ├── memoryStorage.js             # In-memory storage adapter (dev mode)
│   ├── routes.js                    # All API route handlers
│   ├── static.js                    # Production static file serving
│   ├── storage.js                   # Unified storage interface (PG or memory)
│   └── vite.js                      # Development Vite middleware setup
│
├── shared/                          # Shared between client & server
│   └── schema.js                    # Drizzle tables, Zod schemas, constants, pricing
│
├── script/
│   └── build.js                     # Production build orchestrator (Vite + esbuild)
│
├── components.json                  # shadcn/ui configuration
├── design_guidelines.md             # UI/UX design system documentation
├── drizzle.config.js                # Drizzle Kit configuration (PostgreSQL)
├── package.json                     # Dependencies and scripts
├── postcss.config.js                # PostCSS configuration
├── replit.md                        # Replit-specific project documentation
├── tailwind.config.js               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
├── vercel.json                      # Vercel deployment configuration
└── vite.config.js                   # Vite build configuration with path aliases
```

---

## 20. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Production | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db`) |
| `NODE_ENV` | Recommended | `development` or `production` — controls storage mode and build |
| `PORT` | Optional | Server port (default: `5000`) |

**Notes:**
- Without `DATABASE_URL`, the server runs in **DEV mode** with in-memory storage
- Production mode (`NODE_ENV=production` + valid `DATABASE_URL`) uses PostgreSQL via Drizzle ORM
- No other secrets are currently required (payment integration uses simulated flow)

---

## 21. Development & Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Vite HMR + Express, in-memory storage) |
| `npm run build` | Production build: Vite → `dist/public/` + esbuild → `dist/index.cjs` |
| `npm run start` | Start production server from `dist/index.cjs` |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push Drizzle schema to PostgreSQL (requires `DATABASE_URL`) |

### Development Flow

1. `npm run dev` starts Express on port 5000 (or `PORT` env var)
2. Vite dev server runs as middleware with HMR on `/vite-hmr`
3. Client requests to `/api/*` are proxied to Express
4. In-memory storage initializes with a ROOT_ADMIN user
5. All API logs are printed to console with timestamps

### Production Build Flow

1. `npm run build` triggers `script/build.js`
2. Vite builds React SPA → `dist/public/`
3. esbuild bundles server code → `dist/index.cjs` (CJS, minified)
4. External dependencies (not in allowlist) are excluded from bundle
5. `npm run start` runs the CJS bundle which serves both API and static files

---

## 22. Deployment

### Vercel Configuration

The project is configured for Vercel deployment via `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    { "src": "dist/index.cjs", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "dist/index.cjs" }
  ]
}
```

All requests (both API and frontend) route through the Express server bundle, which serves:
- API routes under `/api/*`
- Static frontend files from `dist/public/`
- SPA fallback: all non-API routes serve `index.html`

---

## 23. Design Guidelines Summary

### Visual System

- **Approach:** Professional minimalism (Linear + Stripe + SendGrid hybrid)
- **Core principle:** Every element serves a functional purpose
- **Dark mode:** Full dark/light support via CSS custom properties in HSL

### Typography

| Use Case | Style |
|----------|-------|
| Page titles | `text-2xl`/`text-3xl`, `font-semibold` |
| Section headers | `text-xl`, `font-semibold` |
| Card titles | `text-lg`, `font-medium` |
| Body text | `text-base`, `font-normal` |
| Helper/metadata | `text-sm`, `text-gray-600` |
| Micro labels | `text-xs`, `uppercase`, `tracking-wide` |

### Status Badge Colors

| Status | Light Mode | Dark Mode |
|--------|-----------|-----------|
| Running/Active | `bg-blue-100 text-blue-800` | `bg-blue-900/30 text-blue-400` |
| Completed/Success | `bg-green-100 text-green-800` | `bg-green-900/30 text-green-400` |
| Failed/Error | `bg-red-100 text-red-800` | `bg-red-900/30 text-red-400` |
| Pending/Paused | `bg-yellow-100 text-yellow-800` | `bg-yellow-900/30 text-yellow-400` |
| Default/Draft | `bg-gray-100 text-gray-800` | `bg-gray-900/30 text-gray-400` |

### Animations

- Minimal — hover transitions (`transition-colors duration-150`)
- Framer Motion for page-level entrance animations
- No auto-playing animations in the app (landing pages are exceptions)
- Stagger animations for dashboard card reveals

---

## 24. Constants & Enums Reference

### User Roles

```
ROOT_ADMIN | SUB_ADMIN | USER
```

### Campaign Statuses

```
DRAFT | PENDING | RUNNING | PAUSED | COMPLETED | FAILED
```

### Payment Statuses

```
PENDING | SUCCESS | FAILED | REFUNDED
```

### Contact Reasons

```
SALES | SUPPORT | BILLING | PARTNERSHIP | OTHER
```

### Audit Actions (Full List)

```
USER_LOGIN, USER_LOGOUT, USER_CREATED, USER_UPDATED, USER_DELETED,
PASSWORD_CHANGED, PASSWORD_RESET_FORCED,
CREDITS_ALLOCATED, CREDITS_DEALLOCATED, CREDITS_USED, CREDITS_PURCHASED,
CAMPAIGN_CREATED, CAMPAIGN_STARTED, CAMPAIGN_PAUSED, CAMPAIGN_COMPLETED,
CAMPAIGN_FAILED, CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS,
EMAIL_SENT, EMAIL_FAILED,
TEMPLATE_CREATED, TEMPLATE_UPDATED, TEMPLATE_DELETED,
CONTACT_IMPORTED, AI_PREVIEW_GENERATED, SPAM_ANALYSIS_RUN,
PAYMENT_INITIATED, PAYMENT_SUCCESS, PAYMENT_FAILED,
CONTACT_FORM_SUBMITTED
```

### Supported Currencies

```
USD — US Dollar ($)
INR — Indian Rupee (₹)
Exchange Rate: 83.50 INR per 1 USD (configurable)
```

### Template Placeholders

```
{{name}}     — Recipient's name
{{email}}    — Recipient's email address
{{company}}  — Recipient's company name
{{category}} — Recipient's category/segment
```

---

*This document represents the complete state of the LetsZero project as of March 2026. For the most up-to-date information, refer to the source code directly.*
