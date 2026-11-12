import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { prisma } from "../db.js";
import { getOrCreateUser } from "../users.js";

const paramsSchema = z.object({ businessId: z.uuid() });
const saleParamsSchema = paramsSchema.extend({ saleId: z.uuid() });
const taxLineSchema = z.object({ rate: z.number(), taxableAmount: z.number(), gstAmount: z.number() });
const inputSchema = z.object({
  saleDate: z.string(),
  reference: z.string().trim().min(1).max(120),
  customerName: z.string().trim().max(200).optional(),
  customerTin: z.string().trim().max(13).optional(),
  description: z.string().trim().max(500).optional(),
  taxLines: z.array(taxLineSchema).max(10),
  zeroRatedAmount: z.number(),
  exemptAmount: z.number(),
});
const dateQuery = z.object({ startDate: z.string().optional(), endDate: z.string().optional() });

export async function salesRoutes(app: FastifyInstance) {
  app.get<{ Params: z.infer<typeof paramsSchema>; Querystring: z.infer<typeof dateQuery> }>(
    "/v1/businesses/:businessId/sales",
    { preHandler: authenticate },
    async (request) => {
      const { businessId } = paramsSchema.parse(request.params);
      const { startDate, endDate } = dateQuery.parse(request.query);
      const user = await getOrCreateUser(request.identity!);
      await requireMembership(businessId, user.id);
      const dateFilter = makeDateFilter(startDate, endDate);
      const rows = await prisma.sale.findMany({
        where: { businessId, ...(dateFilter ? { saleDate: dateFilter } : {}) },
        include: { taxLines: true },
        orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }],
        take: 200,
      });
      return rows.map(toSaleDto);
    },
  );

  app.get<{ Params: z.infer<typeof paramsSchema>; Querystring: { startDate: string; endDate: string } }>(
    "/v1/businesses/:businessId/sales/summary",
    { preHandler: authenticate },
    async (request) => {
      const { businessId } = paramsSchema.parse(request.params);
      const { startDate, endDate } = z.object({ startDate: z.string(), endDate: z.string() }).parse(request.query);
      const range = makeDateFilter(startDate, endDate);
      if (!range) throw httpError(400, "Enter a valid date range");
      const user = await getOrCreateUser(request.identity!);
      await requireMembership(businessId, user.id);
      const rows = await prisma.sale.findMany({ where: { businessId, saleDate: range }, include: { taxLines: true } });
      let outputTax = 0;
      let netSales = 0;
      for (const row of rows) {
        outputTax += row.taxLines.reduce((sum, line) => sum + line.gstAmount.toNumber(), 0);
        netSales += row.taxLines.reduce((sum, line) => sum + line.taxableAmount.toNumber(), 0);
        netSales += row.zeroRatedAmount.toNumber() + row.exemptAmount.toNumber();
      }
      return { count: rows.length, outputTax: roundMvr(outputTax), netSales: roundMvr(netSales) };
    },
  );

  app.post<{ Params: z.infer<typeof paramsSchema>; Body: z.input<typeof inputSchema> }>(
    "/v1/businesses/:businessId/sales",
    { preHandler: authenticate },
    async (request, reply) => {
      const { businessId } = paramsSchema.parse(request.params);
      const input = inputSchema.parse(request.body);
      const user = await getOrCreateUser(request.identity!);
      await requireEditor(businessId, user.id);
      const values = normalizeInput(input);
      const created = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
          data: {
            businessId,
            saleDate: values.saleDate,
            reference: values.reference,
            customerName: values.customerName || null,
            customerTin: values.customerTin?.toUpperCase() || null,
            description: values.description || null,
            zeroRatedAmount: values.zeroRatedAmount,
            exemptAmount: values.exemptAmount,
            taxLines: { create: values.taxLines },
          },
          include: { taxLines: true },
        });
        await tx.auditEvent.create({
          data: { businessId, actorId: user.id, actorName: actorName(user), action: "created", entity: "sale", entityId: sale.id, summary: `Added sale ${sale.reference}` },
        });
        return sale;
      });
      return reply.code(201).send(toSaleDto(created));
    },
  );

  app.put<{ Params: z.infer<typeof saleParamsSchema>; Body: z.input<typeof inputSchema> }>(
    "/v1/businesses/:businessId/sales/:saleId",
    { preHandler: authenticate },
    async (request) => {
      const { businessId, saleId } = saleParamsSchema.parse(request.params);
      const input = inputSchema.parse(request.body);
      const user = await getOrCreateUser(request.identity!);
      await requireEditor(businessId, user.id);
      const existing = await prisma.sale.findFirst({ where: { id: saleId, businessId } });
      if (!existing) throw httpError(404, "Sale not found");
      const values = normalizeInput(input);
      const updated = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.update({
          where: { id: saleId },
          data: {
            saleDate: values.saleDate,
            reference: values.reference,
            customerName: values.customerName || null,
            customerTin: values.customerTin?.toUpperCase() || null,
            description: values.description || null,
            zeroRatedAmount: values.zeroRatedAmount,
            exemptAmount: values.exemptAmount,
            taxLines: { deleteMany: {}, create: values.taxLines },
          },
          include: { taxLines: true },
        });
        await tx.auditEvent.create({
          data: { businessId, actorId: user.id, actorName: actorName(user), action: "updated", entity: "sale", entityId: saleId, summary: `Edited sale ${sale.reference}` },
        });
        return sale;
      });
      return toSaleDto(updated);
    },
  );

  app.delete<{ Params: z.infer<typeof saleParamsSchema> }>(
    "/v1/businesses/:businessId/sales/:saleId",
    { preHandler: authenticate },
    async (request, reply) => {
      const { businessId, saleId } = saleParamsSchema.parse(request.params);
      const user = await getOrCreateUser(request.identity!);
      await requireEditor(businessId, user.id);
      const existing = await prisma.sale.findFirst({ where: { id: saleId, businessId } });
      if (!existing) throw httpError(404, "Sale not found");
      await prisma.$transaction(async (tx) => {
        await tx.auditEvent.create({
          data: { businessId, actorId: user.id, actorName: actorName(user), action: "deleted", entity: "sale", entityId: saleId, summary: `Deleted sale ${existing.reference}` },
        });
        await tx.sale.delete({ where: { id: saleId } });
      });
      return reply.code(204).send();
    },
  );
}

