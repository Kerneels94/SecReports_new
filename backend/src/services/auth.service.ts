import crypto from "crypto";
import { prisma } from "../lib/db";
import { hashPassword, comparePassword } from "../lib/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { UnauthorizedError, ConflictError, NotFoundError } from "../lib/errors";
import { sendWelcomeEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from "../lib/mail";

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  companyName: string;
  name: string;
  email: string;
  password: string;
}

interface CreateUserParams {
  name: string;
  email: string;
  password: string;
  role?: string;
  department?: string;
  companyId: number;
  createdBy: number;
}

export const AuthService = {
  async login(params: LoginParams) {
    const user = await prisma.user.findUnique({ where: { email: params.email } });
    if (!user) throw new UnauthorizedError("Invalid email or password");

    const valid = await comparePassword(params.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const payload = { userId: user.id, role: user.role, companyId: user.companyId };

    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
        companyId: user.companyId,
      },
    };
  },

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new UnauthorizedError("User not found");

    const newPayload = { userId: user.id, role: user.role, companyId: user.companyId };

    return {
      accessToken: signAccessToken(newPayload),
      refreshToken: signRefreshToken(newPayload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
        companyId: user.companyId,
      },
    };
  },

  async getMe(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError("User not found");

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      companyId: user.companyId,
    };
  },

  async register(params: RegisterParams) {
    const existingUser = await prisma.user.findUnique({ where: { email: params.email } });
    if (existingUser) throw new ConflictError("Email already in use");

    const existingCompany = await prisma.company.findUnique({ where: { email: params.email } });
    if (existingCompany) throw new ConflictError("Email already in use");

    const passwordHash = await hashPassword(params.password);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: params.companyName, email: params.email },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name: params.name,
          email: params.email,
          passwordHash,
          role: "admin",
        },
      });

      return { company, user };
    });

    sendWelcomeEmail(result.user.email, result.user.name).catch((err) => console.error("[AuthService] Welcome email failed:", err));

    const payload = { userId: result.user.id, role: result.user.role, companyId: result.company.id };

    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        department: result.user.department,
        status: result.user.status,
        companyId: result.user.companyId,
      },
      company: {
        id: result.company.id,
        name: result.company.name,
        email: result.company.email,
      },
    };
  },

  async createUser(params: CreateUserParams) {
    const existing = await prisma.user.findUnique({ where: { email: params.email } });
    if (existing) throw new ConflictError("Email already in use");

    const passwordHash = await hashPassword(params.password);

    const user = await prisma.user.create({
      data: {
        companyId: params.companyId,
        name: params.name,
        email: params.email,
        passwordHash,
        role: (params.role as any) || "reporter",
        department: params.department,
        createdBy: params.createdBy,
      },
    });

    sendWelcomeEmail(user.email, user.name).catch((err) => console.error("[AuthService] Welcome email failed:", err));

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      companyId: user.companyId,
    };
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        email,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const resetLink = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${rawToken}`;
    sendPasswordResetEmail(email, user.name, resetLink).catch((err) => console.error("[AuthService] Password reset email failed:", err));
  },

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired reset token");
    }

    const passwordHash = await hashPassword(newPassword);

    const user = await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      return tx.user.update({
        where: { email: record.email },
        data: { passwordHash },
      });
    });

    sendPasswordChangedEmail(user.email, user.name).catch((err) =>
      console.error("[AuthService] Password changed email failed:", err),
    );
  },

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError("User not found");

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Current password is incorrect");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },

  async listUsers(companyId: number) {
    return prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getUserById(companyId: number, userId: number) {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundError("User not found");
    return user;
  },

  async updateUser(companyId: number, userId: number, data: { name?: string; email?: string; role?: string; department?: string | null }) {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) throw new NotFoundError("User not found");

    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new ConflictError("Email already in use");
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.role !== undefined && { role: data.role as any }),
        ...(data.department !== undefined && { department: data.department }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        status: true,
      },
    });
  },
};
