/**
 * Business logic for subscription and billing management. Handles plan activation,
 * usage-limit enforcement, plan upgrades, cancellation, and payment history.
 */
import { prisma } from "../lib/db";
import { NotFoundError, ForbiddenError, ConflictError } from "../lib/errors";

export const SubscriptionService = {
  /** Activates the free (zero-cost) plan for a new company. Idempotent — returns existing if already set. */
  async activateFreePlan(companyId: string) {
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { price: 0 },
    });
    if (!freePlan) throw new NotFoundError("Free plan");

    const existing = await prisma.companySubscription.findUnique({
      where: { companyId },
    });
    if (existing) return existing;

    return prisma.companySubscription.create({
      data: {
        companyId,
        planId: freePlan.id,
        status: "active",
      },
      include: { plan: true },
    });
  },

  /** Retrieves the company's subscription with current site/user usage counts. */
  async getSubscription(companyId: string) {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundError("Subscription");

    const [siteCount, userCount] = await Promise.all([
      prisma.guardingSite.count({ where: { companyId } }),
      prisma.user.count({ where: { companyId } }),
    ]);

    return {
      ...sub,
      usage: {
        sites: siteCount,
        users: userCount,
      },
    };
  },

  /** Cancels the current subscription and falls back to the free plan. */
  async cancelSubscription(companyId: string) {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
    });
    if (!sub) throw new NotFoundError("Subscription");
    if (sub.status === "cancelled") throw new ConflictError("Already cancelled");

    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { price: 0 },
    });

    return prisma.companySubscription.update({
      where: { companyId },
      data: {
        status: "cancelled",
        planId: freePlan?.id || sub.planId,
      },
      include: { plan: true },
    });
  },

  /** Retrieves payment history for a company, ordered by most recent. */
  async getPaymentHistory(companyId: string) {
    return prisma.paymentHistory.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Checks if the company's plan allows adding more guarding sites. Throws ForbiddenError if the limit is reached. */
  async canAddSite(companyId: string): Promise<void> {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || sub.status === "cancelled") return;
    if (sub.plan.price === 0) return;
    if (sub.plan.siteLimit > 0) {
      const count = await prisma.guardingSite.count({ where: { companyId } });
      if (count >= sub.plan.siteLimit) {
        throw new ForbiddenError("Site limit reached. Upgrade to continue.");
      }
    }
  },

  /** Checks if the company's plan allows adding more users. Throws ForbiddenError if the limit is reached. */
  async canAddUser(companyId: string): Promise<void> {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || sub.status === "cancelled") return;
    if (sub.plan.price === 0) return;
    if (sub.plan.userLimit > 0) {
      const count = await prisma.user.count({ where: { companyId } });
      if (count >= sub.plan.userLimit) {
        throw new ForbiddenError("User limit reached. Upgrade to continue.");
      }
    }
  },

  /** Checks if the company's plan includes a specific feature string. */
  async hasFeature(companyId: string, feature: string): Promise<boolean> {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || sub.status === "cancelled") return false;
    const features: string[] = JSON.parse(sub.plan.features);
    return features.includes(feature);
  },

  /** Throws ForbiddenError if the company's plan does not include the specified feature. */
  async requireFeature(companyId: string, feature: string): Promise<void> {
    const has = await this.hasFeature(companyId, feature);
    if (!has) {
      throw new ForbiddenError(`This feature requires an upgraded plan`);
    }
  },
};
