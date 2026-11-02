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
  /** Permission keys granted to this user's role for their company. */
  permissions?: string[];
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
  suburb: string | null;
  city: string | null;
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
  ipAddress: string | null;
  userAgent: string | null;
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
  userLimit: number;
  reportLimit: number;
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
    users: number;
    reports: number;
  };
}

/** A single permission row in the role × permission matrix. */
export interface PermissionMatrixItem {
  key: string;
  label: string;
  description: string;
  roles: string[];
  defaults: string[];
  isDefault?: boolean;
}

/** Full role × permission matrix for a company. */
export interface PermissionMatrix {
  roles: string[];
  permissions: PermissionMatrixItem[];
}
