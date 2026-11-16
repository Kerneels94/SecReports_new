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
    incident: {
      count: jest.fn(),
    },
  },
}));

const freePlan = { id: "free", name: "Free", price: 0, userLimit: 0, reportLimit: 50, trialPeriodDays: 14 };
const paidPlan = { id: "pro", name: "Professional", price: 150000, userLimit: 5, reportLimit: 100 };

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

  it("allows a free trial below the 50-report limit", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: future }),
    );
    (prisma.incident.count as jest.Mock).mockResolvedValue(49);

    await expect(SubscriptionService.assertActive("company1")).resolves.toBeUndefined();
  });

  it("throws ForbiddenError when a free trial reaches the 50-report limit", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ trialStartedAt: past, trialEndsAt: future }),
    );
    (prisma.incident.count as jest.Mock).mockResolvedValue(50);

    await expect(SubscriptionService.assertActive("company1")).rejects.toThrow(
      /50-report limit/,
    );
  });

  it("passes when already on a paid plan", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: paidPlan.id, plan: paidPlan }),
    );
    (prisma.incident.count as jest.Mock).mockResolvedValue(0);

    await expect(SubscriptionService.assertActive("company1")).resolves.toBeUndefined();
  });

  it("passes when the paid plan's report count is below its limit", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: paidPlan.id, plan: paidPlan }),
    );
    (prisma.incident.count as jest.Mock).mockResolvedValue(99);

    await expect(SubscriptionService.assertActive("company1")).resolves.toBeUndefined();
  });

  it("throws ForbiddenError when the report limit is reached", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: paidPlan.id, plan: paidPlan }),
    );
    (prisma.incident.count as jest.Mock).mockResolvedValue(100);

    await expect(SubscriptionService.assertActive("company1")).rejects.toThrow(
      /100-report limit/,
    );
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

describe("SubscriptionService.getSubscription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns user and report usage counts", async () => {
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: paidPlan.id, plan: paidPlan }),
    );
    (prisma.user.count as jest.Mock).mockResolvedValue(4);
    (prisma.incident.count as jest.Mock).mockResolvedValue(200);

    const result = await SubscriptionService.getSubscription("company1");

    expect(result.usage).toEqual({ users: 4, reports: 200 });
    expect(prisma.incident.count).toHaveBeenCalledWith({
      where: { companyId: "company1" },
    });
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
    (prisma.incident.count as jest.Mock).mockResolvedValue(0);
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

  const enterprise = { id: "ent", name: "Enterprise", price: 250000, userLimit: 0, reportLimit: 0 };
  const starter = { id: "starter", name: "Starter", price: 65000, userLimit: 3, reportLimit: 25 };

  it("allows downgrading when users and reports fit the cheaper plan", async () => {
    (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(starter);
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: enterprise.id, plan: enterprise }),
    );
    (prisma.user.count as jest.Mock).mockResolvedValue(3);
    (prisma.incident.count as jest.Mock).mockResolvedValue(24);
    (prisma.companySubscription.update as jest.Mock).mockResolvedValue({});

    await SubscriptionService.changePlan("company1", starter.id);

    expect(prisma.companySubscription.update).toHaveBeenCalled();
  });

  it("rejects a plan whose report limit the company has already reached", async () => {
    (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(starter);
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: enterprise.id, plan: enterprise }),
    );
    (prisma.user.count as jest.Mock).mockResolvedValue(2);
    (prisma.incident.count as jest.Mock).mockResolvedValue(25);

    await expect(SubscriptionService.changePlan("company1", starter.id)).rejects.toThrow(
      "You have 25 reports. The Starter plan allows 25.",
    );
    expect(prisma.companySubscription.update).not.toHaveBeenCalled();
  });

  it("lets a superadmin override skip the user and report checks", async () => {
    (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(starter);
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: enterprise.id, plan: enterprise }),
    );
    (prisma.user.count as jest.Mock).mockResolvedValue(40);
    (prisma.incident.count as jest.Mock).mockResolvedValue(900);
    (prisma.companySubscription.update as jest.Mock).mockResolvedValue({});

    await SubscriptionService.changePlan("company1", starter.id, { override: true });

    expect(prisma.companySubscription.update).toHaveBeenCalled();
  });

  it("still rejects the free plan on a superadmin override", async () => {
    (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(freePlan);
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: paidPlan.id, plan: paidPlan }),
    );

    await expect(
      SubscriptionService.changePlan("company1", freePlan.id, { override: true }),
    ).rejects.toThrow(ForbiddenError);
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

  it("rejects a plan whose user limit is below the active user count", async () => {
    (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(paidPlan);
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: freePlan.id, plan: freePlan }),
    );
    (prisma.user.count as jest.Mock).mockResolvedValue(12);

    await expect(SubscriptionService.changePlan("company1", paidPlan.id)).rejects.toThrow(
      "You have 12 active users. The Professional plan allows 5. Remove users before changing plan.",
    );
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { companyId: "company1", status: "active" },
    });
    expect(prisma.companySubscription.update).not.toHaveBeenCalled();
  });

  it("allows a plan whose user limit equals the active user count", async () => {
    (prisma.subscriptionPlan.findUnique as jest.Mock).mockResolvedValue(paidPlan);
    (prisma.companySubscription.findUnique as jest.Mock).mockResolvedValue(
      sub({ planId: freePlan.id, plan: freePlan }),
    );
    (prisma.user.count as jest.Mock).mockResolvedValue(5);
    (prisma.companySubscription.update as jest.Mock).mockResolvedValue({});

    await SubscriptionService.changePlan("company1", paidPlan.id);

    expect(prisma.companySubscription.update).toHaveBeenCalled();
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
