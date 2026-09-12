import { api } from "./api";
import {
  authService,
  incidentService,
  reportService,
  userService,
  adminLedgerService,
} from "./index";

jest.mock("./api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("authService", () => {
  it("login calls api.post with correct path and data", () => {
    const data = { email: "a@b.com", password: "pw" };
    authService.login(data);
    expect(mockApi.post).toHaveBeenCalledWith("/auth/login", data);
  });

  it("register calls api.post with correct path and data", () => {
    const data = { companyName: "C", name: "N", email: "a@b.com", password: "pw" };
    authService.register(data);
    expect(mockApi.post).toHaveBeenCalledWith("/auth/register", data);
  });

  it("me calls api.get with correct path", () => {
    authService.me();
    expect(mockApi.get).toHaveBeenCalledWith("/auth/me");
  });

  it("forgotPassword calls api.post with correct path and email", () => {
    authService.forgotPassword("a@b.com");
    expect(mockApi.post).toHaveBeenCalledWith("/auth/forgot-password", { email: "a@b.com" });
  });

  it("resetPassword calls api.post with correct path, token and password", () => {
    authService.resetPassword("tok", "newpw");
    expect(mockApi.post).toHaveBeenCalledWith("/auth/reset-password", { token: "tok", password: "newpw" });
  });

  it("changePassword calls api.patch with correct path and data", () => {
    authService.changePassword("newpw");
    expect(mockApi.patch).toHaveBeenCalledWith("/auth/me/password", { newPassword: "newpw" });
  });

  it("listUsers calls api.get with correct path", () => {
    authService.listUsers();
    expect(mockApi.get).toHaveBeenCalledWith("/auth/users");
  });

  it("getUserById calls api.get with correct path", () => {
    authService.getUserById(5);
    expect(mockApi.get).toHaveBeenCalledWith("/auth/users/5");
  });
});

describe("incidentService", () => {
  it("list calls api.get with correct path including query params", () => {
    incidentService.list({ page: "1", perPage: "20" });
    expect(mockApi.get).toHaveBeenCalledWith("/incidents?page=1&perPage=20");
  });

  it("list works without params", () => {
    incidentService.list();
    expect(mockApi.get).toHaveBeenCalledWith("/incidents?");
  });

  it("getById calls api.get with correct path", () => {
    incidentService.getById(5);
    expect(mockApi.get).toHaveBeenCalledWith("/incidents/5");
  });

  it("create calls api.post with correct path and data", () => {
    const data = { title: "Incident" };
    incidentService.create(data);
    expect(mockApi.post).toHaveBeenCalledWith("/incidents", data);
  });
});

describe("reportService", () => {
  it("summary calls api.get with correct path", () => {
    reportService.summary();
    expect(mockApi.get).toHaveBeenCalledWith("/reports/summary");
  });

  it("monthlyResponse calls api.get with the response path", () => {
    reportService.monthlyResponse();
    expect(mockApi.get).toHaveBeenCalledWith("/reports/monthly-response");
  });

  it("responseByArea calls api.get with the area path", () => {
    reportService.responseByArea();
    expect(mockApi.get).toHaveBeenCalledWith("/reports/response-by-area");
  });
});

describe("userService", () => {
  it("create calls api.post with correct path and data", () => {
    const data = { name: "Alice", email: "a@b.com", password: "pw", role: "reporter", department: "IT" };
    userService.create(data);
    expect(mockApi.post).toHaveBeenCalledWith("/auth/users", data);
  });

  it("update calls api.patch with correct path and data", () => {
    userService.update(1, { name: "Bob" });
    expect(mockApi.patch).toHaveBeenCalledWith("/auth/users/1", { name: "Bob" });
  });

  it("remove calls api.delete with correct path", () => {
    userService.remove(1);
    expect(mockApi.delete).toHaveBeenCalledWith("/auth/users/1");
  });
});

describe("adminLedgerService", () => {
  it("list calls api.get with the correct path and query params", () => {
    adminLedgerService.list({ companyId: "c1", entryType: "payment", status: "posted" });
    expect(mockApi.get).toHaveBeenCalledWith(
      "/admin/ledger?companyId=c1&entryType=payment&status=posted",
    );
  });

  it("list calls api.get without query params when unfiltered", () => {
    adminLedgerService.list();
    expect(mockApi.get).toHaveBeenCalledWith("/admin/ledger");
  });

  it("summary calls api.get with the summary path", () => {
    adminLedgerService.summary();
    expect(mockApi.get).toHaveBeenCalledWith("/admin/ledger/summary");
  });

  it("getById calls api.get with the correct path", () => {
    adminLedgerService.getById("entry1");
    expect(mockApi.get).toHaveBeenCalledWith("/admin/ledger/entry1");
  });

  it("create calls api.post with the correct path and data", () => {
    const data = {
      companyId: "c1",
      entryType: "payment",
      amount: 150000,
      description: "Payment received",
    };
    adminLedgerService.create(data);
    expect(mockApi.post).toHaveBeenCalledWith("/admin/ledger", data);
  });

  it("voidEntry calls api.patch with the void path", () => {
    adminLedgerService.voidEntry("entry1");
    expect(mockApi.patch).toHaveBeenCalledWith("/admin/ledger/entry1/void");
  });
});
