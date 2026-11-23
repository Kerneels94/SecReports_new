describe("BANK_DETAILS", () => {
  const keys = ["BANK_NAME", "ACCOUNT_HOLDER", "ACCOUNT_NUMBER", "BRANCH_CODE"];
  const saved = keys.map((k) => process.env[k]);

  afterEach(() => keys.forEach((k, i) => (saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i]))));

  it("reads bank details from env", () => {
    process.env.BANK_NAME = "FNB";
    process.env.ACCOUNT_HOLDER = "SecReports";
    process.env.ACCOUNT_NUMBER = "1234567890";
    process.env.BRANCH_CODE = "250655";
    jest.isolateModules(() => {
      const { BANK_DETAILS } = require("./invoice-details");
      expect(BANK_DETAILS).toEqual({
        bankName: "FNB",
        accountHolder: "SecReports",
        accountNumber: "1234567890",
        branchCode: "250655",
      });
    });
  });
});
