import { api } from "./api";
import type {
  LoginRequest,
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
} from "@/types";

interface ReportSummary {
  total: number;
  byStatus: { status: string; _count: { id: number } }[];
  bySeverity: { severity: string; _count: { id: number } }[];
  recent: Incident[];
  assignedToMe: number;
  overdueActions: number;
}

export interface UserListItem {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export const authService = {
  login: (data: LoginRequest) => api.post<LoginResponse>("/auth/login", data),
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

export const commentService = {
  list: (incidentId: number) => api.get<Comment[]>(`/incidents/${incidentId}/comments`),
  create: (incidentId: number, message: string) =>
    api.post<Comment>(`/incidents/${incidentId}/comments`, { message }),
};

export const evidenceService = {
  upload: (incidentId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.upload<Evidence>(`/incidents/${incidentId}/evidence`, formData);
  },
  delete: (incidentId: number, evidenceId: number) =>
    api.delete<void>(`/incidents/${incidentId}/evidence/${evidenceId}`),
};

export const investigationService = {
  get: (incidentId: number) => api.get<Investigation>(`/incidents/${incidentId}/investigation`),
  upsert: (incidentId: number, data: Partial<Investigation>) =>
    api.post<Investigation>(`/incidents/${incidentId}/investigation`, data),
};

export const actionService = {
  list: (incidentId: number) => api.get<CorrectiveAction[]>(`/incidents/${incidentId}/actions`),
  create: (incidentId: number, data: Partial<CorrectiveAction>) =>
    api.post<CorrectiveAction>(`/incidents/${incidentId}/actions`, data),
  update: (actionId: number, data: Partial<CorrectiveAction>) =>
    api.patch<CorrectiveAction>(`/actions/${actionId}`, data),
};

export const reportService = {
  summary: () => api.get<ReportSummary>("/reports/summary"),
};

export const userService = {
  create: (data: { name: string; email: string; password: string; role?: string; department?: string }) =>
    api.post<User>("/auth/users", data),
  update: (id: number, data: { name?: string; email?: string; role?: string; department?: string | null }) =>
    api.patch<UserListItem>(`/auth/users/${id}`, data),
};
