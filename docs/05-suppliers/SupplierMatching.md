# Supplier Matching

## Purpose
Match extracted supplier data to existing records.

---

## Matching Strategy

1. **TIN match** (exact) – 100% confidence
2. **Name match** (exact) – 95% confidence
3. **Name match** (fuzzy) – 70-90% confidence
4. **Name + address** – 80% confidence

---

## Action

- If match found → link invoice
- If no match → prompt user to create or select