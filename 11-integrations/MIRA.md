# MIRA Integration

## Purpose
Integration with MIRA for tax filing and e‑Invoicing.

## Background
MIRA provides MIRAconnect for online filing. Future e‑Invoicing API.

## Business Requirements
- Generate Excel files that match MIRA templates.
- (Future) Submit returns via API.
- (Future) Receive e‑Invoices from MIRA.

## Current Constraints
- No official public API for submission (yet).
- e‑Invoicing roadmap unknown.

## Workflow
- For MVP: export Excel, user uploads to MIRAconnect.
- Future: direct API.

## Open Questions
- [ ] Does MIRA provide an API for filing?
- [ ] What is the e‑Invoicing timeline?
- [ ] Should we support OAuth2 for MIRAconnect?