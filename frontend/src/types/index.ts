export interface User {
  id: number;
  name: string;
  email: string;
  role: "owner" | "manager" | "senior" | "guard";
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
  status: IncidentStatus;
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
  message?: string;
  statusCode?: number;
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

export interface EmployeeLoginRequest {
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

// Guarding types
export interface GuardingSite {
  id: string;
  companyId: string;
  name: string;
  address: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  _count?: { guards: number; patrolReports: number; entryLogs: number };
  guards?: Guard[];
  patrolReports?: PatrolReport[];
  entryLogs?: EntryLog[];
}

export interface Guard {
  id: string;
  companyId: string;
  siteId: string | null;
  userId: string;
  name: string;
  surname: string;
  cellphone: string;
  email: string;
  employeeId: string;
  status: "active" | "inactive" | "on_leave";
  createdAt: string;
  updatedAt: string;
  site?: { id: string; name: string };
  user?: { id: string; email: string; role: string };
  patrolReports?: PatrolReport[];
}

export interface PatrolReport {
  id: string;
  siteId: string;
  guardId: string;
  startedAt: string;
  completedAt: string | null;
  status: "in_progress" | "completed" | "cancelled";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  site?: { id: string; name: string };
  guard?: { id: string; name: string; surname: string };
  checkpoints?: PatrolCheckpoint[];
  _count?: { checkpoints: number };
}

export interface PatrolCheckpoint {
  id: string;
  patrolReportId: string;
  name: string;
  scannedAt: string;
  status: "ok" | "missed" | "late";
  createdAt: string;
}

export interface EntryLog {
  id: string;
  siteId: string;
  guardId: string | null;
  driverName: string;
  driverContact: string | null;
  vehicleReg: string;
  vehicleDesc: string | null;
  entryTime: string;
  exitTime: string | null;
  purpose: string | null;
  flaggedVehicleId: string | null;
  createdAt: string;
  updatedAt: string;
  site?: { id: string; name: string };
  guard?: { id: string; name: string; surname: string };
  flaggedVehicle?: FlaggedVehicle | null;
}

export interface FlaggedVehicle {
  id: string;
  companyId: string;
  vehicleReg: string;
  reason: string;
  flaggedById: string;
  resolvedAt: string | null;
  createdAt: string;
  flaggedBy?: { id: string; name: string; surname: string };
  entryLogs?: EntryLog[];
  _count?: { entryLogs: number };
}
