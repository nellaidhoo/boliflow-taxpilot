# OCR & AI Engine

## Purpose
Extract structured data from invoice images and PDFs.

---

## Background

Invoices come in various formats. OCR converts images to text; AI extracts fields.

---

## Business Requirements

- Support PDF, PNG, JPEG, GIF
- Extract: supplier name, TIN, invoice number, date, taxable amount, GST, total
- Provide confidence score per field
- Flag low-confidence fields for human review

---

## User Stories

- As a user, I upload an invoice and the system fills in most fields automatically
- As an accountant, I see a confidence score and verify uncertain fields

---

## Workflow

1. Upload → OCR → field extraction → confidence scoring → store results
2. If confidence < 80%, highlight for review

---

## Validation Rules

- Confidence score 0-100%
- Fields below threshold require manual review

---

## Database

**Table: ocr_results**
- `id`, `invoice_id`, `processor` (azure, google, aws)
- `extracted_data` (JSON), `confidence` (decimal)
- `processed_at`, `status`

---

## Future Enhancements

- Auto-learn invoice templates (supplier-specific)
- Support for handwritten invoices

---

## Open Questions

- [ ] Which OCR provider? (Azure, Google, AWS, Tesseract?)
- [ ] Should we process offline or cloud-based?
- [ ] What is the expected accuracy for Maldivian invoices?