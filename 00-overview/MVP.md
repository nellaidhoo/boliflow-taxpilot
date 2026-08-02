# MVP (Minimum Viable Product)

## Purpose
Define exactly what will be built in the first release.

---

## MVP Scope

**Included:**
- User registration and login.
- Single business profile (GST registration details).
- Upload purchase invoices (PDF, PNG, JPEG) – drag and drop or file picker.
- OCR/AI extraction of:
  - Supplier TIN/Name
  - Invoice Number
  - Invoice Date
  - Total Amount (excluding GST)
  - GST amount (separated by rate – 8% or 17%)
- Manual editing of extracted fields.
- Manual entry of sales (output tax) – simple form to add sales invoices with GST.
- Automatic calculation of Input Tax Statement and Output Tax Statement.
- Export GST return (MIRA 205) as Excel file with all required columns.
- Basic dashboard showing total GST payable, number of invoices processed.
- Audit log of all actions.

**Excluded (post‑MVP):**
- Income Tax (v2)
- Multi‑business
- Accountant roles
- e‑Invoicing
- Bank feeds
- Advanced AI (supplier matching, auto‑categorisation) – we'll use basic rules first.

---

## Success Criteria

A beta user (retail shop) can:
1. Create an account and set up GST profile.
2. Upload 50 purchase invoices from last quarter.
3. Manually enter 50 sales invoices from their POS report.
4. Generate Input/Output Tax Statements.
5. Download a MIRA 205 Excel file.
6. Submit to MIRA (outside the app).

Time taken: <30 minutes (vs 3+ hours manually).

---

## Technical Constraints

- Web‑only (responsive design).
- PostgreSQL database.
- OCR service (external API – e.g., Azure Document Intelligence).
- PDF parsing library.
- Excel generation (xlsx).

---

## Open Questions

- [ ] Should we support quarterly and monthly periods in MVP?
- [ ] How do we handle imported invoices without GST (exempt/zero‑rated)?
- [ ] Should we allow partial upload (e.g., only images, no PDF)?