import { readCache, writeCache, clearCache } from "./cache";

beforeEach(() => localStorage.clear());

it("round-trips a value and clears only cache keys", () => {
  writeCache("user", { id: 1 });
  localStorage.setItem("accessToken", "tok");
  expect(readCache("user")).toEqual({ id: 1 });

  clearCache();
  expect(readCache("user")).toBeUndefined();
  expect(localStorage.getItem("accessToken")).toBe("tok");
});

it("returns undefined for corrupt JSON instead of throwing", () => {
  localStorage.setItem("cache:user", "{not json");
  expect(readCache("user")).toBeUndefined();
});

it("clears only keys under the given prefix", () => {
  writeCache("user", {});
  writeCache("dashboard:1", {});
  writeCache("dashboard", {});
  clearCache("dashboard:");
  expect(readCache("dashboard:1")).toBeUndefined();
  expect(readCache("dashboard")).toEqual({});
  expect(readCache("user")).toEqual({});
});
