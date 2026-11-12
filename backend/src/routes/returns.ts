import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { prisma } from "../db.js";
import { getOrCreateUser } from "../users.js";

const rates = [8, 17] as const;
const inputRateColumns = [6, 8, 12, 16, 17] as const;
const paramsSchema = z.object({ businessId: z.uuid() });
const rangeSchema = z.object({ startDate: z.string(), endDate: z.string() });
const tinPattern = /^\d{7}GST\d{3}$/i;
type SupplyValues = { valueByRate: Record<number, number>; zeroRated: number; exempt: number; outOfScope: number };

export async function returnRoutes(app: FastifyInstance) {
  app.get<{ Params: z.infer<typeof paramsSchema>; Querystring: z.infer<typeof rangeSchema> }>(
    "/v1/businesses/:businessId/returns",
    { preHandler: authenticate },
    async (request) => {
      const { businessId } = paramsSchema.parse(request.params);
      const { startDate, endDate } = rangeSchema.parse(request.query);
      const start = parseDateOnly(startDate);
      const end = parseDateOnly(endDate);
      if (!start || !end || start > end) throw httpError(400, "Enter a valid date range");
      const user = await getOrCreateUser(request.identity!);
      const membership = await prisma.businessMembership.findUnique({ where: { businessId_userId: { businessId, userId: user.id } } });
      if (!membership) throw httpError(404, "Business not found");
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business) throw httpError(404, "Business not found");
      const [purchases, pending, sales] = await Promise.all([
        prisma.purchaseInvoice.findMany({ where: { businessId, status: "APPROVED", invoiceDate: { gte: start, lte: end } }, include: { taxLines: true }, take: 2000 }),
        prisma.purchaseInvoice.count({ where: { businessId, status: { in: ["NEEDS_REVIEW", "PROCESSING"] }, invoiceDate: { gte: start, lte: end } } }),
        prisma.sale.findMany({ where: { businessId, saleDate: { gte: start, lte: end } }, include: { taxLines: true }, take: 2000 }),
      ]);
      const result = buildReturn(purchases, sales);
      if (pending > 0) result.issues.unshift({ level: "error", message: `${pending} purchase invoice${pending === 1 ? " is" : "s are"} dated in this period but not approved. They are not included.` });
      if (purchases.length === 0 && sales.length === 0) result.issues.push({ level: "info", message: "No approved purchases or sales in this period yet." });
      return { ...result, business: { id: business.id, name: business.name, tin: business.tin, sector: business.sector.toLowerCase() } };
    },
  );
}

function emptyRates(list: readonly number[]) { return Object.fromEntries(list.map((rate) => [rate, 0])) as Record<number, number>; }
function emptySupplies(): SupplyValues { return { valueByRate: emptyRates(rates), zeroRated: 0, exempt: 0, outOfScope: 0 }; }
function addSale(target: SupplyValues, sale: { taxLines: { rate: number; taxableAmount: number }[]; zeroRatedAmount: number; exemptAmount: number }) {
  for (const line of sale.taxLines) target.valueByRate[line.rate] = roundMvr((target.valueByRate[line.rate] ?? 0) + line.taxableAmount);
  target.zeroRated = roundMvr(target.zeroRated + sale.zeroRatedAmount);
  target.exempt = roundMvr(target.exempt + sale.exemptAmount);
}

