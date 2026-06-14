/**
 * Exports a singleton PrismaClient instance used throughout the application
 * for all MongoDB database operations.
 */
import { PrismaClient } from "../generated/prisma/client";

export const prisma = new PrismaClient();
