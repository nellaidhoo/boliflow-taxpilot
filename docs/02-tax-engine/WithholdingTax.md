# Withholding Tax Module

## Purpose

Manage withholding tax obligations on payments to non-residents and certain local transactions.

---

## Background

Withholding tax (WHT) applies to payments made to non-residents for services, interest, royalties, etc.[reference:41]

**Filing Requirement**[reference:42]:
- Not required to file WHT return unless making a payment listed in Section 55 of the Income Tax Act to a non-resident in a particular month
- Relief may be available through Double Taxation Avoidance Agreements (DTAA)

---

## Business Requirements

- Track payments subject to withholding
- Calculate withholding tax at applicable rates
- Generate withholding tax certificates
- Track DTAA relief where applicable

---

## User Stories

- As a business, I want to know when I need to withhold tax on payments
- As an accountant, I want to generate withholding tax certificates

---

## Validation Rules

- WHT applies only to payments listed in Section 55
- DTAA relief must be documented

---

## Database

**Table: withholding_tax_transactions**
- `id`, `business_id`, `payment_date`, `recipient_type` (resident/non-resident)
- `payment_type`, `amount`, `wht_rate`, `wht_amount`, `dtaa_applied`

---

## Open Questions

- [ ] What are the current WHT rates for each payment type?
- [ ] Which DTAA agreements are in force?