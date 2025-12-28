# EmailFlow Pro

## Overview

EmailFlow Pro is an enterprise SaaS email marketing platform designed for professional email campaign management. The application provides a complete solution for creating, managing, and tracking email campaigns with hierarchical user management and credit-based resource allocation.

The platform follows a professional minimalist design approach inspired by Linear, Stripe, and SendGrid, emphasizing clarity, trust, and efficiency for enterprise users.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with Vite bundler
- **Language**: JavaScript (JSX) - explicitly NOT TypeScript for application code
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack Query (React Query) for server state
- **Icons**: Lucide React icons
- **UI Components**: Radix UI primitives with custom styling

The frontend follows a standard React SPA pattern with:
- Path aliases configured: `@/` for client source, `@shared/` for shared code
- Component-based architecture with reusable UI primitives in `client/src/components/ui/`
- Custom hooks in `client/src/hooks/`
- Centralized API client and query configuration in `client/src/lib/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: JavaScript (ES modules)
- **API Style**: RESTful endpoints under `/api/` prefix
- **Authentication**: Token-based sessions stored in memory (Map-based session storage)

The backend uses a simple in-memory storage pattern (`server/storage.js`) for development, with routes defined in `server/routes.js`. Authentication middleware validates tokens from headers or cookies.

### User Role System
Three-tier hierarchical user model:
- **ROOT_ADMIN**: Top-level administrator with full access
- **SUB_ADMIN**: Middle-tier managers with delegated permissions
- **USER**: Standard users with basic access

Each user has a credit allocation system tracking received, allocated, and used credits.

### Database Layer
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema**: Defined in `shared/schema.ts` (TypeScript) with Zod validation via `drizzle-zod`
- **Migrations**: Output to `./migrations` directory
- **Development**: Uses in-memory storage; Drizzle configured for production PostgreSQL

Note: The application has dual schema files - `shared/schema.js` for runtime validation schemas and `shared/schema.ts` for Drizzle database schema. The PostgreSQL connection requires `DATABASE_URL` environment variable.

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Vite builds to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Build script**: Custom TypeScript build script in `script/build.ts`

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **connect-pg-simple**: PostgreSQL session store support

### Planned Integrations (from project requirements)
- **Supabase**: Intended for Auth and Database services
- **OpenAI API**: For AI personalization and spam analysis features

### Email Services
- **Nodemailer**: Email sending capability (installed)

### Payment Processing
- **Stripe**: Payment integration (installed)

### Development Tools
- **Replit Plugins**: Dev banner, cartographer, and runtime error overlay for Replit environment

## Recent Changes

### Navigation Updates (Dec 2024)
- Added public routes: `/pricing`, `/contact`
- Added authenticated route: `/app/payments` with Payments page in navbar
- Updated Landing page header with Pricing and Contact links
- Updated Footer with navigation links to Pricing, Contact, and Sign In

### Dual-Currency Payment System (Dec 2024)
- **Base currency**: USD for all pricing logic, storage, and backend processing
- **Display currencies**: USD (default) and INR (localized for Indian users)
- Currency toggle on Pricing page with real-time price conversion
- Exchange rate: 83.50 INR per USD (configurable via DEFAULT_EXCHANGE_RATE)
- Payment records store: amount_usd, amount_local, currency, exchange_rate
- Payment methods adapt by currency: USD (international cards), INR (UPI, cards, net banking)
- Trust indicators and conversion transparency notes

### Payments & Pricing System (Dec 2024)
- 6 pricing tiers: 3 pay-as-you-go (1K-10K credits), 3 bulk (50K-500K credits with discounts)
- Payment initiation and completion flow with invoice tracking
- Trial credits system: 5 free demo credits for new users

### Multi-Format File Upload (Dec 2024)
- CSV and Excel (.xlsx, .xls) file support with server-side parsing via xlsx package
- File type badges, loading states, 10MB file size limit

### Contact Form (Dec 2024)
- Public contact page with multiple reason categories (Sales, Support, Billing, Partnership, Other)
- Admin endpoint for viewing contact submissions