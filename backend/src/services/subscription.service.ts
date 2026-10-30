import { prisma } from "../lib/db";
import { NotFoundError, ForbiddenError, ConflictError } from "../lib/errors";
import { sendMail } from "./email.service";

/** Billing day of the month on which monthly payments are due. */
export const BILLING_DAY = 25;

/** During the active free trial, users are capped at this many accounts. */
export const TRIAL_USER_LIMIT = 3;

/** Returns the Date of the next billing day (the 25th of the current or next month). */
export function getNextBillingDate(from: Date = new Date()): Date {
  const base = new Date(from);
  const next = new Date(base);
  if (base.getDate() < BILLING_DAY) {
    next.setDate(BILLING_DAY);
  } else {
    next.setDate(BILLING_DAY);
    next.setMonth(next.getMonth() + 1);
  }
  next.setHours(0, 0, 0, 0);
  return next;
}

export const SubscriptionService = {
  /** Activates the free plan for a new company. Sets trial start/end dates based on the plan's trial period. */
  async activateFreePlan(companyId: string) {
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { price: 0 },
    });
    if (!freePlan) throw new NotFoundError("Free plan");

    const existing = await prisma.companySubscription.findUnique({
      where: { companyId },
    });
    if (existing) return existing;

    const trialStartedAt = new Date();
    const trialEndsAt = freePlan.trialPeriodDays
      ? new Date(
          trialStartedAt.getTime() +
            freePlan.trialPeriodDays * 24 * 60 * 60 * 1000,
        )
      : null;

    return prisma.companySubscription.create({
      data: {
        companyId,
        planId: freePlan.id,
        status: "active",
        currentPeriodStart: trialStartedAt,
        trialStartedAt,
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

    const [userCount, reportCount] = await Promise.all([
      prisma.user.count({
        where: { companyId, status: "active" },
      }),
      prisma.incident.count({ where: { companyId } }),
    ]);

    return {
      ...sub,
      usage: { users: userCount, reports: reportCount },
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
    const daysRemaining = Math.max(
      0,
      Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
    );
    const isExpired = now >= sub.trialEndsAt;

    return {
      isTrial: true,
      daysRemaining,
      isExpired,
      trialStartedAt: sub.trialStartedAt,
      trialEndsAt: sub.trialEndsAt,
    };
  },

  /** Returns the lowest-priced paid plan, used as the default post-trial upgrade. */
  async getDefaultPaidPlan() {
    return prisma.subscriptionPlan.findFirst({
      where: { price: { gt: 0 } },
      orderBy: { price: "asc" },
    });
  },

  /**
   * Automatically upgrades a company from an expired free-plan trial to the
   * default paid plan. No-op when the trial is still active, the plan is
   * already paid, or the subscription is cancelled.
   */
  async upgradeExpiredTrial(companyId: string) {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || !sub.trialEndsAt || sub.status === "cancelled") return;
    if (sub.plan.price > 0 || new Date() < sub.trialEndsAt) return;

    const paidPlan = await this.getDefaultPaidPlan();
    if (!paidPlan) return;

    await prisma.companySubscription.update({
      where: { companyId },
      data: {
        planId: paidPlan.id,
        status: "active",
        currentPeriodStart: new Date(),
        trialStartedAt: null,
        trialEndsAt: null,
        trialWarningSent: false,
      },
      include: { plan: true },
    });
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

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    const admin = await prisma.user.findFirst({
      where: { companyId, role: "admin" },
    });

    if (!admin || !company) return;

    await sendMail({
      to: admin.email,
      subject: "trial_ending",
      data: {
        name: admin.name,
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
    if (sub.status === "cancelled")
      throw new ConflictError("Already cancelled");

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

  /** Checks if company can add more users. During active trial, capped at TRIAL_USER_LIMIT. */
  async canAddUser(companyId: string): Promise<void> {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || sub.status === "cancelled") return;

    const trial = await this.getTrialStatus(companyId);
    if (trial?.isTrial && trial.isExpired) {
      throw new ForbiddenError(
        "Your organisation's free trial has ended. Please upgrade your subscription to continue.",
      );
    }
    if (trial?.isTrial && !trial.isExpired) {
      const count = await prisma.user.count({
        where: { companyId, status: "active" },
      });
      if (count >= TRIAL_USER_LIMIT) {
        throw new ForbiddenError(
          `Free trial is limited to ${TRIAL_USER_LIMIT} users. Upgrade to continue.`,
        );
      }
      return;
    }

    if (sub.plan.userLimit > 0) {
      const count = await prisma.user.count({
        where: { companyId, status: "active" },
      });
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
    if (trial?.isTrial && trial.isExpired) return false;
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

  /** Returns all available subscription plans. */
  async listPlans() {
    return prisma.subscriptionPlan.findMany({
      orderBy: { price: "asc" },
    });
  },

  /** Retrieves billing details for a company: the next due date (billing day) and current period. */
  async getBillingDetails(companyId: string) {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundError("Subscription");

    return {
      ...sub,
      billingDay: BILLING_DAY,
      nextBillingDate: getNextBillingDate(),
    };
  },

  /** Returns true when the company's free-plan trial has expired and it has not subscribed to a paid plan. */
  async isTrialExpired(companyId: string | null): Promise<boolean> {
    if (!companyId) return false;
    const trial = await this.getTrialStatus(companyId);
    return Boolean(trial?.isTrial && trial.isExpired);
  },

  /** Throws ForbiddenError when the company's free-plan trial has ended, blocking all feature access. */
  async assertActive(companyId: string | null): Promise<void> {
    if (!companyId) return;
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub) return;

    if (
      sub.plan.price === 0 &&
      sub.trialEndsAt &&
      new Date() >= sub.trialEndsAt
    ) {
      throw new ForbiddenError(
        "Your organisation's free trial has ended. Please upgrade your subscription to continue using SecReports.",
      );
    }

    const reportLimit = sub.plan.reportLimit ?? 0;
    if (reportLimit > 0) {
      const reports = await prisma.incident.count({ where: { companyId } });
      if (reports >= reportLimit) {
        throw new ForbiddenError(
          `Your organisation has reached its ${reportLimit}-report limit. Please upgrade your subscription to continue.`,
        );
      }
    }
  },

  /** Changes the company's subscription plan. The free trial plan is granted once (at signup or on cancellation) and cannot be selected again after the company has upgraded. */
  async changePlan(companyId: string, planId: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundError("Subscription plan");

    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundError("Subscription");

    if (plan.price === 0) {
      throw new ForbiddenError(
        "The free trial plan has already been used. Choose a paid plan to continue.",
      );
    }

    if (plan.price < sub.plan.price) {
      throw new ForbiddenError(
        "You cannot downgrade to a lower-priced plan. Please contact support if you need to change your subscription.",
      );
    }

    // canAddUser only guards new users, so a downgrade must not leave the company over the new limit.
    if (plan.userLimit > 0) {
      const count = await prisma.user.count({
        where: { companyId, status: "active" },
      });
      if (count > plan.userLimit) {
        throw new ForbiddenError(
          `You have ${count} active users. The ${plan.name} plan allows ${plan.userLimit}. Remove users before changing plan.`,
        );
      }
    }

    const now = new Date();

    const updated = await prisma.companySubscription.update({
      where: { companyId },
      data: {
        planId,
        status: "active",
        currentPeriodStart: now,
        trialStartedAt: null,
        trialEndsAt: null,
        trialWarningSent: false,
      },
      include: { plan: true },
    });

    return updated;
  },
};
