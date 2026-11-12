# Tax Policy and Product Gap Analysis

**Reviewed:** 8 November 2026  
**Product reviewed:** BoliFlow TaxPilot prototype  
**Scope:** Maldives GST preparation and exports, with material 2026 MIRA tax updates outside GST noted separately. This is a product and control review, not tax advice or a determination of any taxpayer's liability.

## Executive summary

The prototype has a useful capture-and-review foundation, and its headline rates for ordinary domestic GST activity are current: 8% general GST and 17% tourism GST. However, it is not yet safe to present its return calculations or downloads as filing-ready.

The most urgent change is the 2026 eighth amendment to the Goods and Services Tax Act and the 32nd amendment to its Regulation. Since 1 October 2026, certain inbound tourism products and related booking/agency services supplied by non-residents without a fixed place of business in Maldives are within tourism GST at 17%, with a separate MIRA 211 return and no input-tax set-off for that supplier category. The app only models domestic “general” and “tourism” businesses and always labels its workbook MIRA 205. It cannot model or calculate this new treatment. From 1 January 2027, MIRAconnect return filing and payment become mandatory for all GST registered or required-to-register persons, subject to the regulation's stated exception/alternate-means mechanism.

The immediate release decision should be: keep the app positioned as a draft bookkeeping and GST-preparation prototype until rules, return form routing, input-tax eligibility, filing-period authority, adjustments, output/input statements and generated files have been validated against MIRA's current prescribed forms and independent worked examples.

## MIRA policy updates relevant as of 8 November 2026

