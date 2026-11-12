# Purchase Invoices

## Purpose
Store and process invoices received from suppliers.

---

## Background

Every purchase invoice is a source of **Input Tax** (GST paid on purchases). It must be captured accurately to claim input tax credits[reference:58].

---

## Business Requirements

- Store all fields: supplier, invoice number, date, taxable amount, GST rate, GST amount, total
- Support multiple GST rates per invoice
- Link to original document (image/PDF)
- Allow manual override of extracted data
- Support **Input Tax Statement** generation[reference:59]

---

## User Stories

- As a user, I upload a PDF invoice and the system extracts key data
- As an accountant, I correct mis-extracted fields

---

## Workflow

1. Upload → OCR/AI extracts → user reviews → save
2. Saved invoice linked to a tax period (if period is open)
3. Invoice included in Input Tax Statement

---

## Validation Rules

- Invoice number must not duplicate for same supplier
- Date must be within a reasonable range
- GST calculation: amount × rate = GST (within tolerance)
- Supplier TIN required if GST charged

---

## Database

**Table: purchase_invoices**
- `id` (UUID, PK)
- `business_id` (UUID, FK)
- `supplier_id` (UUID, FK)
- `gst_period_id` (UUID, FK)
- `invoice_number` (text)
- `invoice_date` (date)
- `taxable_amount` (decimal)
- `gst_rate` (decimal: 8.0 or 17.0)
- `gst_amount` (decimal)
- `total_amount` (decimal)
- `currency` (enum: MVR, USD)
- `document_url` (text)
- `ocr_confidence` (decimal)
- `status` (enum: draft, reviewed, approved, rejected)
- `input_tax_claimed` (boolean)
- `created_at`, `updated_at`

---

## UI

- Upload screen with drag-and-drop
- Review screen showing extracted fields with confidence scores
- Edit capability for corrections
- Bulk upload support

---

## Future Enhancements

- Auto-matching with purchase orders
- Integration with procurement systems
- e-Invoice reception[reference:60]

---

## Open Questions

- [ ] Should we support both physical and electronic invoices?
- [ ] How to handle bulk uploads (many files at once)?
- [ ] What is the retention period for invoice images?