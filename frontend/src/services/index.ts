/**
 * Typed service layer that wraps ApiClient calls into domain-specific
 * service objects used by hooks and components.
 */
import { api } from "./api";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
  Incident,
  PaginatedResponse,
  Invoice,
  RevenueStats,
  RevenueTrend,
  AdminCompany,
  MonthlyInvoiceResult,
  AuditLogEntry,
  SubscriptionPlan,
  CompanySubscription,
  LedgerEntry,
  LedgerSummary,
  PermissionMatrix,
} from "@/types";

export type { PermissionMatrix } from "@/types";

interface TrialStatus {
  isTrial: boolean;
  daysRemaining: number;
  isExpired: boolean;
  trialStartedAt?: string;
  trialEndsAt?: string;
}

/** Monthly incident count data point. */
export interface MonthlyStat {
  month: string;
  count: number;
}

/** Average response time in milliseconds for a month. */
export interface MonthlyResponseStat {
  month: string;
  avgMs: number;
  count: number;
}

/** Average response time in milliseconds per area, with incident count. */
export interface AreaResponseStat {
  area: string;
  avgMs: number;
  count: number;
}

/** Aggregated report summary data for the dashboard. */
interface ReportSummary {
  total: number;
  byStatus: { status: string; _count: { id: number } }[];
  recent: Incident[];
  attemptedCount: number;
  positiveCount: number;
  trial: TrialStatus | null;
}

