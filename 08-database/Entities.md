# Database Entities

## Purpose
Detailed entity definitions.

---

## Users

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | text | Unique, login |
| password_hash | text | Hashed password |
| name | text | Full name |
| role | enum | owner, accountant |
| created_at | timestamp | |
| updated_at | timestamp | |

## Businesses

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to users |
| name | text | Business name |
| tin | text | 10 chars, unique |
| gst_reg_no | text | Optional |
| sector | enum | general, tourism |
| filing_frequency | enum | monthly, quarterly |
| tax_period_start_month | int | 1-12 |
| address | text | |
| phone | text | |
| email | text | |

## Tax Periods

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| business_id | UUID | FK |
| period_type | enum | monthly, quarterly |
| start_date | date | |
| end_date | date | |
| status | enum | draft, in_progress, reviewed, filed |
| filed_date | date | |
| filing_reference | text | |

## Purchase Invoices

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| business_id | UUID | FK |
| supplier_id | UUID | FK |
| gst_period_id | UUID | FK |
| invoice_number | text | |
| invoice_date | date | |
| taxable_amount | decimal | |
| gst_rate | decimal | 8.0 or 17.0 |
| gst_amount | decimal | |
| total_amount | decimal | |
| currency | enum | MVR, USD |
| document_url | text | |
| ocr_confidence | decimal | |
| status | enum | draft, reviewed, approved, rejected |
| input_tax_claimed | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Sales Invoices

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| business_id | UUID | FK |
| customer_id | UUID | FK (optional) |
| gst_period_id | UUID | FK |
| invoice_number | text | |
| invoice_date | date | |
| taxable_amount | decimal | |
| gst_rate | decimal | 8.0 or 17.0 |
| gst_amount | decimal | |
| total_amount | decimal | |
| customer_type | enum | registered, walk-in |
| source | enum | manual, pos_import |

## Adjustments

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| period_id | UUID | FK |
| type | enum | credit_note, debit_note, bad_debt |
| amount | decimal | |
| gst_effect | decimal | Positive or negative |
| description | text | |
| date | date | |

## Income Tax Returns

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| business_id | UUID | FK |
| tax_year | int | |
| total_revenue | decimal | |
| total_expenses | decimal | |
| accounting_profit | decimal | |
| tax_adjustments | JSON | |
| taxable_income | decimal | |
| tax_due | decimal | |
| status | enum | draft, submitted, filed |
| auditor_report_required | boolean | |