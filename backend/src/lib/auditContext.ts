/**
 * Per-request audit metadata (client IP + user agent), captured once in a
 * Fastify onRequest hook and made available to any service that writes an
 * audit log — no need to thread the request object through call stacks.
 * Falls back to an empty object outside a request context (background jobs).
 */
import { AsyncLocalStorage } from "node:async_hooks";

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

const store = new AsyncLocalStorage<AuditContext>();

export function runWithAuditContext<T>(ctx: AuditContext, fn: () => T): T {
  return store.run(ctx, fn);
}

export function auditContext(): AuditContext {
  return store.getStore() ?? {};
}