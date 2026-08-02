# Maldives Tax OS

> A modern tax data platform for Maldives businesses that automates invoice capture, GST preparation, tax compliance, and future MIRA e-Invoicing.

---

# Status

> 🚧 Planning Phase (Pre-MVP)

This repository contains the complete product specification, research, workflows, implementation plans, and technical documentation for Maldives Tax OS.

No production code should be written until the MVP specification has been finalized.

---

# Vision

Businesses in the Maldives spend a significant amount of time preparing tax returns by manually entering information into MIRA templates.

The goal of this platform is to eliminate repetitive data entry by creating a single source of truth for business tax data.

Instead of manually preparing GST returns every month, businesses should simply import invoices, review automatically extracted information, and generate MIRA-compliant tax returns in minutes.

As MIRA transitions toward e-Invoicing, the platform should evolve into an invoice hub capable of receiving, validating, storing, and processing invoices from multiple sources while remaining compatible with future regulatory changes.

---

# Problem Statement

Current tax preparation typically involves:

- Manual entry of hundreds of supplier invoices.
- Manual preparation of Input Tax Statements.
- Manual preparation of Output Tax Statements.
- Excel spreadsheets shared between staff.
- Repeated typing of supplier information.
- Duplicate invoice entry.
- Human calculation errors.
- Time-consuming review before submission.

The platform aims to remove these pain points through automation.

---

# Product Philosophy

The platform is built around five core principles.

## 1. Enter Data Once

Every invoice, supplier, customer, or document should only need to be entered once.

All tax returns should reuse the same data.

---

## 2. Tax Forms are Outputs

Users should never manually fill tax forms.

Instead, tax forms should be generated automatically from validated business data.

---

## 3. Automation First

Whenever possible the platform should:

- Extract
- Match
- Validate
- Categorize

before asking for human input.

Humans should review exceptions rather than perform repetitive work.

---

## 4. Audit Everything

Every important action should be traceable.

Examples include:

- Invoice imported
- OCR performed
- AI corrected
- User modified supplier
- GST generated
- Return exported

Nothing should happen without an audit trail.

---

## 5. Design for Change

Tax regulations change.

GST rates change.

MIRA forms change.

e-Invoicing will change workflows.

The platform architecture should isolate business data from tax rules to allow future regulatory updates with minimal disruption.

---

# Product Scope

The platform is not intended to become a traditional accounting system.

Instead it focuses on tax compliance and document processing.

Primary capabilities include:

- Supplier Management
- Customer Management
- Purchase Invoice Processing
- Sales Invoice Processing
- OCR
- AI Data Extraction
- GST Preparation
- Income Tax Preparation
- MIRA Export
- Future e-Invoicing Integration

---

# Target Users

The initial MVP focuses on:

- Retail Shops
- Wholesalers
- Small Businesses
- Service Providers
- Accountants
- Bookkeepers

Future versions may support larger organizations.

---

# Guiding Architecture

The platform is built around a Tax Data Layer.

```
                Documents

        Camera
        PDF
        Email
        Excel
        POS
        API
        e-Invoice

                │

                ▼

        Invoice Processing Engine

                │

                ▼

          Tax Data Layer

                │

      ┌─────────┴──────────┐

      ▼                    ▼

   GST Engine         Income Tax Engine

      ▼                    ▼

      MIRA Export Layer
```

The source of an invoice should never affect downstream tax calculations.

---

# Documentation Structure

The documentation is organized into the following domains.

- Overview
- Research
- Tax Engine
- OCR & AI
- Suppliers
- Customers
- Invoice Processing
- Workflows
- Database
- APIs
- User Interface
- Integrations
- Future Features

Each document should describe business logic before technical implementation.

---

# Development Methodology

Development will occur in four stages.

## Stage 1

Research

Understand regulations.

Document workflows.

Study MIRA forms.

---

## Stage 2

Specification

Define requirements.

Create workflows.

Design database.

Design APIs.

---

## Stage 3

Implementation

Develop the MVP.

Validate calculations.

Perform user testing.

---

## Stage 4

Expansion

Income Tax

Withholding Tax

e-Invoicing

Bank integrations

AI assistant

---

# Success Criteria

The MVP will be considered successful if a small retail business can:

- Upload purchase invoices.
- Upload sales.
- Automatically generate Input Tax Statement.
- Automatically generate Output Tax Statement.
- Review validation issues.
- Export MIRA-compatible documents.

without manually typing every invoice.

---

# Living Documentation

This documentation is intended to evolve alongside the product.

Every architectural decision, workflow, business rule, validation rule, and regulatory change should be documented before implementation.

---

# Open Questions

## Business

- [ ] Should the first release support multiple businesses under one account?
- [ ] Will accountants be first-class users in the MVP?
- [ ] Should businesses be able to invite external accountants?
- [ ] Should we support sole proprietors differently from companies?

## MIRA

- [ ] Will MIRA publish an official e-Invoicing API?
- [ ] Will MIRA provide machine-readable tax return schemas?
- [ ] Will MIRA eventually allow direct API submission of returns?

## OCR

- [ ] Which OCR engine will be the primary provider?
- [ ] Should invoices always be AI reviewed before being accepted?
- [ ] What confidence threshold should allow automatic approval?

## Supplier Knowledge Base

- [ ] Can supplier metadata be shared across all tenants?
- [ ] Which supplier information is considered public?
- [ ] Should supplier invoice templates be community-maintained?

## Security

- [ ] What retention period should be used for invoice images?
- [ ] Should OCR images be deleted after extraction?
- [ ] Should all attachments be encrypted at rest?

## Future

- [ ] Should bank reconciliation become part of the platform?
- [ ] Should inventory integrations be supported?
- [ ] Should future versions include lightweight accounting?

---

Version: Draft 0.1
Status: Under Review