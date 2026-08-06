import invoiceTemplate from "./invoice";

describe("invoiceTemplate", () => {
  const base = {
    companyName: "Acme Security",
    amount: 150050,
    invoiceNumber: "INV-2026-0001",
  };

  it("includes company name, invoice number, and formatted amount", () => {
    const html = invoiceTemplate(base).replace(/\u00a0/g, " ");
    expect(html).toContain("Acme Security");
    expect(html).toContain("#INV-2026-0001");
    expect(html).toContain("R 1 500,50");
  });

  it("includes the sender and package item details", () => {
    const html = invoiceTemplate(base);
    expect(html).toContain("To Company");
    expect(html).toContain("From Company");
    expect(html).toContain("SecReports");
    expect(html).toContain("support@secreports.co.za");
    expect(html).toContain("Standard Package payment");
    expect(html).toContain("Amount Due");
    expect(html).toContain("Banking Details");
    expect(html).toContain("Reference: #INV-2026-0001");
  });

  it("renders the From block before the To block", () => {
    const html = invoiceTemplate(base);
    expect(html.indexOf("From Company")).toBeLessThan(html.indexOf("To Company"));
  });

  it("renders due date between invoice date and invoice number", () => {
    const html = invoiceTemplate({ ...base, dueDate: "2026-09-07T00:00:00.000Z" });
    expect(html).toContain("Invoice Date");
    expect(html).toContain("Due Date");
    expect(html.indexOf("Invoice Date")).toBeLessThan(html.indexOf("Due Date"));
    expect(html.indexOf("Due Date")).toBeLessThan(html.indexOf("#INV-2026-0001"));
  });

  it("shows a placeholder due date when none is provided", () => {
    const html = invoiceTemplate(base);
    expect(html).toContain("Due Date");
  });

  it("renders the invoice link when provided", () => {
    const html = invoiceTemplate({ ...base, invoiceLink: "https://secreports.co.za/invoices/1" });
    expect(html).toContain("https://secreports.co.za/invoices/1");
    expect(html).toContain("View Invoice");
  });

  it("omits the invoice link when not provided", () => {
    const html = invoiceTemplate(base);
    expect(html).not.toContain("View Invoice");
  });

  it("escapes HTML in company and invoice number", () => {
    const html = invoiceTemplate({
      companyName: "<script>alert('x')</script>",
      invoiceNumber: "INV-<b>1</b>",
      amount: 100,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;");
  });

  it("produces well-formed rows with a balanced table", () => {
    const html = invoiceTemplate(base);
    const openRows = (html.match(/<tr>/g) || []).length;
    const closeRows = (html.match(/<\/tr>/g) || []).length;
    const openCells = (html.match(/<td/g) || []).length;
    const closeCells = (html.match(/<\/td>/g) || []).length;
    expect(openRows).toBe(closeRows);
    expect(openCells).toBe(closeCells);
  });
});
