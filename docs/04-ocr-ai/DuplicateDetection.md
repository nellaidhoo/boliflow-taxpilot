# Duplicate Detection

## Purpose
Prevent duplicate invoice entry.

---

## Detection Logic

- Same supplier + same invoice number + same date
- Same supplier + same total amount + same date
- Fuzzy match on supplier + approximate total

---

## Action

- Warn user if potential duplicate found
- Allow override if not actually duplicate