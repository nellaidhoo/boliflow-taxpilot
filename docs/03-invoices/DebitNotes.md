# Debit Notes

## Purpose
Handle debit notes issued to suppliers or received from customers.

---

## Background

Debit notes adjust GST: increase input tax (if issued to supplier) or increase output tax (if received from customer).

---

## Database

**Table: debit_notes**
- `id`, `business_id`, `original_invoice_id`
- `debit_note_number`, `date`
- `adjustment_amount`, `gst_adjustment`
- `type` (sales_debit, purchase_debit)