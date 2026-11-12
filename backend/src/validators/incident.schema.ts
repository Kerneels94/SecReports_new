/**
 * Incident report validation schemas.
 *
 * @module incident.schema
 */
import { z } from "zod";
import { isoDate } from "./shared";

/** Alarm types an incident can be raised by. */
export const ALARM_TYPES = ["Burglary", "Panic", "Duress"] as const;

/**
 * Validates creation of a new incident report.
 */
export const createIncidentSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or fewer"),
  description: z.string().min(1, "Description is required"),
  type: z
    .string()
    .min(1, "Type is required")
    .max(100, "Type must be 100 characters or fewer"),
  incidentDate: isoDate,
  location: z.string().max(255, "Location must be 255 characters or fewer").optional(),
  operatorName: z
    .string()
    .min(1, "Operator name is required")
    .max(255, "Operator name must be 255 characters or fewer"),
  dispatcher: z
    .string()
    .min(1, "Dispatcher is required")
    .max(255, "Dispatcher must be 255 characters or fewer"),
  dispatchTime: isoDate.optional(),
  arrivalTime: isoDate.optional(),
  callSign: z.string().max(100, "Call sign must be 100 characters or fewer").optional(),
  suburb: z.string().max(255, "Suburb must be 255 characters or fewer").optional(),
  city: z.string().max(255, "City must be 255 characters or fewer").optional(),
  propertyAddress: z
    .string()
    .max(500, "Property address must be 500 characters or fewer")
    .optional(),
  clientName: z.string().max(255, "Client name must be 255 characters or fewer").optional(),
  clientCode: z.string().max(100, "Client code must be 100 characters or fewer").optional(),
  businessOrComplex: z
    .string()
    .max(255, "Business or complex must be 255 characters or fewer")
    .optional(),
  sapsReference: z
    .string()
    .max(100, "SAPS reference must be 100 characters or fewer")
    .optional(),
  alarmType: z.enum(ALARM_TYPES, "Alarm type must be Burglary, Panic or Duress"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

/**
 * Validates query-string pagination and filtering parameters.
 */
export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be a whole number")
    .positive("Page must be 1 or higher")
    .default(1),
  perPage: z.coerce
    .number()
    .int("Page size must be a whole number")
    .positive("Page size must be 1 or higher")
    .max(100, "Page size must be 100 or fewer")
    .default(20),
  status: z.string().optional(),
  search: z.string().optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  type: z.string().optional(),
});
