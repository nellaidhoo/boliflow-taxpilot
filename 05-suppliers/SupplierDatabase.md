# Supplier Database

## Purpose
Maintain a master list of suppliers.

---

## Background

Each supplier may have multiple invoices. Accurate supplier data is critical for GST filing[reference:64].

---

## Business Requirements

- Store TIN, name, address, phone, email
- Store GST registration status
- Store default GST rate
- Track invoice template preferences

---

## Database

**Table: suppliers**
- `id` (UUID, PK)
- `business_id` (UUID, FK)
- `tin` (text, 10 characters)
- `name` (text)
- `address` (text)
- `phone` (text)
- `email` (text)
- `is_vat_registered` (boolean)
- `default_gst_rate` (decimal)
- `template_id` (UUID, FK)
- `created_at`, `updated_at`

---

## Workflow

- Create on first invoice import
- Manual creation
- Merge duplicates

---

## Open Questions

- [ ] Should we share supplier data across tenants?
- [ ] How to handle name variations?
- [ ] What is the TIN format?