function normalizeInput(input: z.infer<typeof inputSchema>) {
  const saleDate = parseDateOnly(input.saleDate);
  if (!saleDate) throw httpError(400, "Enter a valid sale date");
  const taxLines = input.taxLines.map((line) => ({
    rate: line.rate,
    taxableAmount: roundMvr(line.taxableAmount),
    gstAmount: roundMvr(line.gstAmount),
  }));
  if (taxLines.some((line) =>
    ![8, 17].includes(line.rate) || !Number.isFinite(line.taxableAmount) || !Number.isFinite(line.gstAmount) ||
    line.taxableAmount < 0 || line.gstAmount < 0 || line.taxableAmount > 9_999_999_999.99 || line.gstAmount > 9_999_999_999.99
  )) throw httpError(400, "One or more GST lines are invalid");
  const zeroRatedAmount = roundMvr(input.zeroRatedAmount);
  const exemptAmount = roundMvr(input.exemptAmount);
  if (![zeroRatedAmount, exemptAmount].every((amount) => Number.isFinite(amount) && amount >= 0 && amount <= 9_999_999_999.99)) {
    throw httpError(400, "Sale amounts must be finite, non-negative MVR values");
  }
  if (taxLines.length === 0 && zeroRatedAmount === 0 && exemptAmount === 0) {
    throw httpError(400, "Enter at least one sale amount");
  }
  return {
    saleDate,
    reference: input.reference,
    customerName: input.customerName?.trim(),
    customerTin: input.customerTin?.trim(),
    description: input.description?.trim(),
    taxLines,
    zeroRatedAmount,
    exemptAmount,
  };
}

function makeDateFilter(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return undefined;
  if (!startDate || !endDate) throw httpError(400, "Both dates are required for a period filter");
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end || start > end) throw httpError(400, "Enter a valid date range");
  return { gte: start, lte: end };
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day ? date : null;
}

function toSaleDto(row: {
  id: string; businessId: string; saleDate: Date; reference: string; customerName: string | null;
  customerTin: string | null; description: string | null; zeroRatedAmount: { toNumber(): number };
  exemptAmount: { toNumber(): number }; createdAt: Date; updatedAt: Date;
  taxLines: { rate: { toNumber(): number }; taxableAmount: { toNumber(): number }; gstAmount: { toNumber(): number } }[];
}) {
  return {
    id: row.id, businessId: row.businessId, saleDate: row.saleDate.toISOString().slice(0, 10),
    reference: row.reference, customerName: row.customerName, customerTin: row.customerTin,
    description: row.description,
    zeroRatedAmount: row.zeroRatedAmount.toNumber(), exemptAmount: row.exemptAmount.toNumber(),
    taxLines: row.taxLines.map((line) => ({ rate: line.rate.toNumber(), taxableAmount: line.taxableAmount.toNumber(), gstAmount: line.gstAmount.toNumber() })),
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireMembership(businessId: string, userId: string) {
  const membership = await prisma.businessMembership.findUnique({ where: { businessId_userId: { businessId, userId } } });
  if (!membership) throw httpError(404, "Business not found");
  return membership;
}
async function requireEditor(businessId: string, userId: string) {
  const membership = await requireMembership(businessId, userId);
  if (membership.role === "READ_ONLY") throw httpError(403, "You do not have permission to edit sales");
  return membership;
}
function actorName(user: { name: string; email: string }) {
  return user.name || user.email || "Business user";
}
function roundMvr(value: number) { return Math.round(value * 100) / 100; }
function httpError(statusCode: number, message: string) { return Object.assign(new Error(message), { statusCode }); }
