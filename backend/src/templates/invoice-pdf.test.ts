import zlib from "zlib";
import { generateInvoicePdf } from "./invoice-pdf";

/** Inflates a PDF's Flate content streams and returns the raw operators. */
function pdfStreams(buf: Buffer): string[] {
  const raw = buf.toString("latin1");
  const out: string[] = [];
  const re = /stream\r?\n([\s\S]*?)endstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    try {
      out.push(zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"));
    } catch {
      continue;
    }
  }
  return out;
}

/** Pulls out the drawn text runs from a PDF's content streams. */
function pdfText(buf: Buffer): string {
  return pdfStreams(buf)
    .map((stream) =>
      stream
        .replace(/\[([^\]]*)\]\s*TJ/g, (_, runs: string) =>
          runs.replace(/<[^>]*>|-?\d+/g, (m: string) => (m[0] === "<" ? m : "")),
        )
        .replace(/<([0-9a-fA-F\s]+)>/g, (_, hex: string) =>
          Buffer.from(hex.replace(/\s/g, ""), "hex").toString("latin1"),
        ),
    )
    .join("\n");
}

const base = {
  companyName: "Acme Security",
  amount: 150000,
  invoiceNumber: "INV-2026-0010",
  dueDate: new Date(2026, 10, 25),
  invoiceDate: new Date(2026, 9, 17),
};

describe("generateInvoicePdf", () => {
  it("returns a valid PDF buffer", async () => {
    const buf = await generateInvoicePdf(base);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("renders the invoice number, company, amount and due date", async () => {
    const text = pdfText(await generateInvoicePdf(base)).replace(/\s+/g, "");
    expect(text).toContain("INV-2026-0010");
    expect(text).toContain("AcmeSecurity");
    expect(text).toContain("R1500,00");
    expect(text).toContain("25November2026");
  });

  it("falls back to the standard item label when no description is given", async () => {
    const text = pdfText(await generateInvoicePdf(base)).replace(/\s+/g, "");
    expect(text).toContain("StandardPackagepayment");
  });
});
