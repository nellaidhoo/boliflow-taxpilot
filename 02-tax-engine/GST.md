# GST Module

## Purpose

Manage the complete GST lifecycle: calculate output tax, input tax, adjustments, and generate the MIRA 205/206 return.

---

## Background

GST is a value‑added tax on supplies. Businesses collect GST from customers (output tax) and pay GST on purchases (input tax). The difference is payable to MIRA.

Current rates:
- General sector: 8%
- Tourism sector: 17%

Filing is monthly or quarterly based on turnover.

The GST return (MIRA 205 for general, 206 for tourism) requires:
- Summary of sales (taxable, zero‑rated, exempt) with GST collected per rate.
- Summary of purchases with GST paid per rate.
- Adjustments (credit notes, debit notes, bad debts, etc.).
- Final GST payable.

---

## Business Requirements

The system must:
- Allow user to define tax periods (monthly or quarterly) aligned with their filing frequency.
- Store purchase invoices with input tax details.
- Store sales invoices with output tax details.
- Automatically calculate total output tax (by rate) and total input tax (by rate).
- Handle adjustments (credit notes, debit notes, returned goods, bad debts).
- Generate Input Tax Statement (list of all purchase invoices with GST).
- Generate Output Tax Statement (list of all sales invoices with GST).
- Produce a summary for MIRA 205/206 matching the official template.
- Support nil returns.

---

## User Stories

- As a shop owner, I upload my supplier invoices, and the system aggregates all GST paid.
- As a retailer, I export my POS sales and the system calculates output tax.
- As an accountant, I review the GST summary and export the return for submission.

---

## Workflow
Tax Period (month/quarter)
│
▼
Collect all purchase invoices within period
│
▼
Collect all sales invoices within period
│
▼
Apply adjustments (credit notes, etc.)
│
▼
Calculate:

Total taxable sales (by rate)

Total GST collected (output)

Total GST paid (input)

Net GST payable
│
▼
Generate Input Tax Statement
│
▼
Generate Output Tax Statement
│
▼
Generate MIRA 205/206 Excel export


---

## Validation Rules

1. Every purchase invoice must have a valid supplier TIN (if GST was charged).
2. Tax invoice number must be unique per supplier.
3. Total GST must match (taxable amount × rate) within a tolerance (e.g., 0.01 MVR).
4. Input tax can only be claimed if invoice is approved and within the tax period.
5. Output tax must be declared in the period when the supply occurred (cash or accrual basis? – choose accrual for simplicity).

---

## Database

**Table: gst_periods**
- `id`, `business_id`, `start_date`, `end_date`, `status` (draft, submitted, filed), `total_output_tax`, `total_input_tax`, `net_payable`

**Table: purchase_invoices** (each has `gst_period_id`)
- `id`, `business_id`, `supplier_id`, `invoice_number`, `date`, `taxable_amount`, `gst_rate`, `gst_amount`, `input_tax_claimed` (boolean)

**Table: sales_invoices** (each has `gst_period_id`)
- similar structure.

**Table: adjustments** (credit/debit notes, bad debts)
- `id`, `period_id`, `type`, `amount`, `gst_effect`

---

## UI

- A **GST Dashboard** showing current period status, tax liability.
- A **Period Manager** to create/open periods.
- A **Review page** that lists all invoices in the period with totals.
- **Export** button to generate the MIRA Excel file.

---

## Future Enhancements

- Auto‑matching of input tax with supplier invoices from e‑Invoices.
- Direct API submission to MIRA.
- GST reconciliation with bank statements.

---

## Open Questions

- [ ] Should we support both cash and accrual basis? Start with accrual.
- [ ] How to handle foreign currency invoices? Store in MVR using exchange rate at invoice date.
- [ ] Should adjustments be entered manually or can they be automatically linked to credit notes?