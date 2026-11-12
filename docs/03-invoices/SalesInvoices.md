# Sales Invoices

## Purpose
Store sales data for output tax calculation.

---

## Background

Every sales invoice contributes to **Output Tax** (GST collected from customers). Must be included in Output Tax Statement[reference:61].

---

## Business Requirements

- Store customer details, invoice number, date, taxable amount, GST rate, GST amount
- Support walk-in customers (no TIN)
- Support POS integration
- Generate Output Tax Statement[reference:62]

---

## User Stories

- As a retailer, I export POS sales and the system calculates output tax
- As a shop owner, I manually enter sales for the period

---

## Workflow

1. Enter sales manually or import from POS CSV
2. System calculates output tax
3. Sales included in Output Tax Statement

---

## Validation Rules

- Output tax = sales amount × rate
- Must be in the correct tax period (accrual basis)

---

## Database

**Table: sales_invoices**
- `id`, `business_id`, `customer_id` (optional), `gst_period_id`
- `invoice_number`, `invoice_date`, `taxable_amount`
- `gst_rate`, `gst_amount`, `total_amount`
- `customer_type` (registered, walk-in)
- `source` (manual, pos_import)

---

## UI

- Manual entry form
- POS CSV import
- Sales summary view

---

## Open Questions

- [ ] Should we support bulk import from POS systems?
- [ ] How to handle walk-in customers without TIN?