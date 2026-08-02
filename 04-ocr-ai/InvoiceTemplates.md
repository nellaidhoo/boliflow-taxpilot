# Invoice Templates

## Purpose
Learn and store invoice templates for recurring suppliers.

---

## Requirements

- Detect invoice layout patterns
- Store field positions for known suppliers
- Improve extraction accuracy over time

---

## Database

**Table: invoice_templates**
- `id`, `supplier_id`
- `template_name`, `layout` (JSON)
- `field_mappings` (JSON)
- `confidence` (decimal)