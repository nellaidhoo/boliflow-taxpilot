# Production Readiness Plan

## Purpose

Turn the current BoliFlow TaxPilot prototype into a secure, supportable SaaS product for Maldives businesses preparing GST returns. This plan combines the product intent in `docs/00-overview/` with the current React prototype and the selected PostgreSQL/Prisma backend direction. It is a delivery plan, not a promise that the current prototype is production-ready.

## Product outcome

A business can create an account, set up its GST profile, capture purchase and sales data, review exceptions, reconcile a tax period, and download the correct MIRA return workbook with a traceable record of the inputs and calculations. The first public release remains GST-focused; Income Tax, direct MIRA filing, bank feeds, and e-invoicing stay out of scope until the GST service is reliable.

### Release boundary

**Launch scope:** authentication and account recovery; one or more businesses only if tenant membership is delivered (otherwise formally retain one business per account); purchase capture and review; sales entry and supported CSV import; period close and reopening controls; Input/Output Tax Statements; validated MIRA 205/206 exports; audit history; subscription lifecycle; support and operational controls.

**Later:** Income Tax, accounting ledger, direct submission to MIRA, bank feeds, mobile native app, community supplier data, AI anomaly detection. Do not market these as available before their own regulatory, privacy, and operational readiness review.

## Current baseline

The repository contains a responsive React/Vite client and a Convex prototype backend. The UI has dashboard, purchases, purchase review, sales, returns, settings, and audit routes. The prototype backend has user/business setup, purchase extraction and invoice functions, sales entries, return statements, tax rules, checks, and audit utilities. Existing tests cover some calculations and validation helpers. PostgreSQL with Prisma in a separate TypeScript API backend is the selected production direction; Convex contains demo data only, so production should start with a clean PostgreSQL database rather than importing those records. Convex is legacy prototype code and must not remain the production system of record. This is a meaningful UI and domain-logic foundation, but the product documentation still labels itself pre-MVP and contains unresolved regulatory and security questions.

Key gaps visible from the code and docs:

- The schema is explicitly one business per user and has no membership/role model. Business ownership and authorization need to be verified across every query, mutation, storage URL, and background job before any multi-user or accountant use.
- The app now uses Better Auth email/password sessions with PostgreSQL and Prisma; operational ownership, email verification, account recovery, environment separation, and incident procedures still need production configuration.
- The application stores uploaded invoice files in Convex storage. Retention, private access, deletion, malware/content validation, limits, and backup/recovery expectations are undecided.
- The current schema uses JavaScript numbers and ISO strings for tax amounts/dates; financial precision, currency, timezone, immutable return snapshots, and policy for corrections after filing need explicit contracts.
- The product docs disagree on MIRA form numbers (205/206 versus 205 only in MVP), tax filing cadence, invoice entities, and whether all tax invoice fields and adjustments are supported. These are release blockers for trustworthy exports.
- No payment/subscription model, customer support process, service-level targets, monitoring, deployment/runbook, privacy terms, or incident response plan is documented.
- `demo-images/` contains no files in the current checkout, so it did not provide visual screen specifications for this plan.

Treat code-level observations as a starting inventory; validate them against deployed Convex configuration and the complete function set before launch.

## Decisions required before implementation is locked

Resolve these in product/technical decision records with an owner and date:

1. **Regulatory owner:** authoritative MIRA form variants, fields, deadlines, eligibility, rates, rounding, nil returns, corrections, and retention requirements; define who signs off on each tax rule release.
2. **Customer model:** single business per user for v1 or multi-business workspace; whether accountant access is required at public launch. If collaboration is required, implement membership and role authorization before launch rather than bolting it on later.
3. **System of record — decided:** PostgreSQL is authoritative, accessed by a TypeScript API backend through Prisma ORM. Convex contains demo data only; do not migrate those records. Start with a clean production database. The API owns authorization, validation, transactions, and migrations; the React app calls the API. Do not maintain duplicate authoritative tax records in Convex. Decide hosting, region, and backup/restore targets.
4. **Financial representation:** MVR-only or multiple currencies; use integer minor units or decimal-safe arithmetic; define rounding at line, invoice, and return levels and lock test vectors approved by a Maldives tax specialist.
5. **Filing behavior:** which periods are permitted for each filing frequency, period boundaries and timezone, due-date calendar, locked/filed period correction flow, and the source of tax-rate effective dates.
6. **File lifecycle and privacy:** storage region/provider, encryption and access model, retention and deletion schedule, data export/account closure process, and permitted use of documents for external OCR/AI providers.
7. **Commercial operation:** subscription plans, trial, grace period, cancellation, failed payment behavior, usage quotas, invoice/receipt obligations, and customer support hours.

