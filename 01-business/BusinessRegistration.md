# Business Registration

## Purpose
Manage business profile and tax registration details.

---

## Background

Each business must register with MIRA and obtain a TIN (Taxpayer Identification Number). For GST, they must also register if turnover exceeds thresholds. TaxPilot needs this information to generate correct returns.

---

## Business Requirements

- Store business name, TIN, address, phone, email.
- Store GST registration number (if applicable).
- Store GST filing frequency (monthly/quarterly).
- Store sector (General or Tourism).
- Store tax period start month (e.g., January, July).
- Allow updates to registration details.

---

## User Stories

- As a business owner, I want to enter my business details once, so that all tax forms are pre‑filled correctly.
- As an accountant, I want to update registration details for my clients.

---

## Workflow

1. User signs up → prompted to create business profile.
2. Fill in required fields (TIN, name, sector, etc.).
3. Save – data stored in `businesses` table.
4. Later, user can edit via Settings.

---

## Validation Rules

- TIN must be exactly 10 characters (Maldives format).
- GST registration number must be valid if provided.
- Sector must be 'General' or 'Tourism'.

---

## Database

**Table: businesses**
- `id` (UUID, PK)
- `user_id` (UUID, FK to users)
- `name` (text)
- `tin` (text, unique)
- `gst_reg_no` (text, optional)
- `sector` (enum: general, tourism)
- `filing_frequency` (enum: monthly, quarterly)
- `tax_period_start_month` (integer, 1-12)
- `address`, `phone`, `email`
- `created_at`, `updated_at`

---

## UI

- A form with validation.
- Confirmation modal before saving.

---

## Future Enhancements

- Multiple businesses per user.
- Company registration documents upload.

---

## Open Questions

- [ ] Should we validate TIN against MIRA database? (likely not in MVP)
- [ ] How to handle businesses with no GST registration (only income tax)?