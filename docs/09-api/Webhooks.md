# Webhooks

## Purpose
Send real-time notifications for events.

---

## Events

- `invoice.uploaded` – invoice uploaded
- `invoice.processed` – OCR completed
- `invoice.approved` – invoice approved
- `period.opened` – tax period opened
- `period.filed` – tax period filed
- `gst.exported` – GST return exported

---

## Webhook Payload

```json
{
  "event": "invoice.processed",
  "timestamp": "2026-07-31T12:00:00Z",
  "data": {
    "invoice_id": "uuid",
    "status": "processed",
    "confidence": 0.95
  }
}