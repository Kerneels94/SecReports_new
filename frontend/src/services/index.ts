/**
 * Typed service layer that wraps ApiClient calls into domain-specific
 * service objects used by hooks and components.
 */
import { api } from "./api";
import type {
  LoginRequest,
  EmployeeLoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
  Incident,
  PaginatedResponse,
  GuardingSite,
  Guard,
  PatrolReport,
  PatrolSchedule,
  EntryLog,
  Invoice,
  RevenueStats,
  RevenueTrend,
  AdminCompany,
  MonthlyInvoiceResult,
  AuditLogEntry,
  SubscriptionPlan,
  CompanySubscription,
} from "@/types";

interface Comment {
  id: number;
  incidentId: number;
  userId: number;
  message: string;
  createdAt: string;
  user?: User;
}
interface Investigation {
  id: number;
  incidentId: number;
  findings: string | null;
  rootCause: string | null;
  recommendations: string | null;
  closureNotes: string | null;
  completedAt: string | null;
}
interface CorrectiveAction {
  id: number;
  incidentId: number;
  description: string;
  ownerId: number;
  dueDate: string;
  status: "open" | "in_progress" | "completed" | "overdue";
  completedAt: string | null;
  owner?: User;
}

interface TrialStatus {
  isTrial: boolean;
  daysRemaining: number;
  isExpired: boolean;
  trialStartedAt?: string;
  trialEndsAt?: string;
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
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

/** Authentication and user-management endpoints. */
export const authService = {
  login: (data: LoginRequest) => api.post<LoginResponse>("/auth/login", data),
  employeeLogin: (data: EmployeeLoginRequest) =>
    api.post<LoginResponse>("/auth/employee-login", data),
  register: (data: RegisterRequest) =>
    api.post<RegisterResponse>("/auth/register", data),
  logout: () => api.post<void>("/auth/logout", {}),
  refresh: () => api.post<LoginResponse>("/auth/refresh", {}),
  me: () => api.get<User>("/auth/me"),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>("/auth/reset-password", { token, password }),
  changePassword: (newPassword: string) =>
    api.patch<{ message: string }>("/auth/me/password", { newPassword }),
  listUsers: () => api.get<UserListItem[]>("/auth/users"),
  getUserById: (id: number) => api.get<UserListItem>(`/auth/users/${id}`),
};

/** Incident CRUD and status-update endpoints. */
export const incidentService = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Incident>>(
      `/incidents?${new URLSearchParams(params)}`,
    ),
  getById: (id: number) => api.get<Incident>(`/incidents/${id}`),
  create: (data: Partial<Incident>) => api.post<Incident>("/incidents", data),
  update: (id: number, data: Partial<Incident>) =>
    api.put<Incident>(`/incidents/${id}`, data),
  updateStatus: (id: number, status: string) =>
    api.patch<Incident>(`/incidents/${id}/status`, { status }),
  delete: (id: number) => api.delete<void>(`/incidents/${id}`),
};

/** Incident comment endpoints. */
export const commentService = {
  list: (incidentId: number) =>
    api.get<Comment[]>(`/incidents/${incidentId}/comments`),
  create: (incidentId: number, message: string) =>
    api.post<Comment>(`/incidents/${incidentId}/comments`, { message }),
};

/** Incident investigation endpoints. */
export const investigationService = {
  get: (incidentId: number) =>
    api.get<Investigation>(`/incidents/${incidentId}/investigation`),
  upsert: (incidentId: number, data: Partial<Investigation>) =>
    api.post<Investigation>(`/incidents/${incidentId}/investigation`, data),
};

/** Corrective-action CRUD endpoints. */
export const actionService = {
  list: (incidentId: number) =>
    api.get<CorrectiveAction[]>(`/incidents/${incidentId}/actions`),
  create: (incidentId: number, data: Partial<CorrectiveAction>) =>
    api.post<CorrectiveAction>(`/incidents/${incidentId}/actions`, data),
  update: (actionId: number, data: Partial<CorrectiveAction>) =>
    api.patch<CorrectiveAction>(`/actions/${actionId}`, data),
};

