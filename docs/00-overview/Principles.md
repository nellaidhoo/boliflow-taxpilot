# Principles

## Purpose
Establish non‑negotiable design and operational guidelines.

---

## 1. Data is King

- Every transaction, document, and relationship is stored as structured data.
- Data is never discarded – it can be archived but always queryable.

## 2. Tax Rules are Configurable

- Tax rates, thresholds, forms, and validation rules are stored as metadata.
- No hard‑coded tax logic in the core engine.

## 3. User Experience Over Features

- We build only what solves a genuine pain point.
- Every feature must reduce user effort, never increase it.

## 4. Secure by Default

- Encryption at rest and in transit.
- Role‑based access control.
- Audit logs for all sensitive actions.

## 5. Open Integration

- APIs first – all functionality is accessible via REST.
- Webhooks for real‑time events.
- Support for import/export in common formats (Excel, CSV, PDF).

## 6. Continuous Learning

- The AI/OCR system improves with user corrections.
- Supplier knowledge base grows organically.

## 7. Performance Matters

- Invoices are processed in seconds.
- Reports generate in <5 seconds for typical datasets.

## 8. Mobile Ready

- Core workflows (view invoices, approve, submit) are accessible on mobile browsers.

---

## Open Questions

- [ ] Should we enforce a strict separation between tenant data?
- [ ] What is the maximum retention period for user data after account closure?