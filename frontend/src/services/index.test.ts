import { api } from "./api";
import {
  authService,
  incidentService,
  reportService,
  commentService,
  evidenceService,
  investigationService,
  actionService,
  userService,
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
    authService.changePassword("oldpw", "newpw");
    expect(mockApi.patch).toHaveBeenCalledWith("/auth/me/password", { currentPassword: "oldpw", newPassword: "newpw" });
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

  it("update calls api.put with correct path and data", () => {
    const data = { title: "Updated" };
    incidentService.update(1, data);
    expect(mockApi.put).toHaveBeenCalledWith("/incidents/1", data);
  });
});

describe("reportService", () => {
  it("summary calls api.get with correct path", () => {
    reportService.summary();
    expect(mockApi.get).toHaveBeenCalledWith("/reports/summary");
  });
});

describe("commentService", () => {
  it("list calls api.get with correct path", () => {
    commentService.list(1);
    expect(mockApi.get).toHaveBeenCalledWith("/incidents/1/comments");
  });

  it("create calls api.post with correct path and message", () => {
    commentService.create(1, "Nice work");
    expect(mockApi.post).toHaveBeenCalledWith("/incidents/1/comments", { message: "Nice work" });
  });
});

describe("evidenceService", () => {
  it("upload calls api.upload with correct path and formData", () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    evidenceService.upload(1, file);

    expect(mockApi.upload).toHaveBeenCalledTimes(1);
    const [path, formData] = mockApi.upload.mock.calls[0] as [string, FormData];
    expect(path).toBe("/incidents/1/evidence");
    expect(formData.get("file")).toEqual(file);
  });

  it("delete calls api.delete with correct path", () => {
    evidenceService.delete(1, 99);
    expect(mockApi.delete).toHaveBeenCalledWith("/incidents/1/evidence/99");
  });
});

describe("investigationService", () => {
  it("get calls api.get with correct path", () => {
    investigationService.get(1);
    expect(mockApi.get).toHaveBeenCalledWith("/incidents/1/investigation");
  });

  it("upsert calls api.post with correct path and data", () => {
    const data = { findings: "Found issue" };
    investigationService.upsert(1, data);
    expect(mockApi.post).toHaveBeenCalledWith("/incidents/1/investigation", data);
  });
});

describe("actionService", () => {
  it("list calls api.get with correct path", () => {
    actionService.list(1);
    expect(mockApi.get).toHaveBeenCalledWith("/incidents/1/actions");
  });

  it("create calls api.post with correct path and data", () => {
    const data = { description: "Fix it" };
    actionService.create(1, data);
    expect(mockApi.post).toHaveBeenCalledWith("/incidents/1/actions", data);
  });

  it("update calls api.patch with correct path and data", () => {
    const data = { status: "completed" };
    actionService.update(10, data);
    expect(mockApi.patch).toHaveBeenCalledWith("/actions/10", data);
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
});
