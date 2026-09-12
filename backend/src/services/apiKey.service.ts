/**
 * Business logic for API key listing and validation with last-used tracking.
 */
import { prisma } from "../lib/db";
import { hashToken } from "../lib/hash";

export const ApiKeyService = {
  /** Lists all API keys for a company, ordered by creation date. The raw key is never returned. */
  async list(companyId: string) {
    return prisma.apiKey.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        active: true,
        createdAt: true,
      },
    });
  },

  /** Validates an API key and updates its last-used timestamp. Returns null if inactive. */
  async validate(key: string) {
    const keyHash = hashToken(key);
    const apiKey = await prisma.apiKey.findUnique({ where: { key: keyHash } });
    if (!apiKey || !apiKey.active) return null;

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  },
};
