import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { auth, authenticate } from "./auth.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { purchaseRoutes } from "./routes/purchases.js";
import { auditRoutes } from "./routes/audit.js";
import { overviewRoutes } from "./routes/overview.js";
import { returnRoutes } from "./routes/returns.js";
import { salesRoutes } from "./routes/sales.js";
import { getOrCreateUser } from "./users.js";

const app = Fastify({
  logger: { level: config.NODE_ENV === "production" ? "info" : "debug" },
  // Nginx is the only service allowed to connect to this listener.
  trustProxy: ["127.0.0.1"],
  requestIdHeader: false,
  genReqId: () => crypto.randomUUID(),
  bodyLimit: 1_048_576,
});

// Nginx terminates TLS and owns HSTS for both static files and API responses.
await app.register(helmet, { hsts: false });
await app.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute",
  ipv6Subnet: 64,
  errorResponseBuilder: () => ({
    error: "RATE_LIMITED",
    message: "Too many requests. Please try again shortly.",
  }),
});
await app.register(cors, {
  origin: config.WEB_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});

app.route({
  method: ["GET", "POST"],
  url: "/v1/auth/*",
  async handler(request, reply) {
    const url = new URL(request.url, config.BETTER_AUTH_URL);
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value === undefined) continue;
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    const init: RequestInit = { method: request.method, headers };
    if (request.body !== undefined && request.method !== "GET") {
      init.body = JSON.stringify(request.body);
    }
    const response = await auth.handler(new Request(url, init));
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) reply.header("set-cookie", cookies);
    reply.code(response.status);
    const body = await response.arrayBuffer();
    return reply.send(body.byteLength > 0 ? Buffer.from(body) : null);
  },
});

await app.register(purchaseRoutes);
await app.register(salesRoutes);
await app.register(auditRoutes);
await app.register(overviewRoutes);
await app.register(returnRoutes);

app.get("/health/live", async () => ({ status: "ok" }));

app.get("/health/ready", async (_request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ready" };
  } catch (error) {
    app.log.error({ err: error }, "Database readiness check failed");
    return reply.code(503).send({ status: "not_ready" });
  }
});

app.get("/v1/me", { preHandler: authenticate }, async (request) => {
  const user = await getOrCreateUser(request.identity!);
  return { id: user.id, email: user.email, name: user.name };
});

const businessInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  tin: z.string().trim().toUpperCase().regex(/^\d{7}GST\d{3}$/),
  sector: z.enum(["general", "tourism"]),
  filingPeriod: z.enum(["monthly", "quarterly"]),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.email().optional().or(z.literal("")),
});

app.get("/v1/businesses", { preHandler: authenticate }, async (request) => {
  const user = await getOrCreateUser(request.identity!);
  const memberships = await prisma.businessMembership.findMany({
    where: { userId: user.id },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map(({ business, role }) => ({ ...toBusinessDto(business), role: role.toLowerCase() }));
});

app.post<{ Body: z.input<typeof businessInputSchema> }>(
  "/v1/businesses",
  { preHandler: authenticate },
  async (request, reply) => {
    const input = businessInputSchema.parse(request.body);
    const user = await getOrCreateUser(request.identity!);
    const business = await prisma.$transaction(async (tx) => {
      const created = await tx.business.create({
        data: {
          name: input.name,
          tin: input.tin,
          sector: input.sector.toUpperCase() as "GENERAL" | "TOURISM",
          filingFrequency: input.filingPeriod.toUpperCase() as "MONTHLY" | "QUARTERLY",
          address: input.address || null,
          phone: input.phone || null,
          email: input.email || null,
          memberships: { create: { userId: user.id, role: "OWNER" } },
        },
      });
      await tx.auditEvent.create({
        data: {
          businessId: created.id,
          actorId: user.id,
          actorName: user.name || user.email || "Business owner",
          action: "created",
          entity: "business",
          entityId: created.id,
          summary: `Set up business profile for ${created.name}`.slice(0, 300),
        },
      });
      return created;
    });
    return reply.code(201).send(toBusinessDto(business));
  },
);

app.patch<{
  Params: { businessId: string };
  Body: z.input<typeof businessInputSchema>;
}>("/v1/businesses/:businessId", { preHandler: authenticate }, async (request) => {
  const params = z.object({ businessId: z.uuid() }).parse(request.params);
  const input = businessInputSchema.parse(request.body);
  const user = await getOrCreateUser(request.identity!);
  const membership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId: params.businessId, userId: user.id } },
    include: { business: true },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    const error = new Error("Business not found");
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  const before = membership.business;
  const updated = await prisma.$transaction(async (tx) => {
    const business = await tx.business.update({
      where: { id: before.id },
      data: {
        name: input.name,
        tin: input.tin,
        sector: input.sector.toUpperCase() as "GENERAL" | "TOURISM",
        filingFrequency: input.filingPeriod.toUpperCase() as "MONTHLY" | "QUARTERLY",
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
      },
    });
    const changed =
      before.name !== business.name ||
      before.tin !== business.tin ||
      before.sector !== business.sector ||
      before.filingFrequency !== business.filingFrequency ||
      before.address !== business.address ||
      before.phone !== business.phone ||
      before.email !== business.email;
    if (changed) {
      await tx.auditEvent.create({
        data: {
          businessId: business.id,
          actorId: user.id,
          actorName: user.name || user.email || "Business user",
          action: "updated",
          entity: "business",
          entityId: business.id,
          summary: "Updated business profile",
        },
      });
    }
    return business;
  });
  return toBusinessDto(updated);
});

app.setErrorHandler((error, request, reply) => {
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ error: "BAD_REQUEST", message: "Request fields are invalid" });
  }
  const candidateStatus =
    typeof error === "object" && error !== null && "statusCode" in error
      ? error.statusCode
      : undefined;
  const statusCode =
    typeof candidateStatus === "number" && candidateStatus >= 400 && candidateStatus < 500
      ? candidateStatus
      : 500;
  const message = error instanceof Error ? error.message : "Request failed";
  if (statusCode === 500) request.log.error({ err: error }, "Unhandled API error");
  return reply.code(statusCode).send({
    error: statusCode === 500 ? "INTERNAL_ERROR" : "BAD_REQUEST",
    message: statusCode === 500 ? "An unexpected error occurred" : message,
  });
});

const close = async () => {
  await app.close();
  await prisma.$disconnect();
};

function toBusinessDto(business: {
  id: string;
  name: string;
  tin: string;
  sector: string;
  filingFrequency: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: business.id,
    name: business.name,
    tin: business.tin,
    sector: business.sector.toLowerCase(),
    filingPeriod: business.filingFrequency.toLowerCase(),
    address: business.address,
    phone: business.phone,
    email: business.email,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  };
}

process.once("SIGINT", () => void close().then(() => process.exit(0)));
process.once("SIGTERM", () => void close().then(() => process.exit(0)));

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}
