/**
 * Brand colour tokens: green fills (buttons, bars) use a deep green with white text;
 * green text and icons keep the mint accent.
 */
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(__dirname, file), "utf8");
const token = (css: string, name: string) => css.match(new RegExp(`${name}:\\s*([^;\\s]+)`))?.[1];

/** WCAG 2 contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("brand green tokens", () => {
  const site = read("site.css");
  const globals = read("globals.css");

  it("uses deep green for fills on the marketing site and in the app", () => {
    expect(token(site, "--accent-fill")).toBe("#20764b");
    expect(token(globals, "--color-primary-fill")).toBe("#20764b");
  });

  it("puts white text on green fills", () => {
    expect(token(site, "--on-accent")).toBe("#ffffff");
  });

  it("keeps the mint green for text and icons", () => {
    expect(token(site, "--accent")).toBe("#86efac");
    expect(token(globals, "--color-primary")).toBe("#86efac");
  });

  it("meets WCAG AA (4.5:1) for text on green fills", () => {
    expect(contrast(token(site, "--on-accent")!, token(site, "--accent-fill")!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", token(globals, "--color-primary-fill-hover")!)).toBeGreaterThanOrEqual(4.5);
  });

  it("paints primary buttons with the deep green fill", () => {
    const btnPrimary = site.match(/\.btn-primary\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(btnPrimary).toContain("var(--accent-fill)");
  });
});
