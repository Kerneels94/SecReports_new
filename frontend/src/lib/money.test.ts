import { randToCents } from "./money";

describe("randToCents", () => {
  it.each([
    ["1500", 150000],
    ["1500.5", 150050],
    ["1500.55", 150055],
    [" 1 500.00 ", 150000],
    ["0.10", 10],
  ])("parses %p as %p cents", (input, cents) => {
    expect(randToCents(input)).toBe(cents);
  });

  it.each(["1,500.00", "1500,00", "abc", "", "1.234", "-5", "12e3"])(
    "rejects %p",
    (input) => {
      expect(randToCents(input)).toBeNull();
    },
  );

  it("accepts a negative amount only when allowed", () => {
    expect(randToCents("-250.00", { allowNegative: true })).toBe(-25000);
  });
});
