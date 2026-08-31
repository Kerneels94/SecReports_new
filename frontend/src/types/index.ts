export interface TrialStatus {
  isTrial: boolean;
  daysRemaining: number;
  isExpired: boolean;
  trialStartedAt?: string;
  trialEndsAt?: string;
}

/** A user account within a company. */
export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "manager" | "senior" | "superadmin";
  status: "active" | "inactive";
  companyId: number | null;
  trial?: TrialStatus | null;
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

/** An audit log entry with performer details (used in admin audit log view). */
export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues: string | null;
  newValues: string | null;
  performedBy: string;
  createdAt: string;
  performedByUser: {
    id: string;
    name: string;
    email: string;
    company: { id: string; name: string } | null;
  };
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

/** Payload for admin/manager login. */
export interface LoginRequest {
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

/** A patrol schedule template defining a recurring route for a specific day. */
export interface PatrolSchedule {
  id: string;
  companyId: string;
  siteId: string;
  day: string;
  createdAt: string;
  updatedAt: string;
  site?: { id: string; name: string };
  timeSlots?: PatrolScheduleTimeSlot[];
}

/** A time slot within a patrol schedule (e.g., 08:00–09:00 on Monday). */
export interface PatrolScheduleTimeSlot {
  id: string;
  patrolScheduleId: string;
  startTime: string;
  endTime: string;
  order: number;
  createdAt: string;
  checkpoints?: PatrolScheduleCheckpoint[];
}

/** A checkpoint within a patrol schedule time slot. */
export interface PatrolScheduleCheckpoint {
  id: string;
  patrolTimeSlotId: string;
  name: string;
  order: number;
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
  flagged: boolean;
  flagReason: string | null;
  flaggedById: string | null;
  flaggedAt: string | null;
  resolvedAt: string | null;
  resolveReason: string | null;
  createdAt: string;
  updatedAt: string;
  site?: { id: string; name: string };
  guard?: { id: string; name: string; surname: string };
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

/** A single financial ledger entry. Amount is signed integer cents. */
export interface LedgerEntry {
  id: string;
  companyId: string;
  entryType: "invoice" | "payment" | "refund" | "adjustment" | "credit";
  amount: number;
  currency: string;
  description: string | null;
  reference: string | null;
  status: "posted" | "void";
  postedAt: string;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string; email: string };
}

/** Aggregated ledger totals for the admin ledger. */
export interface LedgerSummary {
  totalIn: number;
  totalOut: number;
  netBalance: number;
  entryCount: number;
  byType: { entryType: string; total: number; count: number }[];
}

/** A subscription plan available for companies. */
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  siteLimit: number;
  userLimit: number;
  trialPeriodDays: number | null;
  features: string;
  highlighted: boolean;
}

/** A company's subscription with plan details. */
export interface CompanySubscription {
  id: string;
  companyId: string;
  planId: string;
  status: string;
  currentPeriodStart: string | null;
  trialEndsAt: string | null;
  trialWarningSent: boolean;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlan;
  usage?: {
    sites: number;
    users: number;
  };
}
