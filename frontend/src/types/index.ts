/** A user account within a company. */
export interface User {
  id: number;
  name: string;
  email: string;
  role: "owner" | "manager" | "senior" | "guard" | "superadmin";
  status: "active" | "inactive";
  companyId: number | null;
}

/** An organisation (company) that owns reports and users. */
export interface Company {
  id: number;
  name: string;
  email: string;
}

/** Status values for an incident. */
export type IncidentStatus = "draft" | "investigating" | "resolved" | "closed";

/** A security incident report created by a user. */
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

/** A person associated with a specific incident (e.g. witness, suspect). */
export interface IncidentPerson {
  id: number;
  incidentId: number;
  name: string;
  role: string;
  contact: string | null;
  notes: string | null;
}

/** A comment left on an incident by a user. */
export interface Comment {
  id: number;
  incidentId: number;
  userId: number;
  message: string;
  createdAt: string;
  user?: User;
}

/** Investigation details attached to an incident (findings, root cause, etc.). */
export interface Investigation {
  id: number;
  incidentId: number;
  findings: string | null;
  rootCause: string | null;
  recommendations: string | null;
  closureNotes: string | null;
  completedAt: string | null;
}

/** A corrective action assigned to resolve an incident. */
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

/** An audit trail entry tracking changes to an entity. */
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

/** Standard success response wrapper from the API. */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** Error payload returned by the API on failure. */
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

/** Paginated list response from the API. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

/** Payload for owner/manager login. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Payload for employee (guard) login. */
export interface EmployeeLoginRequest {
  email: string;
  password: string;
}

/** Payload for new company registration. */
export interface RegisterRequest {
  companyName: string;
  name: string;
  email: string;
  password: string;
}

/** Response returned after successful registration. */
export interface RegisterResponse {
  message: string;
}

/** Response returned after successful login. */
export interface LoginResponse {
  accessToken: string;
  user: User;
}

/** A physical site/location that is guarded. */
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

/** A security guard assigned to a site. */
export interface Guard {
  id: string;
  companyId: string;
  siteId: string | null;
  name: string;
  surname: string;
  cellphone: string;
  employeeId: string;
  status: "active" | "inactive" | "on_leave";
  createdAt: string;
  updatedAt: string;
  site?: { id: string; name: string };
  patrolReports?: PatrolReport[];
}

/** A patrol route report completed by a guard. */
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

/** A scanned checkpoint within a patrol report. */
export interface PatrolCheckpoint {
  id: string;
  patrolReportId: string;
  name: string;
  scannedAt: string;
  status: "ok" | "missed" | "late";
  createdAt: string;
}

/** A vehicle/person entry/exit log at a guarded site. */
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

/** An invoice sent to a company. */
export interface Invoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: string;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string; email: string };
  payments?: PaymentHistory[];
}

/** Aggregated revenue statistics for the admin dashboard. */
export interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  paidInvoicesThisYear: number;
  overdueInvoices: number;
  outstandingAmount: number;
  activeCompanies: number;
}

/** Monthly revenue trend data point. */
export interface RevenueTrend {
  month: string;
  year: number;
  revenue: number;
  count: number;
}

/** Company info with subscription for admin view. */
export interface AdminCompany {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    plan: { id: string; name: string; price: number };
  } | null;
  _count?: { users: number; invoices: number };
}

/** Result of generating monthly invoices. */
export interface MonthlyInvoiceResult {
  companyId: string;
  companyName: string;
  invoiceNumber: string;
  status: string;
}

/** A payment record linked to an invoice. */
export interface PaymentHistory {
  id: string;
  companyId: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  invoiceId: string | null;
  createdAt: string;
}

/** A vehicle flagged for security reasons at a site. */
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
