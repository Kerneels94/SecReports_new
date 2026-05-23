import { PrismaClient } from "../../src/generated/prisma/client";
import { mockDeep, mockReset } from "jest-mock-extended";

jest.mock("../../src/generated/prisma/client", () => ({
  PrismaClient: jest.fn(() => mockDeep<PrismaClient>()),
}));

const prismaMock = new PrismaClient() as jest.Mocked<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

export { prismaMock };
