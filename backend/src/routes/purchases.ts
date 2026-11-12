import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { getOrCreateUser } from "../users.js";
import { prisma } from "../db.js";
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config, hasObjectStorage } from "../config.js";

const s3 = hasObjectStorage ? new S3Client({
  region: config.S3_REGION,
  ...(config.S3_ENDPOINT ? { endpoint: config.S3_ENDPOINT } : {}),
  forcePathStyle: config.S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: config.S3_ACCESS_KEY_ID!, secretAccessKey: config.S3_SECRET_ACCESS_KEY! },
}) : null;
const uploadSchema = z.object({ fileName: z.string().trim().min(1).max(200), contentType: z.enum(["application/pdf", "image/png", "image/jpeg"]) });
const completeSchema = uploadSchema.extend({ objectKey: z.string().min(1).max(500) });

const paramsSchema = z.object({ businessId: z.uuid(), purchaseId: z.uuid() });
const listQuerySchema = z.object({
  status: z.enum(["processing", "needs_review", "approved", "failed"]).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
const reviewSchema = z.object({
  supplierName: z.string().trim().max(200),
  supplierTin: z.string().trim().max(13),
  invoiceNumber: z.string().trim().max(120),
  invoiceDate: z.string(),
  taxLines: z.array(z.object({ rate: z.number(), taxableAmount: z.number(), gstAmount: z.number() })).max(10),
  approve: z.boolean(),
});

export async function purchaseRoutes(app: FastifyInstance) {
  app.post<{ Params: { businessId: string }; Body: z.input<typeof uploadSchema> }>(
    "/v1/businesses/:businessId/purchases/upload-url",
    { preHandler: authenticate },
    async (request) => {
      if (!s3 || !config.S3_BUCKET) throw httpError(503, "Secure document storage is not configured");
      const { businessId } = z.object({ businessId: z.uuid() }).parse(request.params);
      const input = uploadSchema.parse(request.body);
      const user = await getOrCreateUser(request.identity!);
      const membership = await prisma.businessMembership.findUnique({ where: { businessId_userId: { businessId, userId: user.id } } });
      if (!membership) throw httpError(404, "Business not found");
      if (membership.role === "READ_ONLY") throw httpError(403, "You do not have permission to upload invoices");
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
      const objectKey = `businesses/${businessId}/invoices/${crypto.randomUUID()}-${safeName}`;
      const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET, Key: objectKey, ContentType: input.contentType, Metadata: { businessid: businessId },
      });
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      return { uploadUrl, objectKey };
    },
  );

  app.post<{ Params: { businessId: string }; Body: z.input<typeof completeSchema> }>(
    "/v1/businesses/:businessId/purchases/complete-upload",
    { preHandler: authenticate },
    async (request, reply) => {
      if (!s3 || !config.S3_BUCKET) throw httpError(503, "Secure document storage is not configured");
      const { businessId } = z.object({ businessId: z.uuid() }).parse(request.params);
      const input = completeSchema.parse(request.body);
      if (!input.objectKey.startsWith(`businesses/${businessId}/invoices/`)) throw httpError(400, "Invalid document location");
      const user = await getOrCreateUser(request.identity!);
      const membership = await prisma.businessMembership.findUnique({ where: { businessId_userId: { businessId, userId: user.id } } });
      if (!membership) throw httpError(404, "Business not found");
      if (membership.role === "READ_ONLY") throw httpError(403, "You do not have permission to upload invoices");
      const stored = await s3.send(new HeadObjectCommand({ Bucket: config.S3_BUCKET, Key: input.objectKey }));
      if (!stored.ContentLength || stored.ContentLength > 5 * 1024 * 1024 || stored.ContentType !== input.contentType || stored.Metadata?.businessid !== businessId) {
        throw httpError(400, "Uploaded file failed validation");
      }
      const invoice = await prisma.$transaction(async (tx) => {
        const created = await tx.purchaseInvoice.create({
          data: { businessId, documentKey: input.objectKey, fileName: input.fileName, contentType: input.contentType, status: "NEEDS_REVIEW", extractionError: "Invoice extraction is not configured. Enter the invoice details manually." },
        });
        await tx.auditEvent.create({ data: {
          businessId, actorId: user.id, actorName: user.name || user.email || "Business user", action: "uploaded", entity: "purchase", entityId: created.id, summary: `Uploaded purchase invoice ${input.fileName}`.slice(0, 300),
        } });
        return created;
      });
      return reply.code(201).send({ id: invoice.id, status: invoice.status.toLowerCase() });
    },
  );

  app.get<{ Params: { businessId: string }; Querystring: { status?: string; cursor?: string; limit?: string } }>(
    "/v1/businesses/:businessId/purchases",
    { preHandler: authenticate },
    async (request) => {
      const { businessId } = z.object({ businessId: z.uuid() }).parse(request.params);
      const query = listQuerySchema.parse(request.query);
      const user = await getOrCreateUser(request.identity!);
      const membership = await prisma.businessMembership.findUnique({
        where: { businessId_userId: { businessId, userId: user.id } },
      });
      if (!membership) throw httpError(404, "Business not found");
      const where = { businessId, ...(query.status ? { status: query.status.toUpperCase() as "PROCESSING" | "NEEDS_REVIEW" | "APPROVED" | "FAILED" } : {}) };
      const rows = await prisma.purchaseInvoice.findMany({
        where,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        take: query.limit + 1,
        orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
        include: { taxLines: true },
      });
      const hasMore = rows.length > query.limit;
      const page = hasMore ? rows.slice(0, query.limit) : rows;
      const counts = await prisma.purchaseInvoice.groupBy({ by: ["status"], where: { businessId }, _count: { _all: true } });
      return {
        items: page.map((invoice) => ({
          id: invoice.id,
          businessId: invoice.businessId,
          status: invoice.status.toLowerCase(),
          fileName: invoice.fileName,
          contentType: invoice.contentType,
          supplierName: invoice.supplierName,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate?.toISOString().slice(0, 10) ?? "",
          taxLines: invoice.taxLines.map((line) => ({ rate: line.rate.toNumber(), taxableAmount: line.taxableAmount.toNumber(), gstAmount: line.gstAmount.toNumber() })),
          uploadedAt: invoice.uploadedAt.toISOString(),
        })),
        nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
        counts: Object.fromEntries(counts.map((item) => [item.status.toLowerCase(), item._count._all])),
      };
    },
  );

  app.get<{ Params: z.infer<typeof paramsSchema> }>(
    "/v1/businesses/:businessId/purchases/:purchaseId",
    { preHandler: authenticate },
    async (request) => {
      const { businessId, purchaseId } = paramsSchema.parse(request.params);
      const user = await getOrCreateUser(request.identity!);
      const membership = await prisma.businessMembership.findUnique({
        where: { businessId_userId: { businessId, userId: user.id } },
      });
      if (!membership) throw httpError(404, "Purchase invoice not found");
      const invoice = await prisma.purchaseInvoice.findFirst({
        where: { id: purchaseId, businessId },
        include: { taxLines: true },
      });
      if (!invoice) throw httpError(404, "Purchase invoice not found");
      const documentUrl = s3 && config.S3_BUCKET && invoice.documentKey
        ? await getSignedUrl(s3, new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: invoice.documentKey }), { expiresIn: 300 })
        : null;
      return {
        id: invoice.id,
        businessId: invoice.businessId,
        status: invoice.status.toLowerCase(),
        fileName: invoice.fileName,
        contentType: invoice.contentType,
        documentUrl,
        extractionError: invoice.extractionError,
        aiNotes: invoice.aiNotes,
        supplierName: invoice.supplierName,
        supplierTin: invoice.supplierTin,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate?.toISOString().slice(0, 10) ?? "",
        taxLines: invoice.taxLines.map((line) => ({
          rate: line.rate.toNumber(),
          taxableAmount: line.taxableAmount.toNumber(),
          gstAmount: line.gstAmount.toNumber(),
        })),
        uploadedAt: invoice.uploadedAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      };
    },
  );

  app.patch<{ Params: z.infer<typeof paramsSchema>; Body: z.input<typeof reviewSchema> }>(
    "/v1/businesses/:businessId/purchases/:purchaseId",
    { preHandler: authenticate },
    async (request) => {
      const { businessId, purchaseId } = paramsSchema.parse(request.params);
      const input = reviewSchema.parse(request.body);
      const user = await getOrCreateUser(request.identity!);
      const membership = await prisma.businessMembership.findUnique({
        where: { businessId_userId: { businessId, userId: user.id } },
      });
      if (!membership) throw httpError(404, "Purchase invoice not found");
      if (membership.role === "READ_ONLY") throw httpError(403, "You do not have permission to edit invoices");
      const invoice = await prisma.purchaseInvoice.findFirst({ where: { id: purchaseId, businessId } });
      if (!invoice) throw httpError(404, "Purchase invoice not found");
      if (invoice.status === "PROCESSING") throw httpError(409, "This invoice is still being read");

      const date = parseDateOnly(input.invoiceDate);
      if (!date && input.approve) throw httpError(400, "Enter a valid invoice date before approving");
      const normalizedLines = input.taxLines.map((line) => ({
        rate: Math.round(line.rate * 100) / 100,
        taxableAmount: Math.round(line.taxableAmount * 100) / 100,
        gstAmount: Math.round(line.gstAmount * 100) / 100,
      }));
      if (normalizedLines.some((line) =>
        ![8, 17].includes(line.rate) ||
        !Number.isFinite(line.taxableAmount) || !Number.isFinite(line.gstAmount) ||
        line.taxableAmount < 0 || line.gstAmount < 0 ||
        line.taxableAmount > 9_999_999_999.99 || line.gstAmount > 9_999_999_999.99
      )) throw httpError(400, "One or more GST lines are invalid");
      if (input.approve && (!input.supplierName || !input.invoiceNumber || !date || normalizedLines.length === 0)) {
        throw httpError(400, "Complete the required invoice fields before approving");
      }

      const nextStatus = input.approve ? "APPROVED" : "NEEDS_REVIEW";
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.purchaseInvoice.update({
          where: { id: invoice.id },
          data: {
            supplierName: input.supplierName || null,
            supplierTin: input.supplierTin.toUpperCase() || null,
            invoiceNumber: input.invoiceNumber,
            invoiceDate: date,
            status: nextStatus,
            extractionError: null,
            taxLines: {
              deleteMany: {},
              create: normalizedLines,
            },
          },
          include: { taxLines: true },
        });
        await tx.auditEvent.create({
          data: {
            businessId,
            actorId: user.id,
            actorName: user.name || user.email || "Business user",
            action: input.approve ? "approved" : "updated",
            entity: "purchase",
            entityId: invoice.id,
            summary: `${input.approve ? "Approved" : "Updated"} purchase invoice ${input.invoiceNumber || invoice.fileName}`.slice(0, 300),
          },
        });
        return row;
      });
      return {
        id: updated.id,
        status: updated.status.toLowerCase(),
        invoiceNumber: updated.invoiceNumber,
        invoiceDate: updated.invoiceDate?.toISOString().slice(0, 10) ?? "",
        supplierName: updated.supplierName,
        supplierTin: updated.supplierTin,
        taxLines: updated.taxLines.map((line) => ({
          rate: line.rate.toNumber(),
          taxableAmount: line.taxableAmount.toNumber(),
          gstAmount: line.gstAmount.toNumber(),
        })),
      };
    },
  );
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}
