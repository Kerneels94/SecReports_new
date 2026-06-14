/**
 * Business logic for API key management. Handles generation, listing, revocation,
 * and validation of API keys with last-used tracking.
 */
import crypto from "crypto";
import { prisma } from "../lib/db";
import { NotFoundError, ConflictError } from "../lib/errors";

export const ApiKeyService = {
  /** Creates a new API key with a random `sk_`-prefixed secret. */
  async generate(companyId: string, name: string) {
    const key = `sk_${crypto.randomBytes(32).toString("hex")}`;

    return prisma.apiKey.create({
      data: { companyId, name, key },
    });
  },

  /** Lists all API keys for a company, ordered by creation date. */
  async list(companyId: string) {
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

  /** Soft-deactivates an API key, scoped to the owning company. */
  async revoke(id: string, companyId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, companyId } });
    if (!key) throw new NotFoundError("API key");

    return prisma.apiKey.update({
      where: { id },
      data: { active: false },
    });
  },

  /** Validates an API key and updates its last-used timestamp. Returns null if inactive. */
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
