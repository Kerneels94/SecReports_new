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

describe("light theme", () => {
  const globals = read("globals.css");
  const light = globals.match(/\[data-theme="light"\]\s*\{([^}]*)\}/)?.[1] ?? "";

  it("emits tokens as CSS vars so the theme can switch at runtime", () => {
    expect(globals).not.toMatch(/@theme\s+inline/);
  });

  it("overrides surface and text tokens", () => {
    expect(token(light, "--color-surface")).toBeDefined();
    expect(token(light, "--color-text")).toBeDefined();
  });

  it("meets WCAG AA (4.5:1) for text on light surfaces", () => {
    for (const bg of ["--color-surface", "--color-surface-secondary"]) {
      expect(contrast(token(light, "--color-text")!, token(light, bg)!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token(light, "--color-text-secondary")!, token(light, bg)!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token(light, "--color-primary")!, token(light, bg)!)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("loading placeholders", () => {
  it("use the themed skeleton colour, not a fixed zinc", () => {
    const globals = read("globals.css");
    const light = globals.match(/\[data-theme="light"\]\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(token(globals, "--color-skeleton")).toBe("#52525b"); // dark unchanged (was bg-zinc-600)
    expect(token(light, "--color-skeleton")).toBeDefined();
    expect(read("(dashboard)/dashboard/page.tsx")).not.toContain("bg-zinc-600");
  });
});

describe("pale palette text", () => {
  // Toast keeps pale text: it sits on an opaque dark fill in both themes.
  const files = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === "Toast" ? [] : files(p);
      return /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
    });

  it("has a light: override so it stays readable on white", () => {
    const pale = /(?<![:\w-])((?:hover:)?)text-([a-z]+)-[234]00\b/g;
    const missing: string[] = [];
    for (const file of files(path.join(__dirname, ".."))) {
      fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (line.trimStart().startsWith("//")) return;
        for (const [, hover, colour] of line.matchAll(pale)) {
          if (!line.includes(`light:${hover}text-${colour}-`)) missing.push(`${path.relative(__dirname, file)}:${i + 1}`);
        }
      });
    }
    expect(missing).toEqual([]);
  });
});
