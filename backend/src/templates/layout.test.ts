import { BRAND, alertParagraph, detailCard, emailLayout, greeting, paragraph, signOff } from "./layout";

describe("dark brand palette", () => {
  it("uses a zinc-800 background with light grey surfaces", () => {
    expect(BRAND.background).toBe("#27272a");
    expect(BRAND.surface).toBe("#18181b");
    const html = emailLayout({ body: paragraph("Hello") });
    expect(html).toContain("background-color: #27272a");
    expect(html).toContain("background-color: #18181b");
  });

  it("keeps all body text light enough to read on dark surfaces", () => {
    const html = emailLayout({
      body: greeting("Ada") + paragraph("Body") + alertParagraph("Warning") + detailCard([{ label: "Ref", value: "INC-1" }]) + signOff(),
    });
    expect(html).toContain("#f4f4f5"); // heading / detail labels
    expect(html).toContain("#d4d4d8"); // body + muted
    expect(html).toContain("#f87171"); // alert red readable on dark
    // navy and slate are background/border colours now — never text
    expect(html).not.toMatch(/color: #0b1e33/);
    expect(html).not.toMatch(/color: #1e293b/);
    expect(html).not.toMatch(/color: #334155/);
    expect(html).not.toMatch(/color: #b91c1c/);
  });
});