function buildReturn(purchases: Awaited<ReturnType<typeof prisma.purchaseInvoice.findMany<{ include: { taxLines: true } }>>>, sales: Awaited<ReturnType<typeof prisma.sale.findMany<{ include: { taxLines: true } }>>>) {
  const issues: { level: "error" | "warning" | "info"; message: string }[] = [];
  const inputRows: { serial: number; purchaseId: string; supplierTin: string; supplierName: string; invoiceNumber: string; invoiceDate: string; totalExclGst: number; gstByRate: Record<number, number> }[] = [];
  let missingTin = 0;
  let duplicates = 0;
  const seen = new Set<string>();
  const sortedPurchases = [...purchases].sort((a, b) => (a.invoiceDate?.getTime() ?? 0) - (b.invoiceDate?.getTime() ?? 0));
  let skippedNoGst = 0;
  for (const purchase of sortedPurchases) {
    const taxable = purchase.taxLines.reduce((sum, line) => sum + line.taxableAmount.toNumber(), 0);
    const gst = purchase.taxLines.reduce((sum, line) => sum + line.gstAmount.toNumber(), 0);
    if (gst <= 0) { skippedNoGst++; continue; }
    const tin = purchase.supplierTin?.toUpperCase() ?? "";
    if (!tinPattern.test(tin)) missingTin++;
    const key = `${tin}|${purchase.invoiceNumber.trim().toUpperCase()}`;
    if (seen.has(key)) duplicates++;
    seen.add(key);
    const gstByRate = emptyRates(inputRateColumns);
    for (const line of purchase.taxLines) {
      const rate = line.rate.toNumber();
      gstByRate[rate] = roundMvr((gstByRate[rate] ?? 0) + line.gstAmount.toNumber());
    }
    inputRows.push({ serial: inputRows.length + 1, purchaseId: purchase.id, supplierTin: tin, supplierName: purchase.supplierName ?? "", invoiceNumber: purchase.invoiceNumber, invoiceDate: purchase.invoiceDate?.toISOString().slice(0, 10) ?? "", totalExclGst: roundMvr(taxable), gstByRate });
  }
  if (missingTin) issues.push({ level: "warning", message: `${missingTin} purchase invoice${missingTin === 1 ? " has" : "s have"} a missing or invalid supplier TIN.` });
  if (duplicates) issues.push({ level: "warning", message: `${duplicates} purchase invoice${duplicates === 1 ? " appears" : "s appear"} more than once for the same supplier and invoice number.` });
  if (skippedNoGst) issues.push({ level: "info", message: `${skippedNoGst} approved purchase invoice${skippedNoGst === 1 ? " with" : "s with"} no GST are omitted from the input statement.` });

  const otherTransactions = emptySupplies();
  const taxInvoiceRows: (SupplyValues & { saleId: string; customerTin: string; customerName: string; invoiceNumber: string; invoiceDate: string })[] = [];
  let badCustomerTin = 0;
  for (const sale of [...sales].sort((a, b) => a.saleDate.getTime() - b.saleDate.getTime())) {
    const tin = sale.customerTin?.toUpperCase() ?? "";
    if (tin && tinPattern.test(tin)) {
      const row = { ...emptySupplies(), saleId: sale.id, customerTin: tin, customerName: sale.customerName ?? "", invoiceNumber: sale.reference, invoiceDate: sale.saleDate.toISOString().slice(0, 10) };
      addSale(row, { taxLines: sale.taxLines.map((line) => ({ rate: line.rate.toNumber(), taxableAmount: line.taxableAmount.toNumber() })), zeroRatedAmount: sale.zeroRatedAmount.toNumber(), exemptAmount: sale.exemptAmount.toNumber() });
      taxInvoiceRows.push(row);
    } else {
      if (tin) badCustomerTin++;
      addSale(otherTransactions, { taxLines: sale.taxLines.map((line) => ({ rate: line.rate.toNumber(), taxableAmount: line.taxableAmount.toNumber() })), zeroRatedAmount: sale.zeroRatedAmount.toNumber(), exemptAmount: sale.exemptAmount.toNumber() });
    }
  }
  if (badCustomerTin) issues.push({ level: "warning", message: `${badCustomerTin} sale${badCustomerTin === 1 ? " has" : "s have"} an invalid customer TIN and are reported under other transactions.` });

  const standardRatedByRate = rates.map((rate) => {
    let value = 0; let gst = 0;
    for (const sale of sales) for (const line of sale.taxLines) if (line.rate.toNumber() === rate) { value += line.taxableAmount.toNumber(); gst += line.gstAmount.toNumber(); }
    return { rate, value: roundMvr(value), gst: roundMvr(gst) };
  });
  const zeroRated = roundMvr(sales.reduce((sum, sale) => sum + sale.zeroRatedAmount.toNumber(), 0));
  const exempt = roundMvr(sales.reduce((sum, sale) => sum + sale.exemptAmount.toNumber(), 0));
  const outputTax = roundMvr(standardRatedByRate.reduce((sum, line) => sum + line.gst, 0));
  const inputTax = roundMvr(inputRows.reduce((sum, row) => sum + Object.values(row.gstByRate).reduce((total, amount) => total + amount, 0), 0));
  const totalSupplies = roundMvr(standardRatedByRate.reduce((sum, line) => sum + line.value, 0) + zeroRated + exempt);
  return {
    inputRows, taxInvoiceRows, otherTransactions, issues,
    summary: { standardRatedByRate, zeroRated, exempt, totalSupplies, outputTax, inputTax, netGst: roundMvr(outputTax - inputTax) },
  };
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day ? date : null;
}
function roundMvr(value: number) { return Math.round(value * 100) / 100; }
function httpError(statusCode: number, message: string) { return Object.assign(new Error(message), { statusCode }); }
