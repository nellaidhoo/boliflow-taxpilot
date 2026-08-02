# Income Tax Module

## Purpose

Calculate taxable profit and prepare the MIRA 604 Income Tax Return.

---

## Background

Income tax is levied on business profits (companies) or total income (individuals). The rate for companies (non‑banks) is 0% on first MVR 500,000 and 15% above that.

Filing is annual, due 30 June of the following year.

The return requires financial data: revenue, expenses, adjustments, and assets/liabilities.

---

## Business Requirements

- Allow user to enter annual revenue and expenses (or import from accounting).
- Apply tax adjustments (e.g., non‑deductible expenses, depreciation).
- Calculate taxable income.
- Determine tax payable.
- Generate MIRA 604 data set.
- Support auditor's report if income > MVR 10 million.

---

## User Stories

- As a business owner, I enter my yearly income and expenses, and the system computes my income tax.
- As an accountant, I adjust for depreciation and non‑deductible items.

---

## Workflow

See main research: similar to GST but annual.

---

## Database

- `income_tax_returns` table with fields for revenue, expenses, adjustments, taxable income, tax due.
- Integration with general ledger data (future).

---

## Open Questions

- [ ] How to handle sole proprietors vs companies (different rules)?
- [ ] Should we allow direct import from accounting software?
- [ ] What is the exact list of non‑deductible expenses under Maldives law?