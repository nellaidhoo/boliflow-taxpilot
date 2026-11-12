import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";
import { prisma } from "./db.js";

export const auth = betterAuth({
  appName: "BoliFlow TaxPilot",
  baseURL: config.BETTER_AUTH_URL,
  basePath: "/v1/auth",
  secret: config.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: config.WEB_ORIGINS,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  advanced: {
    database: { generateId: "uuid" },
    useSecureCookies: config.NODE_ENV === "production",
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});

declare module "fastify" {
  interface FastifyRequest {
    identity: { userId: string; email: string; name: string } | null;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!session) {
    return reply.code(401).send({ error: "UNAUTHENTICATED", message: "Sign in to continue" });
  }
  request.identity = {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}
