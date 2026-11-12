# BoliFlow API

Production backend foundation for the TaxPilot web client. PostgreSQL is the system of record; Prisma owns schema generation and migrations; Fastify serves the versioned HTTP API. The running app uses the API and does not connect to Convex. Convex source and demo data remain in the repository as prototype reference only.

## Local setup

Use Node.js 22.18 or newer and pnpm. Start local PostgreSQL with `docker compose up -d postgres`. The first `npm run dev` in the repository root creates `.env` from `.env.example`; the first `npm run dev` in `backend` creates `backend/.env` from `backend/.env.example`. These scripts never overwrite an existing environment file. Better Auth stores accounts and sessions in PostgreSQL and signs users in with email and password; no external identity provider is required. Set `BETTER_AUTH_SECRET` to a unique random value in production, set `BETTER_AUTH_URL` to the public API origin, and set `WEB_ORIGINS` to the exact website origins allowed to use the cookie session.

```sh
pnpm install
pnpm db:generate
pnpm db:deploy
pnpm dev:api
```

To load a local sample administrator and workspace after applying migrations, run `pnpm --filter @boliflow/api db:seed:demo`. The development-only account is `demo@taxpilot.example.com` with password `TaxPilotDemo-Local-2026!`; it has the business `ADMIN` role and sample sales/purchase records. The seed command refuses to run when `NODE_ENV=production`.

For a Linux VPS deployment with Cloudflare Origin CA, follow [`docs/deployment/linux-vps-cloudflare-origin-ca.md`](../docs/deployment/linux-vps-cloudflare-origin-ca.md).

The API listens on `127.0.0.1:4000` by default. `GET /health/live` checks the process, `GET /health/ready` checks PostgreSQL, and authenticated `GET /v1/me`, `GET /v1/businesses`, and `POST /v1/businesses` provide the initial identity and business-onboarding API.

Purchase files use short-lived signed PUT URLs to a private S3-compatible bucket. Configure the `S3_*` settings in `backend/.env`, and set bucket CORS to allow the web application origin and `PUT` with `Content-Type`. Keep the bucket private and block public access. The upload API validates file type, size, business ownership metadata, and tenant membership before attaching an object to a purchase record. The review page uses a five-minute signed GET URL. OCR is not wired yet; uploaded invoices enter manual review and users enter invoice fields and tax lines themselves.

The Convex database contains demo data only. Do not dual-write or import those records. Create a clean PostgreSQL database and populate it through normal account/business onboarding. Convex client code and prototype-only routes are not used by the running application.

## Database conventions

- PostgreSQL UUID primary keys and explicit tenant foreign keys.
- Decimal columns for MVR amounts; avoid JavaScript floating-point values for persisted money.
- Date-only columns for invoice dates and filing-period boundaries.
- Membership rows provide a tenant boundary and role slot for future collaborator access.
- Audit events are inserted in the same transaction as the business-profile creation action.

Production deployment must apply reviewed migrations with `db:deploy`; `db:migrate` is for development only. Keep `DATABASE_URL` and `BETTER_AUTH_SECRET` server-side. The current email/password flow does not yet send email verification or password-reset messages; configure transactional email and enable those flows before opening public production registration.

The Prisma models retain the prototype's business, purchase, sales, and audit concepts. Purchase rows may have no invoice date or number yet, and Convex file storage IDs are deliberately not carried over; documents use provider-neutral private object keys.