/** A user as returned by the user-list endpoint. */
export interface UserListItem {
  id: number;
  name: string;
  surname?: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

/** Authentication and user-management endpoints. */
export const authService = {
  login: (data: LoginRequest) => api.post<LoginResponse>("/auth/login", data),
  register: (data: RegisterRequest) =>
    api.post<RegisterResponse>("/auth/register", data),
  logout: async () => {
    try {
      return await api.post<void>("/auth/logout", {});
    } finally {
      api.invalidateSession();
    }
  },
  refresh: () => api.post<LoginResponse>("/auth/refresh", {}),
  refreshSession: () => api.refreshSession(),
  /** Stores the access token for a new login and invalidates in-flight refreshes of the old session. */
  startSession: (accessToken: string) => api.startSession(accessToken),
  me: () => api.get<User>("/auth/me"),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>("/auth/reset-password", { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<{ message: string }>("/auth/me/password", {
      currentPassword,
      newPassword,
    }),
  /** Admin only. Erases the company and its data; billing records are kept for tax law. */
  deleteCompany: (password: string) =>
    api.post<{ message: string }>("/auth/company/delete", { password }),
  listUsers: () => api.get<UserListItem[]>("/auth/users"),
  getUserById: (id: number) => api.get<UserListItem>(`/auth/users/${id}`),
};

/** Public landing-page contact form endpoint. */
export const contactService = {
  send: (data: {
    name: string;
    email: string;
    company?: string;
    message: string;
  }) => api.post<{ message: string }>("/contact", data),
};

/** Incident list, detail, and creation endpoints. */
export const incidentService = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Incident>>(
      `/incidents?${new URLSearchParams(params)}`,
    ),
  getById: (id: number) => api.get<Incident>(`/incidents/${id}`),
  create: (data: Partial<Incident>) => api.post<Incident>("/incidents", data),
};

/** Dashboard report-summary endpoints. */
export const reportService = {
  summary: () => api.get<ReportSummary>("/reports/summary"),
  monthlyStats: () => api.get<MonthlyStat[]>("/reports/monthly-stats"),
  monthlyResponse: () => api.get<MonthlyResponseStat[]>("/reports/monthly-response"),
  responseByArea: () => api.get<AreaResponseStat[]>("/reports/response-by-area"),
  batchEmail: (email: string, type: string, format: "csv" | "pdf") =>
    api.post<{ message: string }>("/reports/batch-email", {
      email,
      type,
      format,
    }),
};

/** Reporting periods the average response time report can be exported over. */
export type ResponsePeriod = 3 | 6 | 9 | 12;

export function formatDurationMs(ms: number): string {
  if (ms < 0 || Number.isNaN(ms)) return "0m 0s";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

/** Export/download endpoints. */
export const exportService = {
  downloadPdf: (incidentId: string | number) =>
    api.downloadBlob(`/export/pdf?incidentId=${encodeURIComponent(String(incidentId))}`),
  downloadCsv: () => api.downloadBlob("/export/csv"),
  downloadYearlyPdf: () => api.downloadBlob("/export/yearly-pdf"),
  downloadMonthlyCrimePdf: (from: string, to: string) =>
    api.downloadBlob(
      `/export/monthly-crime-pdf?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),
  downloadResponseTimePdf: (months: ResponsePeriod) =>
    api.downloadBlob(`/export/response-time-pdf?months=${months}`),
  emailReport: (incidentId: number, email: string, format: "csv" | "pdf") =>
    api.post<{ message: string }>("/reports/email", {
      incidentId,
      email,
      format,
    }),
};

/** Manual user-creation and update endpoints (admin). */
export const userService = {
  create: (data: {
    name: string;
    surname?: string;
    email: string;
    password: string;
    role?: string;
  }) => api.post<User & { message: string }>("/auth/users", data),
  update: (
    id: number,
    data: {
      name?: string;
      surname?: string;
      email?: string;
      role?: string;
      currentPassword?: string;
    },
  ) => api.patch<UserListItem>(`/auth/users/${id}`, data),
  remove: (id: number) => api.delete<{ message: string }>(`/auth/users/${id}`),
};

/** Superadmin company-management endpoints. */
export const adminCompanyService = {
  list: () => api.get<AdminCompany[]>("/admin/companies"),
  getById: (id: string) => api.get<AdminCompany>(`/admin/companies/${id}`),
};

/** Superadmin invoice-management endpoints. */
export const adminInvoiceService = {
  list: (params?: {
    status?: string;
    companyId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.companyId) searchParams.set("companyId", params.companyId);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    const queryString = searchParams.toString();
    return api.get<Invoice[]>(
      `/admin/invoices${queryString ? `?${queryString}` : ""}`,
    );
  },
  getById: (id: string) => api.get<Invoice>(`/admin/invoices/${id}`),
  create: (data: {
    companyId: string;
    amount: number;
    dueDate: string;
    description?: string;
  }) => api.post<Invoice>("/admin/invoices", data),
  send: (id: string) => api.post<Invoice>(`/admin/invoices/${id}/send`),
  markAsPaid: (id: string) => api.patch<Invoice>(`/admin/invoices/${id}/paid`),
  markAsOverdue: (id: string) =>
    api.patch<Invoice>(`/admin/invoices/${id}/overdue`),
  generateMonthly: () =>
    api.post<MonthlyInvoiceResult[]>("/admin/invoices/generate-monthly"),
};

/** Superadmin revenue endpoints. */
export const adminRevenueService = {
  stats: () => api.get<RevenueStats>("/admin/revenue"),
  trends: () => api.get<RevenueTrend[]>("/admin/revenue/trends"),
};

/** Superadmin financial ledger endpoints. */
export const adminLedgerService = {
  list: (params?: {
    companyId?: string;
    entryType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.companyId) searchParams.set("companyId", params.companyId);
    if (params?.entryType) searchParams.set("entryType", params.entryType);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    const qs = searchParams.toString();
    return api.get<LedgerEntry[]>(`/admin/ledger${qs ? `?${qs}` : ""}`);
  },
  summary: () => api.get<LedgerSummary>("/admin/ledger/summary"),
  getById: (id: string) => api.get<LedgerEntry>(`/admin/ledger/${id}`),
  create: (data: {
    companyId: string;
    entryType: string;
    amount: number;
    currency?: string;
    description?: string;
    reference?: string;
    postedAt?: string;
  }) => api.post<LedgerEntry>("/admin/ledger", data),
  voidEntry: (id: string) => api.patch<LedgerEntry>(`/admin/ledger/${id}/void`),
};

/** Company audit-log endpoints (superadmin). */
export const adminAuditService = {
  list: (params?: {
    page?: number;
    perPage?: number;
    entityType?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.perPage) searchParams.set("perPage", String(params.perPage));
    if (params?.entityType) searchParams.set("entityType", params.entityType);
    if (params?.action) searchParams.set("action", params.action);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return api.get<PaginatedResponse<AuditLogEntry>>(
      `/audit-logs${qs ? `?${qs}` : ""}`,
    );
  },
  /** Superadmin listing across every company. */
  listAll: (params?: {
    page?: number;
    perPage?: number;
    companyId?: string;
    entityType?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.perPage) searchParams.set("perPage", String(params.perPage));
    if (params?.companyId) searchParams.set("companyId", params.companyId);
    if (params?.entityType) searchParams.set("entityType", params.entityType);
    if (params?.action) searchParams.set("action", params.action);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return api.get<PaginatedResponse<AuditLogEntry>>(
      `/admin/audit-logs${qs ? `?${qs}` : ""}`,
    );
  },
  /**
   * Downloads the company's audit logs as a PDF. Takes the same filters as
   * `list` so the file contains what the table is showing, not everything.
   */
  exportPdf: (params?: { entityType?: string; action?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.entityType) searchParams.set("entityType", params.entityType);
    if (params?.action) searchParams.set("action", params.action);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return api.downloadBlob(`/audit-logs/export${qs ? `?${qs}` : ""}`);
  },
  exportCompany: (companyId: string) =>
    api.post<{ emailedTo: string[]; count: number }>(`/admin/audit-logs/export/${companyId}`),
  exportAll: () =>
    api.post<{ emailedTo: string[]; count: number }>(`/admin/audit-logs/export`),
};

/** Subscription plan and company subscription endpoints. */
export const subscriptionService = {
  listPlans: () => api.get<SubscriptionPlan[]>("/subscription/plans"),
  getSubscription: () => api.get<CompanySubscription>("/subscription"),
  changePlan: (planId: string) =>
    api.patch<CompanySubscription>("/subscription/plan", { planId }),
};

/** Role × permission matrix endpoints (company admin). */
export const permissionsService = {
  get: () => api.get<PermissionMatrix>("/admin/permissions"),
  update: (permissions: { key: string; roles: string[] }[]) =>
    api.put<PermissionMatrix>("/admin/permissions", { permissions }),
};