| Update | Effective date / policy | Product consequence |
|---|---|---|
| Eighth amendment to the GSTA (Law 10/2026) | From 1 October 2026, section 15(a)(6) brings inbound tourism products and agency/booking services for them supplied by a person without a fixed place of business in Maldives into tourism GST at 17%. The Act defines relevant place-of-supply and value rules; for monetary consideration, the value calculation reduces consideration by amounts payable to a registered person in relation to the product. Input tax cannot be set off for this class of supplier. [MIRA consolidated GSTA](https://www.mira.gov.mv/Legislations/View/Goods-And-Services-Act-consolidated) · [MIRA circular](https://www.mira.gov.mv/ContentItems/View/circular-inbound-tourism-product) | Add a distinct overseas/nonresident supplier profile and decision flow, effective-dated scope, gross/net consideration components and a rule preventing input-tax claim in this category. Do not infer applicability from a domestic tourism-sector selector. |
| 32nd amendment to the GSTR (2026/R-82) | MIRA 205 applies to section 16 general activities; MIRA 206 applies to section 15 tourism activities; new section 15(a)(6) suppliers file MIRA 211. MIRAconnect filing/payment is mandatory for all registered and required-to-register GST taxpayers from 1 January 2027; the section 15(a)(6) category was brought in from 1 October 2026. [MIRA consolidated GSTR](https://mira.gov.mv/Legislations/View/Goods-and-Services-Tax-Regulation-consolidated) · [MIRA amendment notice](https://www.mira.gov.mv/ContentItems/View/32nd-amendment-to-the-gstr-news) | Route exports by legal activity and form, and give users an explicit MIRAconnect filing/payment checklist before the effective date. Treat the product as preparation software unless an authorized filing integration exists. |
| Domestic GST headline rates | General activity is 8% from 1 January 2023; ordinary tourism activity is 17% from 1 July 2025. Section 15(a)(6)'s special start date is 1 October 2026. [MIRA consolidated GSTA](https://www.mira.gov.mv/Legislations/View/Goods-And-Services-Act-consolidated) | Existing `[8,17]` choices are insufficient: rates and category eligibility need transaction date and activity context. Avoid retroactively applying a current rate to old records or treating either rate as universally valid for every activity. |
| Filing frequency and periods | GSTR section 70 bases quarterly eligibility on both historical and estimated average monthly supply values below MVR 1,000,000; changing period requires MIRA 207 and written approval. The Act generally defines monthly/quarterly periods ending on Gregorian month ends. [MIRA consolidated GSTR](https://mira.gov.mv/Legislations/View/Goods-and-Services-Tax-Regulation-consolidated) · [MIRA consolidated GSTA](https://www.mira.gov.mv/Legislations/View/Goods-And-Services-Act-consolidated) | Frequency should be imported from the registration certificate/MIRA-approved state, not treated as a free app preference. Model approvals, changes and effective dates. |
| 2026 Income Tax Act second amendment (11/2026) | The amendment changes nonresident contractor withholding to 10% of gross payments, broadens the definition of covered nonresident contractor work, and addresses final-tax treatment for relevant income through a Maldives permanent establishment. [MIRA amendment text](https://mira.gov.mv/Legislations/View/2nd-amendment-to-ita) | Outside current GST scope. Add a separately scoped withholding-tax discovery item before the product claims to support all MIRA tax obligations; do not fold it into GST calculations. |
| Other current tax changes and proposals | MIRA lists a sixth Income Tax Regulation amendment (2026/R-67, 20 August 2026), a fourth Tax Administration Act amendment (15/2026, 31 August 2026), and October 2026 tax amendment bills still at committee stage. [MIRA Income Tax Regulation listing](https://www.mira.gov.mv/Legislations/Categories/33) · [MIRA tax bills](https://www.mira.gov.mv/Pages/View/taxbills) | Maintain a change-monitoring process and distinguish enacted/effective law from bills and drafts. Assess each update before expanding product scope. |

## Product gaps observed in the current implementation

### P0 — close before representing output as filing-ready

1. **Wrong/limited return form routing.** The API/export is hardwired to MIRA 205. The business model has only `GENERAL` and `TOURISM`; the return UI and download action both say MIRA 205. Domestic tourism users need MIRA 206, while the new nonresident category needs MIRA 211. The generated workbook is a custom workbook; it is not evidence of an approved or exact current MIRA return template.

2. **New inbound-tourism tax rules are unmodeled.** There are no fields for supplier residence, fixed place of business, product/booking/agency classification, consideration payable to registered Maldives suppliers, or the effective 1 October 2026 transition. No separate MIRA 211 tax base or rule for disallowing input-tax set-off exists. The 2026 effective date and transition rules need their own versioned policy implementation.

3. **Input GST is treated as automatically claimable.** `backend/src/routes/returns.ts` adds all GST from approved invoices to input tax. Approval status is not the same as tax eligibility. The app needs evidence and checks for valid tax invoice, purpose/business use, exempt or non-business use, apportionment where applicable, blocked/non-deductible items, credit/debit notes and the legal class of taxpayer. GSTR section 78-1 requires an Input Tax Statement when claiming and requires the original invoice for persons MIRA determines; GSTR section 84 requires holding the invoice when filing. [MIRA consolidated GSTR](https://mira.gov.mv/Legislations/View/Goods-and-Services-Tax-Regulation-consolidated)

4. **Silent truncation can understate a return.** The return endpoint fetches at most 2,000 purchases and 2,000 sales and does not warn when more records exist. Use paginated/aggregated queries and fail closed or clearly flag incomplete return data; never export a partial result as a complete return.

5. **Tax period source and deadlines are not authoritative.** Frequency is stored on Business as an enum and is selected in onboarding; the current model has no MIRA registration certificate details, assigned taxable period, approved MIRA 207 change, or effective-dated period history. The displayed due date should be derived from the current rule and verified for public holidays / officially moved deadlines, rather than being only a generic “28th” calculation.

6. **No correction and adjustment workflow.** There are no persisted credit/debit note records or links to source transactions, despite GST rules accounting for credit/debit note adjustments and prior-period amendments. Add correction, return-amendment and reopen controls with immutable before/after evidence, period attribution and reviewer approval.

### P1 — complete before a paid production launch

7. **Rate/category checks lack effective dates.** Sales and purchase line models accept rate values without a rule-set version or transaction classification. A fixed list of 8%/17% cannot express historical rates, zero-rate/exempt/out-of-scope distinctions, or special inbound tourism effective dates. Add a policy registry with `validFrom`, `validTo`, tax type, supply class, rate, place-of-supply conditions, source citation and reviewed release. Preserve the rule version used in every finalized return.

8. **Sales capture omits important supply classifications.** Sale supports standard-rated lines, zero-rated and exempt amounts but no out-of-scope amount or structured supply category. The return builder initializes `outOfScope` but never populates it; it excludes that amount from total supplies. Customer TIN presence decides tax-invoice grouping, which is not a robust representation of invoice or activity rules. Store invoice evidence, tax classification and taxable activity association explicitly.

9. **Export identifiers and mappings need authoritative verification.** `export-mira.ts` assumes the GST registration number is also the taxable activity number and hardcodes every purchase as “Revenue.” These assumptions should be checked against the current official templates and each taxpayer's registration data. Purchases need revenue/capital classification. MIRA's current 205 instructions also expect its prescribed statement structure; validate every column, rounding convention, required row and version against current 205, 206 and 211 forms before claiming compatibility.

10. **Nil returns and incomplete periods are unclear.** A blank period currently receives a neutral “no transactions” message, but no explicit nil-return state or filing checklist. Support nil returns with mandatory completeness confirmation and explain that the app's generated summary is not itself filed.

11. **Validation warnings do not prevent unsafe output.** Missing/invalid supplier TIN and duplicates are warnings, and output groups by customer TIN. Add severity rules, duplicate fingerprinting, tax arithmetic and date validation, missing source document checks, unresolved OCR/manual review state, and a hard block for policy-critical errors. Keep override reason and reviewer in the audit trail.

12. **Return period is not a persisted, locked snapshot.** `TaxPeriod` exists but calculation/export queries directly from current live invoice/sale rows. A later edit can silently change a previously reviewed workbook. Generate immutable return drafts/snapshots with source record versions, totals, policy version, form version, preparer/reviewer, export hash, dates and status; amendments should create a new version.

13. **Export and portal workflow needs a 2027 readiness path.** The product currently downloads a browser-built XLSX and has no MIRAconnect integration or submission status. Until an approved integration exists, provide a reviewed “prepare → download → file in MIRAconnect → enter receipt/reference → reconcile payment” workflow. Do not imply that download equals filing. MIRAconnect is mandatory for all GST taxpayers from 1 January 2027 under the amended regulation.

14. **Business/legal profile is too small for compliance decisions.** Business stores a single TIN, sector and frequency. Add MIRA registration identifiers and certificates, taxable activity numbers, registration/effective dates, establishment/residency attributes where applicable, multiple activities/sectors, status and evidence. Avoid overloading TIN to act as activity number.

### P2 — operational maturity and product quality

15. **Rule-change operations.** Assign an owner to monitor MIRA acts, regulations, circulars, forms, FAQs and deadlines. Add an internal change log, source links, impact assessment, two-person approval, effective date, regression scenarios and customer communication. Keep not-yet-effective bills in a separate watchlist.

16. **Document and data controls.** The Prisma model holds private object keys, but production readiness should include malware scanning, file type/size limits, private storage access controls, encryption, retention/deletion policy, backups, restore drills and audit access review. Tax records need long-term retrievability and clear retention behavior; the amended GSTA includes a five-year retention obligation for the relevant records.

17. **Human review and explainability.** Show for each number the contributing transactions, classification, rate/date rule, reason it is included/excluded, and the evidence needed to clear a warning. Add role separation for preparer/reviewer and close/reopen approvals.

18. **Correct product claims.** Public product language says the app “reads” supplier invoices while the current production API flow is manual capture/review and the OCR pipeline is not a live extraction service. Either implement and validate extraction with confidence-based human review, or describe the current capability accurately.

## Recommended delivery sequence

### Before any filing-ready or paid compliance claim

- Stop labeling the current workbook “MIRA 205” as an authoritative filing form; use “draft GST working paper” until mappings are confirmed.
- Have a Maldives GST practitioner review the 2026 amendments, current 205/206/211 templates and all calculation assumptions.
- Remove silent record caps; add completeness counts and fail-closed behavior.
- Capture MIRA registration certificate details and use the assigned taxable period/activity identifiers.
- Implement form selection by activity type and clearly mark MIRA 211 support as unavailable until built and reviewed.
- Separate allowed input tax from GST appearing on supplier invoices; require evidence, eligibility reasons and review.

### Compliance foundation

- Implement effective-dated tax rules and transaction classification, including general, domestic tourism and the nonresident inbound-tourism rules.
- Add invoice/receipt evidence, credit/debit notes, corrections, nil returns, output-tax statements, activity identifiers and revenue/capital input classifications.
- Create immutable return snapshots and a 205/206/211 versioned export pipeline validated against official forms and independently calculated examples.
- Add filing-calendar and MIRAconnect/payment checklist updates for 1 January 2027; do not represent the product as filing directly unless a supported integration is in place.

### Scale and broaden scope

- Establish MIRA policy monitoring and controlled tax-rule releases.
- Add secure document operations, retention/backup/restore, audit completeness and operational support procedures.
- Evaluate the 2026 income-tax/withholding changes as a separate product module with its own requirements, domain expert review and release gates.

## Assumptions and limits

- Policy review used official MIRA consolidated legislation, regulation, announcements and tax-update pages accessible on 8 November 2026. MIRA pages label some English legal text as an unofficial translation; official Dhivehi text and professional interpretation take precedence where wording differs.
- The 2026 Tax Administration Act amendment and sixth Income Tax Regulation amendment are flagged for review but are not analyzed in detail here because the current prototype is GST-focused.
- The findings describe observable prototype behavior and compliance risks; they are not a claim that every listed product control is explicitly mandated in every taxpayer's circumstances.
- No implementation or test changes were made as part of this analysis.
