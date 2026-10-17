import { SubscriptionService, getNextBillingDate } from "./subscription.service";
import { NotFoundError, ForbiddenError } from "../lib/errors";
import { prisma } from "../lib/db";

jest.mock("../lib/db", () => ({
  prisma: {
    subscriptionPlan: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
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
      count: jest.fn(),
    },
  },
}));

const freePlan = { id: "free", name: "Free", price: 0, userLimit: 0, trialPeriodDays: 14 };
const paidPlan = { id: "pro", name: "Professional", price: 150000, userLimit: 5 };

const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

function sub(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub1",
    companyId: "company1",
    planId: freePlan.id,
    status: "active",
    currentPeriodStart: null,
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
          currentPeriodStart: expect.any(Date),
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

describe("SubscriptionService.isTrialExpired", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns false when companyId is null", async () => {
    const result = await SubscriptionService.isTrialExpired(null);
    expect(result).toBe(false);
    expect(prisma.companySubscription.findUnique).not.toHaveBeenCalled();
  });

  it("returns false when the trial has not expired", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: future }),
    );

    const result = await SubscriptionService.isTrialExpired("company1");
    expect(result).toBe(false);
  });

  it("returns true when the free-plan trial has expired", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: past }),
    );

    const result = await SubscriptionService.isTrialExpired("company1");
    expect(result).toBe(true);
  });

  it("returns false when already on a paid plan", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: paidPlan.id, plan: paidPlan }),
    );

    const result = await SubscriptionService.isTrialExpired("company1");
    expect(result).toBe(false);
  });
});

describe("SubscriptionService.assertActive", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes when companyId is null (e.g. superadmin)", async () => {
    await expect(SubscriptionService.assertActive(null)).resolves.toBeUndefined();
    expect(prisma.companySubscription.findUnique).not.toHaveBeenCalled();
  });

  it("passes while the trial is still active", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: future }),
    );

    await expect(SubscriptionService.assertActive("company1")).resolves.toBeUndefined();
  });

  it("passes when already on a paid plan", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: paidPlan.id, plan: paidPlan }),
    );

    await expect(SubscriptionService.assertActive("company1")).resolves.toBeUndefined();
  });

  it("throws ForbiddenError when the free-plan trial has ended", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: past }),
    );

    await expect(SubscriptionService.assertActive("company1")).rejects.toThrow(
      ForbiddenError,
    );
  });
});

describe("SubscriptionService expired-trial feature blocking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("canAddUser throws when the trial has ended", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: past }),
    );

    await expect(SubscriptionService.canAddUser("company1")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("canAddUser allows creating users while the trial is active and under the 3-user cap", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: future }),
    );
    (prisma.user.count as jest.Mock).mockResolvedValue(2);

    await expect(SubscriptionService.canAddUser("company1")).resolves.toBeUndefined();
  });

  it("canAddUser counts only active users, so deleted users free their seat", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: future }),
    );
    (prisma.user.count as jest.Mock).mockResolvedValue(2);

    await SubscriptionService.canAddUser("company1");

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { companyId: "company1", status: "active" },
    });
  });

  it("canAddUser blocks a fourth user during the active trial", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: future }),
    );
    (prisma.user.count as jest.Mock).mockResolvedValue(3);

    await expect(SubscriptionService.canAddUser("company1")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("hasFeature returns false when the trial has ended", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: past }),
    );

    const result = await SubscriptionService.hasFeature("company1", "export_csv_pdf");
    expect(result).toBe(false);
  });
});

describe("SubscriptionService.getBillingDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns billing details with next billing day of the month (25th)", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: paidPlan.id, plan: paidPlan }),
    );

    const result = await SubscriptionService.getBillingDetails("company1");

    expect(result).toMatchObject({
      billingDay: 25,
      planId: paidPlan.id,
    });
    const next = (result as { nextBillingDate: Date }).nextBillingDate;
    expect(next.getDate()).toBe(25);
  });

  it("throws NotFoundError when the subscription is missing", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(SubscriptionService.getBillingDetails("missing")).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("SubscriptionService.changePlan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("switches to a paid plan as an ongoing subscription with no end date", async () => {
    (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(paidPlan);
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: freePlan.id, plan: freePlan }),
    );
    (prisma.companySubscription.update as jest.Mock).mockResolvedValue({});

    await SubscriptionService.changePlan("company1", paidPlan.id);

    const arg = (prisma.companySubscription.update as jest.Mock).mock.calls[0][0];
    expect(arg.data.planId).toBe(paidPlan.id);
    expect(arg.data.status).toBe("active");
    expect(arg.data.currentPeriodStart).toEqual(expect.any(Date));
    expect(arg.data.trialStartedAt).toBe(null);
    expect(arg.data.trialEndsAt).toBe(null);
  });

  it("rejects switching back to the free plan after upgrading", async () => {
    (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(freePlan);
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: paidPlan.id, plan: paidPlan }),
    );

    await expect(
      SubscriptionService.changePlan("company1", freePlan.id),
    ).rejects.toThrow(ForbiddenError);
    expect(prisma.companySubscription.update).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the plan does not exist", async () => {
    (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(SubscriptionService.changePlan("company1", "nope")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws NotFoundError when the subscription does not exist", async () => {
    (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(paidPlan);
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(SubscriptionService.changePlan("company1", paidPlan.id)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("getNextBillingDate", () => {
  it("returns the 25th of the current month when before the 25th", () => {
    const from = new Date(2026, 7, 10); // 10 Aug
    const result = getNextBillingDate(from);
    expect(result.getDate()).toBe(25);
    expect(result.getMonth()).toBe(7);
  });

  it("returns the 25th of the next month on or after the 25th", () => {
    const from = new Date(2026, 7, 25); // 25 Aug
    const result = getNextBillingDate(from);
    expect(result.getDate()).toBe(25);
    expect(result.getMonth()).toBe(8);
  });

  it("does not overflow the month when starting on the 31st", () => {
    const from = new Date(2026, 0, 31); // 31 Jan
    const result = getNextBillingDate(from);
    expect(result.getDate()).toBe(25);
    expect(result.getMonth()).toBe(1); // Feb, not Mar
  });
});
