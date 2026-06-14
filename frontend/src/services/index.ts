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
  Comment,
  Evidence,
  Investigation,
  CorrectiveAction,
  GuardingSite,
  Guard,
  PatrolReport,
  EntryLog,
  FlaggedVehicle,
} from "@/types";

/** Aggregated report summary data for the dashboard. */
interface ReportSummary {
  total: number;
  byStatus: { status: string; _count: { id: number } }[];
  recent: Incident[];
  attemptedCount: number;
  positiveCount: number;
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
  employeeLogin: (data: EmployeeLoginRequest) => api.post<LoginResponse>("/auth/employee-login", data),
  register: (data: RegisterRequest) => api.post<RegisterResponse>("/auth/register", data),
  logout: () => api.post<void>("/auth/logout"),
  refresh: (token: string) => api.post<LoginResponse>("/auth/refresh", { refreshToken: token }),
  me: () => api.get<User>("/auth/me"),
  forgotPassword: (email: string) => api.post<{ message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => api.post<{ message: string }>("/auth/reset-password", { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<{ message: string }>("/auth/me/password", { currentPassword, newPassword }),
  listUsers: () => api.get<UserListItem[]>("/auth/users"),
  getUserById: (id: number) => api.get<UserListItem>(`/auth/users/${id}`),
};

/** Incident CRUD and status-update endpoints. */
export const incidentService = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Incident>>(`/incidents?${new URLSearchParams(params)}`),
  getById: (id: number) => api.get<Incident>(`/incidents/${id}`),
  create: (data: Partial<Incident>) => api.post<Incident>("/incidents", data),
  update: (id: number, data: Partial<Incident>) => api.put<Incident>(`/incidents/${id}`, data),
  updateStatus: (id: number, status: string) =>
    api.patch<Incident>(`/incidents/${id}/status`, { status }),
  delete: (id: number) => api.delete<void>(`/incidents/${id}`),
};

/** Incident comment endpoints. */
export const commentService = {
  list: (incidentId: number) => api.get<Comment[]>(`/incidents/${incidentId}/comments`),
  create: (incidentId: number, message: string) =>
    api.post<Comment>(`/incidents/${incidentId}/comments`, { message }),
};

/** Incident evidence (file upload/delete) endpoints. */
export const evidenceService = {
  upload: (incidentId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.upload<Evidence>(`/incidents/${incidentId}/evidence`, formData);
  },
  delete: (incidentId: number, evidenceId: number) =>
    api.delete<void>(`/incidents/${incidentId}/evidence/${evidenceId}`),
};

/** Incident investigation endpoints. */
export const investigationService = {
  get: (incidentId: number) => api.get<Investigation>(`/incidents/${incidentId}/investigation`),
  upsert: (incidentId: number, data: Partial<Investigation>) =>
    api.post<Investigation>(`/incidents/${incidentId}/investigation`, data),
};

/** Corrective-action CRUD endpoints. */
export const actionService = {
  list: (incidentId: number) => api.get<CorrectiveAction[]>(`/incidents/${incidentId}/actions`),
  create: (incidentId: number, data: Partial<CorrectiveAction>) =>
    api.post<CorrectiveAction>(`/incidents/${incidentId}/actions`, data),
  update: (actionId: number, data: Partial<CorrectiveAction>) =>
    api.patch<CorrectiveAction>(`/actions/${actionId}`, data),
};

/** Dashboard report-summary endpoints. */
export const reportService = {
  summary: () => api.get<ReportSummary>("/reports/summary"),
};

/** Manual user-creation and update endpoints (admin). */
export const userService = {
  create: (data: { name: string; email: string; password: string; role?: string }) =>
    api.post<User>("/auth/users", data),
  update: (id: number, data: { name?: string; email?: string; role?: string }) =>
    api.patch<UserListItem>(`/auth/users/${id}`, data),
};



/** Guarding-site CRUD endpoints. */
export const guardingSiteService = {
  list: () => api.get<GuardingSite[]>("/guarding-sites"),
  getById: (id: string) => api.get<GuardingSite>(`/guarding-sites/${id}`),
  create: (data: { name: string; address?: string; guards?: { name: string; surname: string; cellphone: string; email: string; employeeId: string; password: string }[] }) => api.post<GuardingSite>("/guarding-sites", data),
  update: (id: string, data: { name?: string; address?: string; status?: string }) =>
    api.put<GuardingSite>(`/guarding-sites/${id}`, data),
  delete: (id: string) => api.delete<void>(`/guarding-sites/${id}`),
};

/** Security-guard CRUD endpoints. */
export const guardService = {
  list: (siteId?: string) => api.get<Guard[]>(`/guards${siteId ? `?siteId=${siteId}` : ""}`),
  getById: (id: string) => api.get<Guard>(`/guards/${id}`),
  create: (data: {
    name: string;
    surname: string;
    cellphone: string;
    email: string;
    employeeId: string;
    siteId?: string;
    password: string;
  }) => api.post<Guard>("/guards", data),
  update: (id: string, data: Partial<Guard>) => api.put<Guard>(`/guards/${id}`, data),
  delete: (id: string) => api.delete<void>(`/guards/${id}`),
};

/** Patrol-report CRUD and query endpoints. */
export const patrolReportService = {
  listByCompany: (params?: { siteId?: string; dateFrom?: string; dateTo?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.siteId) searchParams.set("siteId", params.siteId);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    const qs = searchParams.toString();
    return api.get<PatrolReport[]>(`/patrol-reports${qs ? `?${qs}` : ""}`);
  },
  listBySite: (siteId: string) => api.get<PatrolReport[]>(`/sites/${siteId}/patrol-reports`),
  listByGuard: (guardId: string) => api.get<PatrolReport[]>(`/guards/${guardId}/patrol-reports`),
  getById: (id: string) => api.get<PatrolReport>(`/patrol-reports/${id}`),
  create: (data: {
    siteId: string;
    guardId: string;
    startedAt: string;
    notes?: string;
    checkpoints?: { name: string; scannedAt: string; status?: string }[];
  }) => api.post<PatrolReport>("/patrol-reports", data),
  update: (id: string, data: { completedAt?: string; status?: string; notes?: string }) =>
    api.put<PatrolReport>(`/patrol-reports/${id}`, data),
  delete: (id: string) => api.delete<void>(`/patrol-reports/${id}`),
};

/** Entry-log CRUD and vehicle-flagging endpoints. */
export const entryLogService = {
  listBySite: (siteId: string) => api.get<EntryLog[]>(`/sites/${siteId}/entry-logs`),
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
  }) => api.post<EntryLog>("/entry-logs", data),
  update: (id: string, data: { exitTime?: string; driverName?: string; vehicleDesc?: string; purpose?: string }) =>
    api.put<EntryLog>(`/entry-logs/${id}`, data),
  flagVehicle: (id: string, data: { vehicleReg: string; reason: string }) =>
    api.post<FlaggedVehicle>(`/entry-logs/${id}/flag`, data),
  delete: (id: string) => api.delete<void>(`/entry-logs/${id}`),
};

/** Flagged-vehicle CRUD and resolve endpoints. */
export const flaggedVehicleService = {
  list: (includeResolved?: boolean) =>
    api.get<FlaggedVehicle[]>(`/flagged-vehicles${includeResolved ? "?includeResolved=true" : ""}`),
  getById: (id: string) => api.get<FlaggedVehicle>(`/flagged-vehicles/${id}`),
  create: (data: { vehicleReg: string; reason: string; entryLogId?: string }) =>
    api.post<FlaggedVehicle>("/flagged-vehicles", data),
  resolve: (id: string) => api.post<FlaggedVehicle>(`/flagged-vehicles/${id}/resolve`, {}),
  delete: (id: string) => api.delete<void>(`/flagged-vehicles/${id}`),
};
