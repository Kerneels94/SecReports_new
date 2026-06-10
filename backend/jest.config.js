/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest/presets/default",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  setupFiles: ["<rootDir>/jest.setup.ts"],
};

module.exports = config;
