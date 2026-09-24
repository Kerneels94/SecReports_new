/**
 * Incident report validation schemas.
 *
 * @module incident.schema
 */
import { z } from "zod";

/**
 * Validates creation of a new incident report.
 */
export const createIncidentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  type: z.string().min(1).max(100),
  incidentDate: z.string(),
  location: z.string().max(255).optional(),
  operatorName: z.string().min(1).max(255),
  dispatcher: z.string().min(1).max(255),
  dispatchTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  callSign: z.string().max(100).optional(),
  suburb: z.string().max(255).optional(),
  city: z.string().max(255).optional(),
  propertyAddress: z.string().max(500).optional(),
  clientName: z.string().max(255).optional(),
  clientCode: z.string().max(100).optional(),
  businessOrComplex: z.string().max(255).optional(),
  sapsReference: z.string().max(100).optional(),
});

/**
 * Validates query-string pagination and filtering parameters.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  type: z.string().optional(),
});
