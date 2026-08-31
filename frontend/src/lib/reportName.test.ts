import { incidentReportFileName } from "./reportName";

describe("incidentReportFileName", () => {
  it("uses the reference number and incident date", () => {
    expect(
      incidentReportFileName({
        id: 1,
        referenceNumber: "INC-2026-ABC123",
        incidentDate: "2026-05-01T00:00:00.000Z",
      }),
    ).toBe("INC-2026-ABC123_2026-05-01.pdf");
  });

  it("strips unsafe characters from the reference number", () => {
    expect(
      incidentReportFileName({
        id: 1,
        referenceNumber: "REF / 0001: X",
        incidentDate: "2026-01-02",
      }),
    ).toBe("REF_0001_X_2026-01-02.pdf");
  });

  it("falls back to the id when reference is missing", () => {
    expect(incidentReportFileName({ id: 7, incidentDate: "2026-01-02" })).toBe(
      "incident-7_2026-01-02.pdf",
    );
  });

  it("omits the date when incident date is missing or invalid", () => {
    expect(incidentReportFileName({ id: 7, referenceNumber: "INC-1" })).toBe("INC-1.pdf");
    expect(
      incidentReportFileName({
        id: 7,
        referenceNumber: "INC-1",
        incidentDate: "not-a-date",
      }),
    ).toBe("INC-1.pdf");
  });
});