## Work plan

Sequence is dependency-led. Each phase ends with a reviewable release gate; estimates should be added after the decision owners and engineering capacity are known.

### Phase 0 — Product and regulatory definition

- Appoint product owner, engineering owner, and Maldives tax/accounting reviewer.
- Reconcile all documents under `docs/` into one v1 requirements baseline; mark superseded specs instead of leaving contradictory requirements active.
- Obtain and archive the official current MIRA templates/instructions and sample edge cases. Create a versioned rule/form catalog with effective dates and source references.
- Run structured walkthroughs with at least 3 small businesses and 2 accountants/bookkeepers; validate onboarding, source documents, POS import, return review, and correction scenarios.
- Define supported input formats, volumes, expected processing latency, supported browsers/devices, languages, and customer support model.
- Approve data classification, retention, threat model, service targets, and launch boundary.

**Exit gate:** signed v1 scope; regulatory decision record; documented sample return cases; no unresolved question that can change tax calculation or the exported form.

### Phase 1 — SaaS foundation and architecture hardening

- Establish PostgreSQL with Prisma as the only production system of record. Document data model, indexes, tenant boundaries, schema migration process, backups, restore tests, vendor limits, regions, and exit plan.
- Model `users`, `workspaces/businesses`, memberships, roles, invitations, subscription state, immutable audit events, tax periods, purchases, sales, adjustments, documents, extraction jobs, and export snapshots. Separate source evidence from normalized tax facts.
- Add explicit tenant authorization helpers and enforce them in every server function; never accept business identifiers as authorization. Add negative authorization coverage for cross-tenant reads/writes and storage access.
- Harden Better Auth setup: secure cookie/session expiry and revocation, email verification and password recovery, optional MFA for staff/admin, rate limits, and environment-specific secrets. Provide a clear path for users to export data and close accounts.
- Use decimal-safe amounts (integer minor units or a decimal type) and strict date-only handling for invoice/period dates. Store timestamps in UTC, render in Maldives time, and version tax rules and currency assumptions.
- Define file pipeline: allowlisted MIME/signature checks, size/page limits, malware scan, private object access, short-lived download links, upload idempotency, encrypted storage, lifecycle deletion, and provider failure handling.
- Add schema versioning/migrations, request validation, idempotency keys for uploads/imports/exports, rate limits, abuse controls, and safe error responses with correlation IDs.

**Exit gate:** architecture and threat model approved; staging environment provisioned; backup restore and tenant-isolation checks demonstrated; secrets absent from source/client bundle.

### Phase 2 — Reliable GST data and tax engine

- Normalize invoice fields to the agreed tax data model, including supplier/customer identity, invoice identifiers/dates, taxable bases by rate, GST, gross totals, zero-rated/exempt supplies, source, currency, evidence link, status, and correction provenance.
- Add duplicate detection with a documented matching key and a safe review path; do not silently discard likely duplicates.
- Implement full validation as server-side domain rules: TIN format/eligibility, rate applicability, arithmetic and rounding, date/period eligibility, missing required values, supplier invoice uniqueness, and totals reconciliation.
- Version tax rates, thresholds, return mappings, and validation rules by effective date. Record which rule version produced each return. Avoid changing a filed return when configuration changes later.
- Support adjustments and credit/debit notes needed by the official form. Define nil-return and incomplete-period behavior. Period states should prevent accidental edits after finalization and expose an audited correction/reopen path.
- Build deterministic return calculation from approved source records only. Create an immutable calculation snapshot containing included record IDs/version hashes, totals, rule version, form version, actor, and timestamp.
- Maintain a tax specialist-approved “golden cases” set covering rates, mixed rates, boundary dates, rounding, exempt/zero-rated amounts, adjustments, duplicate handling, and nil returns.

