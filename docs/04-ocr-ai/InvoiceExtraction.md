# Invoice Extraction

## Purpose
Define the fields to be extracted and the extraction logic.

## Fields
- Supplier Name
- Supplier TIN
- Invoice Number
- Invoice Date
- Total (excluding GST)
- GST Amount
- GST Rate (if available, else infer from total)

## Extraction Pipeline
1. OCR → raw text.
2. Entity recognition (regex + ML).
3. Confidence scoring.
4. Store results with metadata.

## Open Questions
- [ ] How to handle different invoice layouts?
- [ ] Should we use a fixed set of regex patterns or train a model?