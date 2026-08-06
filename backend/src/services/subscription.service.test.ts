import { SubscriptionService } from "./subscription.service";
import { prisma } from "../lib/db";

jest.mock("../lib/db", () => ({
  prisma: {
    subscriptionPlan: {
      findFirst: jest.fn(),
    },
    companySubscription: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  },
}));

const freePlan = { id: "free", name: "Free", price: 0, siteLimit: 0, userLimit: 0, trialPeriodDays: 14 };
const paidPlan = { id: "pro", name: "Professional", price: 150000, siteLimit: 15, userLimit: 5 };

const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

function sub(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub1",
    companyId: "company1",
    planId: freePlan.id,
    status: "active",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    trialEndsAt: past,
    trialWarningSent: false,
    plan: freePlan,
    ...overrides,
  };
}

describe("SubscriptionService.upgradeExpiredTrial", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("upgrades an expired free-plan trial to the default paid plan", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(sub());
    (prisma.subscriptionPlan.findFirst as jest.Mock).mockResolvedValue(paidPlan);
    (prisma.companySubscription.update as jest.Mock).mockResolvedValue({});

    await SubscriptionService.upgradeExpiredTrial("company1");

    expect(prisma.companySubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "company1" },
        data: expect.objectContaining({
          planId: "pro",
          status: "active",
          trialEndsAt: null,
          trialWarningSent: false,
        }),
      }),
    );
  });

  it("does nothing while the trial is still active", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialEndsAt: future }),
    );

    await SubscriptionService.upgradeExpiredTrial("company1");

    expect(prisma.companySubscription.update).not.toHaveBeenCalled();
  });

  it("does nothing when already on a paid plan", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: paidPlan.id, plan: paidPlan, trialEndsAt: past }),
    );

    await SubscriptionService.upgradeExpiredTrial("company1");

    expect(prisma.companySubscription.update).not.toHaveBeenCalled();
  });

  it("does nothing when the subscription has no trial end date", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialEndsAt: null }),
    );

    await SubscriptionService.upgradeExpiredTrial("company1");

    expect(prisma.companySubscription.update).not.toHaveBeenCalled();
  });

  it("does nothing when the subscription is cancelled", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ status: "cancelled", trialEndsAt: past }),
    );

    await SubscriptionService.upgradeExpiredTrial("company1");

    expect(prisma.companySubscription.update).not.toHaveBeenCalled();
  });

  it("does nothing when no paid plan exists", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(sub());
    (prisma.subscriptionPlan.findFirst as jest.Mock).mockResolvedValue(null);

    await SubscriptionService.upgradeExpiredTrial("company1");

    expect(prisma.companySubscription.update).not.toHaveBeenCalled();
  });
});

describe("SubscriptionService.getTrialStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns isTrial true when on the free plan with trial dates set", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: future }),
    );

    const result = await SubscriptionService.getTrialStatus("company1");

    expect(result).toMatchObject({
      isTrial: true,
      isExpired: false,
      trialStartedAt: past,
      trialEndsAt: future,
    });
    expect((result as { daysRemaining: number }).daysRemaining).toBeGreaterThan(0);
  });

  it("returns isTrial false when the trial end date is missing", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: null }),
    );

    const result = await SubscriptionService.getTrialStatus("company1");

    expect(result).toEqual({ isTrial: false, daysRemaining: 0, isExpired: false });
  });

  it("returns isExpired true when the trial has passed its end date", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: past }),
    );

    const result = await SubscriptionService.getTrialStatus("company1");

    expect(result).toMatchObject({ isTrial: true, isExpired: true });
  });

  it("returns isTrial false when already on a paid plan", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: paidPlan.id, plan: paidPlan }),
    );

    const result = await SubscriptionService.getTrialStatus("company1");

    expect(result).toEqual({ isTrial: false, daysRemaining: 0, isExpired: false });
  });
});
