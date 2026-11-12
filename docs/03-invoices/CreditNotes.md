# Credit Notes

## Purpose
Handle credit notes issued to customers or received from suppliers.

---

## Background

Credit notes adjust GST: reduce output tax (if issued to customer) or reduce input tax (if received from supplier).

---

## Business Requirements

- Link to original invoice
- Track GST adjustment amount
- Include in GST calculation

---

## Database

**Table: credit_notes**
- `id`, `business_id`, `original_invoice_id`
- `credit_note_number`, `date`
- `adjustment_amount`, `gst_adjustment`
- `type` (sales_credit, purchase_credit)

---

## Open Questions

- [ ] Should credit notes be auto-linked to invoices?
- [ ] How to handle partial credit notes?