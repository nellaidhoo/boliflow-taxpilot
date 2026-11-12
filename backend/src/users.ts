import { prisma } from "./db.js";

type Identity = {
  userId: string;
};

export function getOrCreateUser(identity: Identity) {
  return prisma.user.findUniqueOrThrow({ where: { id: identity.userId } });
}
