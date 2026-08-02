# GST Filing Workflow

## Purpose
Define the step-by-step process for preparing and filing a GST return.

---

## Steps

1. **Open Period** – user selects a new period
2. **Import Purchases** – upload invoices; OCR extracts data; user reviews
3. **Import Sales** – manual entry or import POS CSV
4. **Review & Adjust** – apply credit notes, corrections
5. **Generate Statements** – Input Tax Statement[reference:44]and Output Tax Statement[reference:45]
6. **Export** – download MIRA 205/206 Excel[reference:46][reference:47]
7. **Submit** – user submits to MIRA via MIRAconnect[reference:48]and marks as "filed"

---

## User Stories

- As a user, I want to be guided through each step
- As an accountant, I want to review before filing

---

## Validation Rules

- All invoices must be approved before export
- Totals must match formulas

---

## Future Enhancements

- Direct API submission to MIRA
- Auto-filing on due date