**Exit gate:** every golden case matches independently reviewed expected results; calculations are reproducible from the saved snapshot; no unreviewed source data enters a final statement.

### Phase 3 — Capture, OCR, imports, and human review

- Make upload processing durable and observable: queued job state, retries with backoff, timeout policy, dead-letter/manual retry path, and idempotent completion.
- Keep OCR/AI output as a proposal with field-level confidence and provenance. Require human review for low-confidence or tax-critical fields; preserve original extraction and every correction.
- Confirm external processor contracts: data processing terms, retention, regional handling, model training policy, encryption, breach notice, and provider outage fallback. Never expose provider API keys in the browser.
- Implement upload progress, multi-file batch behavior, recoverable failure states, preview, accessible review form, and duplicate warnings.
- Define and publish CSV templates for supported POS/import formats. Validate headers/types/totals before commit, show a preview and row-level error report, and make re-import idempotent.
- Add manual sales entry and correction controls aligned with the same tax domain model used by imported data.

**Exit gate:** pilot sample documents and CSVs can be processed end to end; failures are visible and recoverable; corrections are auditable; measured field accuracy is reported by field and document class.

### Phase 4 — Filing workflow, exports, and customer operations

- Implement guided period workflow: readiness checklist, missing/failed review queue, statement preview, reconciliation, export, and filed marker with optional MIRA reference/evidence.
- Build MIRA 205/206 workbooks only after confirming correct form mapping. Validate generated files against official templates and independent sample calculations; include a clear generated-at/form-version record where allowed.
- Keep export generation server-side or in a trusted worker if needed; authorize every export request and use short-lived private downloads. Log export generation and download access.
- Add subscription checkout/management, webhook signature verification, idempotent billing events, entitlements and quotas, invoice/receipt handling, cancellation, and grace-period behavior. Keep billing state separate from tax records.
- Publish privacy notice, terms, data processing disclosures, support contact, data export/account closure instructions, and service status page.
- Create customer support triage for tax calculation disputes, incorrect extraction, access issues, and suspected security incidents; route regulatory questions to an identified reviewer.

**Exit gate:** accountant and business-owner acceptance of a complete return workflow; signed-off template files; subscription and account lifecycle flows work in staging; support staff can diagnose common failures without direct database edits.

### Phase 5 — Production operations and controlled launch

- Establish separate development, staging, and production projects; protect production access, use managed secrets, and require reviewed deployments with rollback procedure.
- Add structured logs, metrics, traces/correlation IDs, product analytics with privacy controls, alerting, and dashboards for auth failures, upload/OCR queue age, extraction failures, export failures, latency, storage usage, billing webhooks, and availability.
- Define SLOs and customer-facing support targets. Suggested initial targets to confirm with the team: 99.5% monthly service availability; 95% of routine queries under 2 seconds; upload acknowledgment under 5 seconds; clear status for longer OCR jobs. Track these before committing publicly.
- Implement backup schedules and retention; run restore drills; document incident severity, escalation, communication, evidence preservation, and post-incident review.
- Review dependency vulnerabilities, access scopes, CSP/security headers, CORS, CSRF strategy where applicable, XSS handling, secret rotation, and data access logs. Run an independent security review before broad launch.
- Run a closed pilot with 10–15 businesses; reconcile each pilot return against their accepted MIRA preparation process. Record accuracy, time saved, onboarding completion, support volume, and failure recovery.
- Use feature flags and staged rollout. Define rollback triggers for incorrect calculations, unauthorized access, widespread upload loss, or export corruption.

**Exit gate:** all launch criteria below pass; no open critical/high security or tax correctness issue; incident owner, support owner, and rollback authority are on call for launch.

## SaaS product requirements

### Tenant and access model

- Every business-owned object is tenant-scoped, including storage files, jobs, exports, audit events, and analytics.
- Authorization is checked on the server for each operation and each file download. UI hiding is not authorization.
- If accountants are supported, provide explicit invitations, roles (owner/admin, preparer, reviewer, read-only as appropriate), least privilege, access expiry/revocation, and audit attribution.
- Admin/support access is time-bound, justified, logged, and preferably read-only by default.

### Trust, privacy, and resilience

