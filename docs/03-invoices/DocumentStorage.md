# Document Storage

## Purpose
Store and manage invoice images, PDFs, and supporting documents.

---

## Requirements

- Store original documents (PDF, PNG, JPEG, GIF)
- Link documents to invoices
- Retention policy compliant with MIRA requirements[reference:63]:
  - Documents must be retained for at least 12 months from due date

---

## Database

**Table: documents**
- `id`, `business_id`, `invoice_id`
- `file_name`, `file_size`, `mime_type`
- `storage_path`, `uploaded_at`
- `retention_date` (12 months from filing due date)

---

## Open Questions

- [ ] Should OCR images be deleted after extraction for privacy?
- [ ] What is the maximum file size?
- [ ] Should documents be encrypted at rest?