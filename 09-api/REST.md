# REST API

## Purpose
Define the REST API endpoints.

---

## Base URL

`https://api.taxpilot.boliflow.com/v1`

---

## Authentication

- JWT tokens
- Bearer token in `Authorization` header

---

## Endpoints

### Businesses

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/businesses` | Create business |
| GET | `/businesses` | List businesses |
| GET | `/businesses/{id}` | Get business |
| PUT | `/businesses/{id}` | Update business |

### Tax Periods

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/businesses/{id}/periods` | Create period |
| GET | `/businesses/{id}/periods` | List periods |
| GET | `/periods/{id}` | Get period |
| PUT | `/periods/{id}` | Update period |

### Purchase Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/periods/{id}/purchases` | Upload invoice |
| GET | `/periods/{id}/purchases` | List invoices |
| GET | `/purchases/{id}` | Get invoice |
| PUT | `/purchases/{id}` | Update invoice |
| DELETE | `/purchases/{id}` | Delete invoice |

### Sales Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/periods/{id}/sales` | Create sales invoice |
| GET | `/periods/{id}/sales` | List sales |
| GET | `/sales/{id}` | Get sales invoice |
| PUT | `/sales/{id}` | Update sales invoice |

### GST

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/periods/{id}/gst/summary` | Get GST summary |
| GET | `/periods/{id}/gst/input-statement` | Get Input Tax Statement |
| GET | `/periods/{id}/gst/output-statement` | Get Output Tax Statement |
| POST | `/periods/{id}/gst/export` | Export MIRA 205/206 |

### Income Tax

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/businesses/{id}/income-tax` | Create return |
| GET | `/businesses/{id}/income-tax` | Get return |
| PUT | `/income-tax/{id}` | Update return |
| POST | `/income-tax/{id}/export` | Export MIRA 604 |

### Suppliers

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/businesses/{id}/suppliers` | Create supplier |
| GET | `/businesses/{id}/suppliers` | List suppliers |
| GET | `/suppliers/{id}` | Get supplier |
| PUT | `/suppliers/{id}` | Update supplier |

### OCR

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ocr/process` | Process invoice image |
| GET | `/ocr/{id}/status` | Get OCR status |
| GET | `/ocr/{id}/result` | Get OCR result |