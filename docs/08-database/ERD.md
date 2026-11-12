# Database ERD

## Purpose
Entity Relationship Diagram for the entire system.

---

## Core Entities
users
└── businesses
├── tax_periods
│ ├── purchase_invoices
│ ├── sales_invoices
│ ├── adjustments
│ └── gst_returns
├── suppliers
├── customers
├── income_tax_returns
└── documents


---

## Relationships

- `users` 1---* `businesses`
- `businesses` 1---* `tax_periods`
- `tax_periods` 1---* `purchase_invoices`
- `tax_periods` 1---* `sales_invoices`
- `tax_periods` 1---* `adjustments`
- `purchase_invoices` *---1 `suppliers`
- `sales_invoices` *---0..1 `customers`
- `businesses` 1---* `income_tax_returns`
- `documents` *---1 `purchase_invoices` or `sales_invoices`