import contactTemplate from "./contact";

describe("contactTemplate", () => {
  const base = {
    name: "Thabo Mokoena",
    email: "thabo@acmesecurity.co.za",
    company: "Acme Security",
    message: "We manage 12 sites and need pricing for 20 users.",
  };

  it("renders all submitted fields", () => {
    const html = contactTemplate(base);
    expect(html).toContain("Thabo Mokoena");
    expect(html).toContain("thabo@acmesecurity.co.za");
    expect(html).toContain("Acme Security");
    expect(html).toContain("We manage 12 sites and need pricing for 20 users.");
    expect(html).toContain("New Website Enquiry");
  });

  it("uses the shared brand layout", () => {
    const html = contactTemplate(base);
    expect(html).toContain("SecReports");
    expect(html).toContain("Incident Management Platform");
    expect(html).toContain("#0b1e33");
  });

  it("preserves line breaks in the message", () => {
    const html = contactTemplate({ ...base, message: "Line one\nLine two" });
    expect(html).toContain("white-space: pre-wrap");
  });

  it("shows a placeholder when no company is supplied", () => {
    const html = contactTemplate({ ...base, company: "" });
    expect(html).toContain("Not provided");
  });

  it("escapes HTML in untrusted fields", () => {
    const html = contactTemplate({
      ...base,
      name: '<script>alert("x")</script>',
      company: "<b>Acme</b>",
      message: "5 < 6 & 7 > 3",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Acme</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;Acme&lt;/b&gt;");
    expect(html).toContain("5 &lt; 6 &amp; 7 &gt; 3");
  });
});