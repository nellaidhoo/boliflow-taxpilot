# TaxPilot by BoliFlow

> Intelligent tax preparation for Maldives businesses.
> *From Invoice to Tax Return.*

---

## Status

🚧 **Planning Phase (Pre-MVP)**

This repository contains the complete product specification, research, workflows, implementation plans, and technical documentation for TaxPilot.

No production code should be written until the MVP specification is finalised.

---

## Vision

Businesses in the Maldives spend significant time preparing tax returns manually. TaxPilot eliminates repetitive data entry by creating a **single source of truth** for business tax data.

As MIRA transitions toward e-Invoicing[reference:0], TaxPilot will evolve into an invoice hub capable of receiving, validating, storing, and processing invoices from multiple sources.

---

## Problem Statement

Current tax preparation involves:
- Manual entry of supplier invoices
- Manual preparation of Input Tax Statements and Output Tax Statements[reference:1][reference:2]
- Excel spreadsheets shared between staff
- Duplicate invoice entry
- Human calculation errors
- Time-consuming review before submission

---

## Product Philosophy

1. **Enter Data Once** – every invoice, supplier, customer entered only once
2. **Tax Forms are Outputs** – generated automatically from validated data
3. **Automation First** – extract, match, validate before human input
4. **Audit Everything** – every action traceable
5. **Design for Change** – tax rules isolated from business data

---

## Product Scope

TaxPilot focuses on tax compliance and document processing:
- Supplier & Customer Management
- Purchase / Sales Invoice Processing
- OCR & AI Data Extraction
- GST Preparation (MIRA 205/206)[reference:3][reference:4]
- Income Tax Preparation (MIRA 604)[reference:5]
- MIRA Export (Excel, PDF, future API)
- Future e-Invoicing Integration[reference:6]

---

## Target Users (MVP)

- Retail Shops
- Wholesalers
- Small Businesses
- Service Providers
- Accountants & Bookkeepers

---

## Guiding Architecture (Business Data Layer)
Documents
┌───────────────────┐
│ Camera, PDF, Email │
│ Excel, POS, API │
└────────┬──────────┘
▼
Invoice Processing Engine
▼
Business Data Layer
┌────────┴────────┐
▼ ▼
GST Engine Income Tax Engine
▼ ▼
MIRA Export Layer

---

## Development Methodology

1. **Research** – understand regulations, document workflows
2. **Specification** – define requirements, workflows, database
3. **Implementation** – develop MVP, validate, test
4. **Expansion** – Income Tax, e-Invoicing, integrations

---

## Success Criteria (MVP)

A small retail business can:
- Upload purchase invoices (PDF/image)
- Upload sales (from POS or manual entry)
- Automatically generate Input Tax Statement and Output Tax Statement
- Review validation issues
- Export MIRA-compatible GST return (MIRA 205)

**Without** manually typing every invoice.

---

**Version:** Draft 0.1
**Status:** Under Review