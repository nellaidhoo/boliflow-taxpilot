# Database Relationships

## Purpose
Define all relationships between entities.

---

## One-to-Many

- `users` → `businesses` (one user, many businesses)
- `businesses` → `tax_periods` (one business, many periods)
- `businesses` → `suppliers` (one business, many suppliers)
- `businesses` → `customers` (one business, many customers)
- `tax_periods` → `purchase_invoices` (one period, many invoices)
- `tax_periods` → `sales_invoices` (one period, many invoices)
- `tax_periods` → `adjustments` (one period, many adjustments)
- `suppliers` → `purchase_invoices` (one supplier, many invoices)
- `customers` → `sales_invoices` (one customer, many invoices)

## Many-to-One

- `purchase_invoices` → `suppliers`
- `sales_invoices` → `customers`
- `purchase_invoices` → `tax_periods`
- `sales_invoices` → `tax_periods`
- `documents` → `invoices`

## One-to-One

- `businesses` → `gst_profile` (optional)