import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || "localhost",
  user: process.env.DATABASE_USER || "root",
  password: process.env.DATABASE_PASSWORD || "password",
  database: process.env.DATABASE_NAME || "SecReports",
  port: Number(process.env.DATABASE_PORT) || 3306,
  connectionLimit: 5,
});

export const prisma = new PrismaClient({ adapter });
