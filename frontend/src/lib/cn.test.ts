import { cn } from "./cn";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes via clsx", () => {
    expect(cn("base", false && "hidden", true && "visible")).toBe("base visible");
  });

  it("resolves conflicting tailwind classes (tailwind-merge)", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("bg-red-200", "bg-blue-300")).toBe("bg-blue-300");
  });

  it("handles array arguments", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("handles object arguments", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("ignores falsy values", () => {
    expect(cn("real", null, undefined, false, 0, "")).toBe("real");
  });
});
