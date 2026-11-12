import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { prisma } from "../db.js";
import { getOrCreateUser } from "../users.js";

const paramsSchema = z.object({ businessId: z.uuid() });
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  entity: z.enum(["business", "purchase", "sale", "return"]).optional(),
});

export async function auditRoutes(app: FastifyInstance) {
  app.get<{ Params: z.infer<typeof paramsSchema>; Querystring: z.input<typeof querySchema> }>(
    "/v1/businesses/:businessId/audit",
    { preHandler: authenticate },
    async (request) => {
      const { businessId } = paramsSchema.parse(request.params);
      const { limit, cursor, entity } = querySchema.parse(request.query);
      const user = await getOrCreateUser(request.identity!);
      const membership = await prisma.businessMembership.findUnique({
        where: { businessId_userId: { businessId, userId: user.id } },
      });
      if (!membership) throw Object.assign(new Error("Business not found"), { statusCode: 404 });
      const rows = await prisma.auditEvent.findMany({
        where: { businessId, ...(entity ? { entity } : {}) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: limit + 1,
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return {
        items: page.map((event) => ({
          id: event.id,
          entity: event.entity,
          entityId: event.entityId,
          action: event.action,
          summary: event.summary,
          changes: event.changes,
          actorName: event.actorName,
          isSystem: event.isSystem,
          createdAt: event.createdAt.toISOString(),
        })),
        nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
      };
    },
  );
}