/** Dashboard report-summary endpoints. */
export const reportService = {
  summary: () => api.get<ReportSummary>("/reports/summary"),
  batchEmail: (email: string, type: string, format: "csv" | "pdf") =>
    api.post<{ message: string }>("/reports/batch-email", {
      email,
      type,
      format,
    }),
};

/** Export/download endpoints. */
export const exportService = {
  downloadPdf: (incidentId?: number) => {
    const params = incidentId ? `?incidentId=${incidentId}` : "";
    return api.downloadBlob(`/export/pdf${params}`);
  },
  downloadCsv: () => api.downloadBlob("/export/csv"),
  emailReport: (incidentId: number, email: string, format: "csv" | "pdf") =>
    api.post<{ message: string }>("/reports/email", {
      incidentId,
      email,
      format,
    }),
};

/** Patrol-report export/download endpoints. */
export const patrolExportService = {
  downloadCsv: (params?: {
    siteId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.siteId) searchParams.set("siteId", params.siteId);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    const qs = searchParams.toString();
    return api.downloadBlob(`/export/patrol-reports/csv${qs ? `?${qs}` : ""}`);
  },
  downloadPdf: (params?: {
    siteId?: string;
    dateFrom?: string;
    dateTo?: string;
    siteName?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.siteId) searchParams.set("siteId", params.siteId);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    if (params?.siteName) searchParams.set("siteName", params.siteName);
    const qs = searchParams.toString();
    return api.downloadBlob(`/export/patrol-reports/pdf${qs ? `?${qs}` : ""}`);
  },
  emailReport: (
    email: string,
    format: "csv" | "pdf",
    filters?: {
      siteId?: string;
      dateFrom?: string;
      dateTo?: string;
      siteName?: string;
    },
  ) =>
    api.post<{ message: string }>("/reports/patrol-reports/email", {
      email,
      format,
      ...filters,
    }),
};

/** Manual user-creation and update endpoints (admin). */
export const userService = {
  create: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) => api.post<User & { message: string }>("/auth/users", data),
  update: (
    id: number,
    data: { name?: string; email?: string; role?: string },
  ) => api.patch<UserListItem>(`/auth/users/${id}`, data),
};

/** Guarding-site CRUD endpoints. */
export const guardingSiteService = {
  list: () => api.get<GuardingSite[]>("/guarding-sites"),
  getById: (id: string) => api.get<GuardingSite>(`/guarding-sites/${id}`),
  create: (data: {
    name: string;
    address?: string;
    guards?: {
      name: string;
      surname: string;
      cellphone: string;
      employeeId: string;
    }[];
  }) => api.post<GuardingSite>("/guarding-sites", data),
  update: (
    id: string,
    data: {
      name?: string;
      address?: string;
      status?: string;
      newGuards?: {
        name: string;
        surname: string;
        cellphone: string;
        employeeId: string;
      }[];
      removeGuardIds?: string[];
    },
  ) => api.put<GuardingSite>(`/guarding-sites/${id}`, data),
  delete: (id: string) => api.delete<void>(`/guarding-sites/${id}`),
};

/** Security-guard CRUD endpoints. */
export const guardService = {
  list: (siteId?: string) =>
    api.get<Guard[]>(`/guards${siteId ? `?siteId=${siteId}` : ""}`),
  getById: (id: string) => api.get<Guard>(`/guards/${id}`),
  create: (data: {
    name: string;
    surname: string;
    cellphone: string;
    employeeId: string;
    siteId?: string;
  }) => api.post<Guard>("/guards", data),
  update: (
    id: string,
    data: {
      name?: string;
      surname?: string;
      cellphone?: string;
      employeeId?: string;
      siteId?: string | null;
      status?: string;
    },
  ) => api.put<Guard>(`/guards/${id}`, data),
  delete: (id: string) => api.delete<void>(`/guards/${id}`),
};

