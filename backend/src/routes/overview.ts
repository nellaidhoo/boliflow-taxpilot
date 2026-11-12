import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { prisma } from "../db.js";
import { getOrCreateUser } from "../users.js";

const paramsSchema = z.object({ businessId: z.uuid() });
const rangeSchema = z.object({ startDate: z.string(), endDate: z.string() });

export async function overviewRoutes(app: FastifyInstance) {
  app.get<{ Params: z.infer<typeof paramsSchema>; Querystring: z.infer<typeof rangeSchema> }>(
    "/v1/businesses/:businessId/period-summary",
    { preHandler: authenticate },
    async (request) => {
      const { businessId } = paramsSchema.parse(request.params);
      const { startDate, endDate } = rangeSchema.parse(request.query);
      const start = parseDateOnly(startDate);
      const end = parseDateOnly(endDate);
      if (!start || !end || start > end) throw Object.assign(new Error("Enter a valid date range"), { statusCode: 400 });
      const user = await getOrCreateUser(request.identity!);
      const membership = await prisma.businessMembership.findUnique({ where: { businessId_userId: { businessId, userId: user.id } } });
      if (!membership) throw Object.assign(new Error("Business not found"), { statusCode: 404 });

      const [purchases, sales, statuses] = await Promise.all([
        prisma.purchaseInvoice.findMany({
          where: { businessId, status: "APPROVED", invoiceDate: { gte: start, lte: end } },
          include: { taxLines: true },
          take: 2000,
        }),
        prisma.sale.findMany({
          where: { businessId, saleDate: { gte: start, lte: end } },
          include: { taxLines: true },
          take: 2000,
        }),
        prisma.purchaseInvoice.groupBy({ by: ["status"], where: { businessId }, _count: { _all: true } }),
      ]);
      const inputTax = purchases.reduce((sum, purchase) => sum + purchase.taxLines.reduce((tax, line) => tax + line.gstAmount.toNumber(), 0), 0);
      const outputTax = sales.reduce((sum, sale) => sum + sale.taxLines.reduce((tax, line) => tax + line.gstAmount.toNumber(), 0), 0);
      const netSales = sales.reduce((sum, sale) => sum + sale.taxLines.reduce((amount, line) => amount + line.taxableAmount.toNumber(), 0) + sale.zeroRatedAmount.toNumber() + sale.exemptAmount.toNumber(), 0);
      const statusCounts = Object.fromEntries(statuses.map((status) => [status.status.toLowerCase(), status._count._all]));
      return {
        approvedCount: purchases.length,
        inputTax: roundMvr(inputTax),
        salesCount: sales.length,
        outputTax: roundMvr(outputTax),
        netSales: roundMvr(netSales),
        statusCounts,
      };
    },
  );
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day ? date : null;
}
function roundMvr(value: number) { return Math.round(value * 100) / 100; }
