import { prisma } from "../lib/db";
import { NotFoundError, ForbiddenError, ConflictError } from "../lib/errors";
import { sendMail } from "./email.service";

export const SubscriptionService = {
  /** Activates the free plan for a new company. Sets trial end date to 14 days from now. */
  async activateFreePlan(companyId: string) {
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { price: 0 },
    });
    if (!freePlan) throw new NotFoundError("Free plan");

    const existing = await prisma.companySubscription.findUnique({
      where: { companyId },
    });
    if (existing) return existing;

    const trialEndsAt = freePlan.trialPeriodDays
      ? new Date(Date.now() + freePlan.trialPeriodDays * 24 * 60 * 60 * 1000)
      : null;

    return prisma.companySubscription.create({
      data: {
        companyId,
        planId: freePlan.id,
        status: "active",
        trialEndsAt,
      },
      include: { plan: true },
    });
  },

  /** Retrieves the company's subscription with usage counts. */
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

  /** Returns trial status for the company: days remaining, whether expired, etc. */
  async getTrialStatus(companyId: string) {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub) return null;

    const isFreePlan = sub.plan.price === 0;
    if (!isFreePlan || !sub.trialEndsAt) {
      return { isTrial: false, daysRemaining: 0, isExpired: false };
    }

    const now = new Date();
    const diffMs = sub.trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isExpired = now >= sub.trialEndsAt;

    return {
      isTrial: true,
      daysRemaining,
      isExpired,
      trialEndsAt: sub.trialEndsAt,
    };
  },

  /** Checks if trial is ending in 2 days and sends a warning email if not yet sent. */
  async checkAndNotifyTrialEnding(companyId: string) {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || sub.trialWarningSent || !sub.trialEndsAt) return;

    const now = new Date();
    const diffMs = sub.trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining > 2 || daysRemaining < 1) return;

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const owner = await prisma.user.findFirst({
      where: { companyId, role: "owner" },
    });

    if (!owner || !company) return;

    await sendMail({
      to: owner.email,
      subject: "trial_ending",
      data: {
        name: owner.name,
        daysRemaining,
      },
    });

    await prisma.companySubscription.update({
      where: { companyId },
      data: { trialWarningSent: true },
    });
  },

  /** Cancels the subscription and falls back to free plan. */
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

  /** Retrieves payment history for a company. */
  async getPaymentHistory(companyId: string) {
    return prisma.paymentHistory.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Checks if company can add more sites. During active trial, limit is bypassed. */
  async canAddSite(companyId: string): Promise<void> {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || sub.status === "cancelled") return;

    const trial = await this.getTrialStatus(companyId);
    if (trial?.isTrial && !trial.isExpired) return;

    if (sub.plan.siteLimit > 0) {
      const count = await prisma.guardingSite.count({ where: { companyId } });
      if (count >= sub.plan.siteLimit) {
        throw new ForbiddenError("Site limit reached. Upgrade to continue.");
      }
    }
  },

  /** Checks if company can add more users. During active trial, limit is bypassed. */
  async canAddUser(companyId: string): Promise<void> {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || sub.status === "cancelled") return;

    const trial = await this.getTrialStatus(companyId);
    if (trial?.isTrial && !trial.isExpired) return;

    if (sub.plan.userLimit > 0) {
      const count = await prisma.user.count({ where: { companyId } });
      if (count >= sub.plan.userLimit) {
        throw new ForbiddenError("User limit reached. Upgrade to continue.");
      }
    }
  },

  /** Checks if a feature is available. During active trial, all features are granted. */
  async hasFeature(companyId: string, feature: string): Promise<boolean> {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || sub.status === "cancelled") return false;

    const trial = await this.getTrialStatus(companyId);
    if (trial?.isTrial && !trial.isExpired) return true;

    const features: string[] = JSON.parse(sub.plan.features);
    return features.includes(feature);
  },

  /** Throws ForbiddenError if the feature is not available. */
  async requireFeature(companyId: string, feature: string): Promise<void> {
    const has = await this.hasFeature(companyId, feature);
    if (!has) {
      throw new ForbiddenError("This feature requires an upgraded plan");
    }
  },
};
