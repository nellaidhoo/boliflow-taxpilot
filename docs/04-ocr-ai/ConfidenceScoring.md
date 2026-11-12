# Confidence Scoring

## Purpose
Assign confidence scores to extracted fields.

---

## Scoring Criteria

- **Text clarity**: OCR quality
- **Field presence**: field found in expected location
- **Data validity**: TIN format, date format, GST calculation
- **Historical accuracy**: template match

---

## Thresholds

- **> 90%**: Auto-approve
- **70-90%**: Flag for review
- **< 70%**: Require manual entry