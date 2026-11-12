# Tax Calculations

## Purpose
Define formulas for GST and Income Tax.

---

## GST Calculation
Output GST = sum(GST collected on all sales at 8% or 17%)
Input GST = sum(GST paid on all purchases)
Adjustments = credit notes (+/-), debit notes (+/-), bad debts
Net GST payable = Output GST + Adjustments - Input GST


**Rates**[reference:53][reference:54]:
- General: 8%
- Tourism: 17% (from 1 July 2025)

**Input Tax Statement**[reference:55]:
- Single statement for all taxable activities under the TIN
- Figures in the currency of the GST return

**Output Tax Statement**[reference:56]:
- Separate statement for each taxable activity
- Include all tax invoices issued to other GST registered persons

---

## Income Tax Calculation
Accounting Profit = Total Revenue - Total Expenses
Taxable Income = Accounting Profit + Non-deductible Add-backs - Depreciation - Allowable Deductions
Tax Payable:

First MVR 500,000: 0%

Above MVR 500,000: 15%


**Company Tax Rates**[reference:57]:
- 0% on first MVR 500,000
- 15% on amount above MVR 500,000

---

## Open Questions

- [ ] How to handle partial input tax recovery?
- [ ] What are the exact depreciation rules?
- [ ] What are non-deductible expenses under Maldives law?