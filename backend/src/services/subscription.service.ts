import { prisma } from "../lib/db";
import { NotFoundError, ForbiddenError, ConflictError } from "../lib/errors";
import { PaystackService } from "./paystack.service";

interface PaystackTxData {
  id: number;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  metadata: Record<string, unknown>;
  customer: { customer_code: string } | null;
  authorization: { authorization_code: string } | null;
}

export const SubscriptionService = {
  async activateFreePlan(companyId: number) {
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

  async getSubscription(companyId: number) {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundError("Subscription");

    const [reportCount, userCount] = await Promise.all([
      prisma.incident.count({ where: { companyId } }),
      prisma.user.count({ where: { companyId } }),
    ]);

    return {
      ...sub,
      usage: {
        reports: reportCount,
        users: userCount,
      },
    };
  },

  async initializeUpgrade(companyId: number, planId: number) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundError("Company");

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError("Plan");
    if (plan.price === 0) throw new ConflictError("Cannot upgrade to free plan");

    let paystackCustomerCode: string | undefined;

    const existingSub = await prisma.companySubscription.findUnique({
      where: { companyId },
    });

    if (existingSub?.paystackCustomerCode) {
      paystackCustomerCode = existingSub.paystackCustomerCode;
    } else {
      const customer = await PaystackService.createCustomer(
        company.email,
        company.name,
        ""
      );
      if (!customer.status || !("data" in customer) || !customer.data) {
        throw new Error("Failed to create Paystack customer");
      }
      paystackCustomerCode = customer.data.customer_code;
    }

    const nameParts = company.name.split(" ");
    const tx = await PaystackService.initializeTransaction(
      company.email,
      plan.price,
      {
        company_id: companyId,
        plan_id: planId,
        plan_name: plan.name,
        customer_code: paystackCustomerCode,
        first_name: nameParts[0] || company.name,
        last_name: nameParts.slice(1).join(" ") || "",
      }
    );

    if (!tx.status || !("data" in tx) || !tx.data) {
      throw new Error("Failed to initialize Paystack transaction");
    }

    return {
      authorizationUrl: tx.data.authorization_url,
      reference: tx.data.reference,
    };
  },

  async handleUpgradeCallback(reference: string) {
    const verification = await PaystackService.verifyTransaction(reference);
    if (!verification.status || !("data" in verification) || !verification.data) {
      throw new Error("Transaction verification failed");
    }

    const tx = verification.data as unknown as PaystackTxData;
    if (tx.status !== "success") {
      throw new Error("Transaction was not successful");
    }

    const metadata = tx.metadata as Record<string, any> | undefined;
    const companyId = metadata?.company_id as number;
    const planId = metadata?.plan_id as number;
    const customerCode = metadata?.customer_code as string;

    if (!companyId || !planId) {
      throw new Error("Missing metadata in transaction");
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError("Plan");

    await prisma.paymentHistory.create({
      data: {
        companyId,
        amount: tx.amount,
        currency: tx.currency,
        reference: tx.reference,
        status: "success",
        paystackData: JSON.stringify(tx),
      },
    });

    const existingSub = await prisma.companySubscription.findUnique({
      where: { companyId },
    });

    if (existingSub?.paystackSubscriptionCode) {
      return { subscription: existingSub, isNew: false };
    }

    const authorization = tx.authorization;
    const planCode = `PLN_${plan?.name?.toLowerCase()}`;

    const subResult = await PaystackService.createSubscription(
      customerCode || tx.customer?.customer_code || "",
      planCode,
      authorization?.authorization_code,
      new Date()
    );

    let subscriptionCode: string | undefined;

    if (subResult.status && "data" in subResult && subResult.data) {
      subscriptionCode = subResult.data.subscription_code;
    }

    const updated = await prisma.companySubscription.upsert({
      where: { companyId },
      create: {
        companyId,
        planId,
        status: "active",
        paystackSubscriptionCode: subscriptionCode,
        paystackCustomerCode: customerCode || tx.customer?.customer_code,
        authorizationCode: authorization?.authorization_code,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        planId,
        status: "active",
        paystackSubscriptionCode: subscriptionCode,
        paystackCustomerCode: customerCode || tx.customer?.customer_code,
        authorizationCode: authorization?.authorization_code,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: { plan: true },
    });

    return { subscription: updated, isNew: true };
  },

  async cancelSubscription(companyId: number) {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
    });
    if (!sub) throw new NotFoundError("Subscription");
    if (sub.status === "cancelled") throw new ConflictError("Already cancelled");

    if (sub.paystackSubscriptionCode && sub.paystackCustomerCode) {
      try {
        const subscriptions = await PaystackService.listTransactions(
          sub.paystackCustomerCode
        );
      } catch {
      }
    }

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

  async getPaymentHistory(companyId: number) {
    return prisma.paymentHistory.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  },

  async canCreateIncident(companyId: number): Promise<void> {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || sub.status === "cancelled") {
      const freePlan = await prisma.subscriptionPlan.findFirst({ where: { price: 0 } });
      if (freePlan) {
        const count = await prisma.incident.count({ where: { companyId } });
        if (freePlan.reportLimit > 0 && count >= freePlan.reportLimit) {
          throw new ForbiddenError("Report limit reached. Upgrade to continue.");
        }
      }
      return;
    }
    if (sub.plan.reportLimit > 0) {
      const count = await prisma.incident.count({ where: { companyId } });
      if (count >= sub.plan.reportLimit) {
        throw new ForbiddenError("Report limit reached. Upgrade to continue.");
      }
    }
  },

  async canAddUser(companyId: number): Promise<void> {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || sub.status === "cancelled") {
      const freePlan = await prisma.subscriptionPlan.findFirst({ where: { price: 0 } });
      if (freePlan) {
        const count = await prisma.user.count({ where: { companyId } });
        if (freePlan.userLimit > 0 && count >= freePlan.userLimit) {
          throw new ForbiddenError("User limit reached. Upgrade to continue.");
        }
      }
      return;
    }
    if (sub.plan.userLimit > 0) {
      const count = await prisma.user.count({ where: { companyId } });
      if (count >= sub.plan.userLimit) {
        throw new ForbiddenError("User limit reached. Upgrade to continue.");
      }
    }
  },

  async hasFeature(companyId: number, feature: string): Promise<boolean> {
    const sub = await prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
    if (!sub || sub.status === "cancelled") return false;
    const features: string[] = JSON.parse(sub.plan.features);
    return features.includes(feature);
  },

  async requireFeature(companyId: number, feature: string): Promise<void> {
    const has = await this.hasFeature(companyId, feature);
    if (!has) {
      throw new ForbiddenError(`This feature requires an upgraded plan`);
    }
  },
};