- Encrypt data in transit and at rest; keep identifiers/secrets out of logs; classify business data and invoices as confidential.
- Define retention and deletion for invoices, extracted data, audit records, backups, failed uploads, and closed accounts. Explain legal retention exceptions to customers.
- Provide tenant data export and deletion workflow, with verification and a durable completion record.
- Document dependency/vendor outage behavior; the app should preserve uploaded work and make delayed processing obvious.
- Audit records are append-only from application paths and include actor, tenant, action, entity, time, and relevant before/after values without copying sensitive document contents into logs.

### Billing and plans

- Store plan, entitlement, billing provider IDs, status, next renewal, and usage counters independently from tax data.
- Define quotas for businesses, users, monthly documents, file size, and retention. Show usage before a customer hits a hard limit.
- Never delete or corrupt customer tax records because of a failed payment. Define read-only/grace behavior and access to exports during cancellation.

## Launch acceptance checklist

- [ ] Product scope, supported MIRA forms, rates, filing frequencies, and legal wording signed off by named owners.
- [ ] Tenant isolation verified for every query/mutation/action and private file/export route.
- [ ] Authentication, recovery, session expiry, account closure, and invitation/revocation flows accepted.
- [ ] Tax calculations use exact agreed precision and pass the approved golden case set.
- [ ] Filed-period snapshots reproduce the same statements and workbook after later edits/rule updates.
- [ ] Uploads, OCR failures, retries, large files, duplicate records, and import row errors recover without data loss.
- [ ] Official export templates independently compared to expected MIRA outputs.
- [ ] Audit trail records every change that can affect tax results and cannot be edited through normal app flows.
- [ ] Staging/production separation, secret rotation, backups, restore drill, monitoring, alert ownership, and rollback are documented.
- [ ] Privacy, terms, retention, processor disclosures, customer support, billing, and cancellation behavior are published and tested.
- [ ] Pilot users complete filing workflow with reconciled results and acceptable support load.
- [ ] No unresolved critical/high security issue or tax correctness defect at launch review.

## Measures of success

Measure by cohort and document type rather than relying on one headline figure:

- Time from account creation to completed first return; target under 30 minutes for a prepared pilot business.
- Time to prepare a subsequent return; target under 5 minutes for a clean, complete period.
- Share of invoices requiring manual correction and field-level extraction accuracy, with separate values for TIN, invoice number/date, taxable base, rate, and GST.
- Return reconciliation discrepancy count and amount; target zero unexplained discrepancies.
- Upload/OCR completion and recovery rates; median and p95 processing latency.
- Onboarding completion, weekly active businesses, paid conversion, churn, support tickets per business, and time to resolve.
- Availability, error rate, restore recovery time, and data loss objective measured in drills.

## Immediate next actions

### Build progress (November 2026)

- Established a TypeScript/Fastify API with PostgreSQL and Prisma as the application data layer; the running web app uses Better Auth cookie sessions and API-backed business, sales, purchases, dashboard, return, and audit workflows.
- Added tenant-scoped purchase/sales/audit operations, transaction-backed audit entries, private S3-compatible invoice upload and short-lived download URLs, and a PostgreSQL schema for the prototype's tax records. The running app no longer requires a Convex provider.
- Added API request limits, loopback-only proxy trust, Node/pnpm version pins, and Linux Nginx/systemd deployment examples with Cloudflare Origin CA and an automatically refreshed Cloudflare IP allowlist.
- Invoice OCR is not connected. Uploaded invoices are saved for manual entry and review; configure the private object store and its CORS policy before enabling uploads in a deployed environment.
- API and web production builds pass. This is a working migration slice, not a launch-ready service: live database rollout, storage integration verification, OCR, observability, backup and restore drills, and security/tax acceptance gates remain.

1. Name the tax reviewer and product owner; schedule specification sign-off against official current MIRA documents.
2. Decide the account/business collaboration model and PostgreSQL hosting, region, and restore targets.
3. Create architecture decision records for financial precision, period rules, document retention, and OCR vendor handling.
4. Turn the current prototype routes and Convex functions into a verified feature inventory, then create epics from Phases 1–5 with owners and estimates.
5. Start the pilot document/CSV corpus and independently reviewed golden tax cases before expanding OCR automation.
