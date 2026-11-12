# Tax Periods

## Purpose
Manage GST periods (monthly/quarterly) and track their status.

---

## Background

GST periods are calendar-based[reference:43]:
- **Monthly**: all months (if turnover > MVR 1 million/month)
- **Quarterly**: Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec

---

## Business Requirements

- Auto-create periods based on filing frequency
- Track period status: draft, in_progress, reviewed, filed
- Prevent overlapping periods
- Allow only one open period at a time

---

## User Stories

- As a user, I want to open a new period when I'm ready to file
- As an accountant, I want to see all periods and their status

---

## Validation Rules

- Periods cannot overlap
- Only one open period at a time
- Cannot modify a filed period

---

## Database

**Table: tax_periods**
- `id`, `business_id`, `type` (gst, income_tax)
- `period_type` (monthly, quarterly)
- `start_date`, `end_date`
- `status` (draft, in_progress, reviewed, filed)
- `filed_date`, `filing_reference`

---

## Open Questions

- [ ] Should periods be auto-created on business registration?
- [ ] Can a user reopen a closed period?