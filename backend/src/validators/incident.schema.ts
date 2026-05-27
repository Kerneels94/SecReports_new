import { z } from "zod";

export const createIncidentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  type: z.string().min(1).max(100),
  severity: z.enum(["low", "medium", "high", "critical"]),
  incidentDate: z.string(),
  location: z.string().max(255).optional(),
  operatorName: z.string().min(1).max(255),
  dispatcher: z.string().min(1).max(255),
  dispatchTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  callSign: z.string().max(100).optional(),
  propertyAddress: z.string().max(500).optional(),
  clientName: z.string().max(255).optional(),
  clientCode: z.string().max(100).optional(),
  businessOrComplex: z.string().max(255).optional(),
  sapsReference: z.string().max(100).optional(),
  people: z
    .array(
      z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        contact: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  type: z.string().min(1).max(100).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  incidentDate: z.string().optional(),
  location: z.string().max(255).optional(),
  operatorName: z.string().min(1).max(255).optional(),
  dispatcher: z.string().min(1).max(255).optional(),
  dispatchTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  callSign: z.string().max(100).optional(),
  propertyAddress: z.string().max(500).optional(),
  clientName: z.string().max(255).optional(),
  clientCode: z.string().max(100).optional(),
  businessOrComplex: z.string().max(255).optional(),
  sapsReference: z.string().max(100).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    "draft",
    "submitted",
    "under_review",
    "assigned",
    "investigating",
    "resolved",
    "closed",
    "rejected",
  ]),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  severity: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
