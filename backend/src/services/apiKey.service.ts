import crypto from "crypto";
import { prisma } from "../lib/db";
import { NotFoundError, ConflictError } from "../lib/errors";

export const ApiKeyService = {
  async generate(companyId: number, name: string) {
    const key = `sk_${crypto.randomBytes(32).toString("hex")}`;

    return prisma.apiKey.create({
      data: { companyId, name, key },
    });
  },

  async list(companyId: number) {
    return prisma.apiKey.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        key: true,
        lastUsedAt: true,
        active: true,
        createdAt: true,
      },
    });
  },

  async revoke(id: number, companyId: number) {
    const key = await prisma.apiKey.findFirst({ where: { id, companyId } });
    if (!key) throw new NotFoundError("API key");

    return prisma.apiKey.update({
      where: { id },
      data: { active: false },
    });
  },

  async validate(key: string) {
    const apiKey = await prisma.apiKey.findUnique({ where: { key } });
    if (!apiKey || !apiKey.active) return null;

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  },
};
