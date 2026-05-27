import Paystack from "paystack-sdk";
import crypto from "crypto";

const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY || "");

interface PaystackResult {
  status: boolean;
  message: string;
  data?: any;
}

export const PaystackService = {
  async initializeTransaction(
    email: string,
    amount: number,
    metadata?: Record<string, unknown>
  ): Promise<PaystackResult> {
    const result = await paystack.transaction.initialize({
      email,
      amount: String(amount),
      currency: "ZAR",
      callback_url: `${process.env.APP_URL || "http://localhost:3000"}/settings/billing?callback=1`,
      metadata,
    });
    return result as PaystackResult;
  },

  async verifyTransaction(reference: string): Promise<PaystackResult> {
    const result = await paystack.transaction.verify(reference);
    return result as PaystackResult;
  },

  async createCustomer(
    email: string,
    firstName: string,
    lastName: string
  ): Promise<PaystackResult> {
    const result = await paystack.customer.create({
      email,
      first_name: firstName,
      last_name: lastName,
    });
    return result as PaystackResult;
  },

  async createSubscription(
    customer: string,
    plan: string,
    authorization?: string,
    startDate?: Date
  ): Promise<PaystackResult> {
    const result = await paystack.subscription.create({
      customer,
      plan,
      authorization,
      start_date: startDate,
    });
    return result as PaystackResult;
  },

  async disableSubscription(code: string, token: string): Promise<PaystackResult> {
    const result = await paystack.subscription.disable({ code, token });
    return result as PaystackResult;
  },

  async listTransactions(customerCode?: string): Promise<PaystackResult> {
    const result = await paystack.transaction.list(
      customerCode ? ({ customer: customerCode } as any) : undefined
    );
    return result as PaystackResult;
  },

  verifyWebhook(signature: string, body: string): boolean {
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET || "")
      .update(body)
      .digest("hex");
    return hash === signature;
  },
};
