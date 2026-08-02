# Supplier Recognition

## Purpose
Automatically recognise suppliers from invoice data.

---

## Requirements

- Match extracted supplier name to existing supplier database
- Suggest new supplier creation if not found
- Learn from user corrections

---

## Matching Logic

1. Exact match on TIN
2. Fuzzy match on name
3. Partial match on name + address

---

## Open Questions

- [ ] Should we share supplier data across tenants?
- [ ] How to handle name variations?