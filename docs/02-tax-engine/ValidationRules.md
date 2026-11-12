# GST Validation Rules

## Purpose
List all business rules that ensure data quality before filing.

---

## Rules

1. **Invoice Date** – must be within the tax period
2. **GST Calculation** – GST amount = taxable amount × rate (within 0.01 tolerance)
3. **Supplier TIN** – must be 10 characters if GST was charged
4. **Duplicate Detection** – no duplicate invoice numbers per supplier
5. **Input Tax Claim** – cannot claim without a valid tax invoice
6. **Output Tax** – must match total sales × rate
7. **Time of Supply** – earlier of invoice date or payment date[reference:49]
8. **Nil Returns** – must file even with no activity[reference:50]
9. **Currency** – general sector in MVR, tourism sector in USD[reference:51]
10. **Signatory** – must be signed by legal owner or authorized signatory[reference:52]

## Implementation
Rules enforced at save time and during final review.

---

## Open Questions

- [ ] Should we allow manual override of validation errors?
- [ ] What tolerance for GST calculation rounding?