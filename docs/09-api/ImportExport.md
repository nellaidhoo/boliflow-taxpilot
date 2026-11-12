# Import/Export API

## Purpose
Import and export data in various formats.

---

## Export Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/periods/{id}/export/gst-excel` | Export MIRA 205 Excel |
| GET | `/periods/{id}/export/gst-pdf` | Export MIRA 205 PDF |
| GET | `/income-tax/{id}/export/excel` | Export MIRA 604 Excel |

---

## Import Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/periods/{id}/import/purchases` | Import purchase invoices (CSV) |
| POST | `/periods/{id}/import/sales` | Import sales (CSV) |
| POST | `/periods/{id}/import/pos` | Import POS data |

---

## Formats

- Excel (.xlsx)
- CSV
- PDF (export only)