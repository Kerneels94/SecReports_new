import { generateReferenceNumber } from "./utils";

describe("generateReferenceNumber", () => {
  it("returns a string matching INC-YYYY-XXXXXX pattern", () => {
    const result = generateReferenceNumber();
    const year = new Date().getFullYear();
    expect(result).toMatch(new RegExp(`^INC-${year}-[A-Z0-9]{6}$`));
  });

  it("generates unique values across 100 calls", () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(generateReferenceNumber());
    }
    expect(results.size).toBe(100);
  });
});
