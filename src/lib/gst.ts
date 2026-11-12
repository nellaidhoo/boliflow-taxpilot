import type { Doc } from "@/convex/_generated/dataModel.d.ts";

// Display-only labels. Rates themselves live in the backend tax rules.
export const SECTOR_LABELS: Record<Doc<"businesses">["sector"], string> = {
  general: "General sector (8% GST)",
  tourism: "Tourism sector (17% TGST)",
};

export const FILING_PERIOD_LABELS: Record<Doc<"businesses">["filingPeriod"], string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
};

export type TaxPeriod = { label: string; start: Date; end: Date; due: Date };

/**
 * Filing period `offset` periods before the current one (0 = current, 1 = previous, ...).
 */
export function getPeriod(
  filingPeriod: Doc<"businesses">["filingPeriod"],
  offset: number,
  now: Date = new Date(),
): TaxPeriod {
  const months = filingPeriod === "monthly" ? 1 : 3;
  const shifted = new Date(now.getFullYear(), now.getMonth() - offset * months, 1);
  return getCurrentPeriod(filingPeriod, shifted);
}

/** Current filing period based on the business's filing frequency. */
export function getCurrentPeriod(
  filingPeriod: Doc<"businesses">["filingPeriod"],
  now: Date = new Date(),
): TaxPeriod {
  const year = now.getFullYear();
  const month = now.getMonth();
  const startMonth = filingPeriod === "monthly" ? month : Math.floor(month / 3) * 3;
  const length = filingPeriod === "monthly" ? 1 : 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + length, 0, 23, 59, 59);
  // MIRA GST returns are due by the 28th of the month after the period ends
  const due = new Date(year, startMonth + length, 28);
  const label =
    filingPeriod === "monthly"
      ? start.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : `Q${startMonth / 3 + 1} ${year}`;
  return { label, start, end, due };
}

export function formatMvr(amount: number): string {
  return `MVR ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
