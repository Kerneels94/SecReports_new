export interface User {
  id: number;
  name: string;
  email: string;
  role: "owner" | "manager" | "senior";
  status: "active" | "inactive";
  companyId: number;
}

export interface Company {
  id: number;
  name: string;
  email: string;
}

export interface Incident {
  id: number;
  referenceNumber: string;
  title: string;
  description: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "draft" | "submitted" | "under_review" | "assigned" | "investigating" | "resolved" | "closed" | "rejected";
  incidentDate: string;
  location: string | null;
  operatorName: string;
  dispatcher: string;
  dispatchTime: string | null;
  arrivalTime: string | null;
  callSign: string | null;
  propertyAddress: string | null;
  clientName: string | null;
  clientCode: string | null;
  businessOrComplex: string | null;
  sapsReference: string | null;
  reporterId: number;
  assignedTo: number | null;
  createdAt: string;
  updatedAt: string;
  reporter?: User;
  assignee?: User;
}

export interface IncidentPerson {
  id: number;
  incidentId: number;
  name: string;
  role: string;
  contact: string | null;
  notes: string | null;
}

export interface Evidence {
  id: number;
  incidentId: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  uploadedBy: number;
  createdAt: string;
}

export interface Comment {
  id: number;
  incidentId: number;
  userId: number;
  message: string;
  createdAt: string;
  user?: User;
}

export interface Investigation {
  id: number;
  incidentId: number;
  findings: string | null;
  rootCause: string | null;
  recommendations: string | null;
  closureNotes: string | null;
  completedAt: string | null;
}

export interface CorrectiveAction {
  id: number;
  incidentId: number;
  description: string;
  ownerId: number;
  dueDate: string;
  status: "open" | "in_progress" | "completed" | "overdue";
  completedAt: string | null;
  owner?: User;
}

export interface AuditLog {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  oldValues: unknown;
  newValues: unknown;
  performedBy: number;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  companyName: string;
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  company: Company;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