/** Patrol-report CRUD and query endpoints. */
export const patrolReportService = {
  listByCompany: (params?: {
    siteId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.siteId) searchParams.set("siteId", params.siteId);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    const qs = searchParams.toString();
    return api.get<PatrolReport[]>(`/patrol-reports${qs ? `?${qs}` : ""}`);
  },
  listBySite: (siteId: string) =>
    api.get<PatrolReport[]>(`/sites/${siteId}/patrol-reports`),
  listByGuard: (guardId: string) =>
    api.get<PatrolReport[]>(`/guards/${guardId}/patrol-reports`),
  getById: (id: string) => api.get<PatrolReport>(`/patrol-reports/${id}`),
  create: (data: {
    siteId: string;
    guardId: string;
    startedAt: string;
    notes?: string;
    checkpoints?: { name: string; scannedAt: string; status?: string }[];
  }) => api.post<PatrolReport>("/patrol-reports", data),
  update: (
    id: string,
    data: { completedAt?: string; status?: string; notes?: string },
  ) => api.put<PatrolReport>(`/patrol-reports/${id}`, data),
  delete: (id: string) => api.delete<void>(`/patrol-reports/${id}`),
};

/** Patrol-schedule CRUD and query endpoints. */
export const patrolScheduleService = {
  listByCompany: (params?: { siteId?: string; day?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.siteId) searchParams.set("siteId", params.siteId);
    if (params?.day) searchParams.set("day", params.day);
    const qs = searchParams.toString();
    return api.get<PatrolSchedule[]>(`/patrol-schedules${qs ? `?${qs}` : ""}`);
  },
  getById: (id: string) => api.get<PatrolSchedule>(`/patrol-schedules/${id}`),
  create: (data: {
    siteId: string;
    day: string;
    startTime: string;
    endTime: string;
    checkpoints?: { name: string; order: number }[];
  }) => api.post<PatrolSchedule>("/patrol-schedules", data),
  update: (
    id: string,
    data: {
      siteId?: string;
      day?: string;
      startTime?: string;
      endTime?: string;
      checkpoints?: { name: string; order: number }[];
    },
  ) => api.put<PatrolSchedule>(`/patrol-schedules/${id}`, data),
  delete: (id: string) => api.delete<void>(`/patrol-schedules/${id}`),
};

/** Entry-log CRUD, flag, and resolve endpoints. */
export const entryLogService = {
  listBySite: (siteId: string) =>
    api.get<EntryLog[]>(`/sites/${siteId}/entry-logs`),
  listByCompany: () => api.get<EntryLog[]>("/entry-logs"),
  getById: (id: string) => api.get<EntryLog>(`/entry-logs/${id}`),
  create: (data: {
    siteId: string;
    driverName: string;
    vehicleReg: string;
    entryTime: string;
    driverContact?: string;
    vehicleDesc?: string;
    purpose?: string;
    flagged?: boolean;
    flagReason?: string;
  }) => api.post<EntryLog>("/entry-logs", data),
  update: (
    id: string,
    data: {
      exitTime?: string;
      driverName?: string;
      vehicleDesc?: string;
      purpose?: string;
    },
  ) => api.put<EntryLog>(`/entry-logs/${id}`, data),
  flag: (id: string, data: { reason: string }) =>
    api.post<EntryLog>(`/entry-logs/${id}/flag`, data),
  resolve: (id: string, data: { reason: string }) =>
    api.post<EntryLog>(`/entry-logs/${id}/resolve`, data),
  delete: (id: string) => api.delete<void>(`/entry-logs/${id}`),
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

/** Company audit-log endpoints (owner/manager). */
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
};

/** Subscription plan and company subscription endpoints. */
export const subscriptionService = {
  listPlans: () => api.get<SubscriptionPlan[]>("/subscription/plans"),
  getSubscription: () => api.get<CompanySubscription>("/subscription"),
  changePlan: (planId: string) =>
    api.patch<CompanySubscription>("/subscription/plan", { planId }),
};
