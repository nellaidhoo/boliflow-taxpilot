# Audit Log

## Purpose
Track all important actions for compliance.

---

## Requirements

- Log every user action
- Include: user, action, timestamp, details
- Cannot be deleted or modified
- Retain for at least 12 months[reference:74]

---

## Events to Log

- User login/logout
- Invoice uploaded
- OCR processed
- Field corrected
- Invoice approved
- GST period opened/closed
- GST return exported
- Income Tax return exported

---

## Database

**Table: audit_logs**
- `id`, `business_id`, `user_id`
- `action` (text), `entity_type` (text), `entity_id` (UUID)
- `details` (JSON), `ip_address` (text)
- `created_at` (timestamp)