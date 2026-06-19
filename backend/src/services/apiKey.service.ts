/**
 * Business logic for API key management. Handles generation, listing, revocation,
 * and validation of API keys with last-used tracking.
 */
import crypto from "crypto";
import { prisma } from "../lib/db";
import { NotFoundError, ConflictError } from "../lib/errors";

function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export const ApiKeyService = {
  /** Creates a new API key with a random `sk_`-prefixed secret. Stores only the SHA-256 hash. */
  async generate(companyId: string, name: string) {
    const key = `sk_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = hashApiKey(key);

    await prisma.apiKey.create({
      data: { companyId, name, key: keyHash },
    });

    return { key };
  },

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
    const keyHash = hashApiKey(key);
    const apiKey = await prisma.apiKey.findUnique({ where: { key: keyHash } });
    if (!apiKey || !apiKey.active) return null;

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  },
};
