# OCR API

## Purpose
Process invoices through OCR and AI.

---

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ocr/process` | Process invoice |
| GET | `/ocr/{id}/status` | Get status |
| GET | `/ocr/{id}/result` | Get result |

---

## Request

```json
POST /ocr/process
{
  "file_url": "https://...",
  "file_type": "pdf|png|jpg",
  "business_id": "uuid"
}

Response
json
{
  "job_id": "uuid",
  "status": "processing"
}
Result
json
{
  "status": "completed",
  "fields": {
    "supplier_name": {"value": "ABC Trading", "confidence": 0.95},
    "supplier_tin": {"value": "1234567890", "confidence": 0.92},
    "invoice_number": {"value": "INV-001", "confidence": 0.98},
    "invoice_date": {"value": "2026-07-15", "confidence": 0.96},
    "taxable_amount": {"value": 1000.00, "confidence": 0.97},
    "gst_amount": {"value": 80.00, "confidence": 0.95},
    "total_amount": {"value": 1080.00, "confidence": 0.96}
  }
}