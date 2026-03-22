import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient } from "../api.js";
import { BizPrintError } from "../types.js";

const keys = {
  publicKey: "pk_test",
  secretKey: "sk_test",
};

function mockFetch(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    headers: new Headers(headers),
  } as unknown as Response);
}

describe("ApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("get", () => {
    it("should make a signed GET request and return parsed JSON", async () => {
      const printer = { id: 1, title: "Test Printer" };
      const fetchMock = mockFetch(printer);
      vi.stubGlobal("fetch", fetchMock);

      const client = new ApiClient(keys);
      const result = await client.get("/printers/1");

      expect(result).toEqual(printer);
      expect(fetchMock).toHaveBeenCalledOnce();

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain("/printers/1?");
      expect(callUrl).toContain("publicKey=pk_test");
      expect(callUrl).toContain("hash=");
    });

    it("should include query args in the signed URL", async () => {
      const fetchMock = mockFetch([]);
      vi.stubGlobal("fetch", fetchMock);

      const client = new ApiClient(keys);
      await client.get("/printers", { page: "2", perPage: "5" });

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain("page=2");
      expect(callUrl).toContain("perPage=5");
    });

    it("should throw BizPrintError on non-OK response", async () => {
      const errorBody = { errorCode: "ERR_UNAUTHORIZED", message: "Unauthorized" };
      const fetchMock = mockFetch(errorBody, 401);
      vi.stubGlobal("fetch", fetchMock);

      const client = new ApiClient(keys);
      await expect(client.get("/printers/1")).rejects.toThrow(BizPrintError);
      await expect(client.get("/printers/1")).rejects.toMatchObject({
        errorCode: "ERR_UNAUTHORIZED",
        statusCode: 401,
      });
    });

    it("should throw BizPrintError with ERR_UNKNOWN for non-JSON error response", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
        headers: new Headers(),
      } as unknown as Response);
      vi.stubGlobal("fetch", fetchMock);

      const client = new ApiClient(keys);
      await expect(client.get("/printers")).rejects.toMatchObject({
        errorCode: "ERR_UNKNOWN",
        statusCode: 500,
      });
    });
  });

  describe("getList", () => {
    it("should extract data from { data: T[] } envelope", async () => {
      const printers = [{ id: 1 }, { id: 2 }];
      const fetchMock = mockFetch({ data: printers }, 200, {
        "X-Biz-Has-More": "true",
        "X-Biz-Total-All": "10",
        "X-Biz-Total-Pages": "5",
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = new ApiClient(keys);
      const result = await client.getList("/printers", { page: "1", perPage: "2" });

      expect(result.data).toEqual(printers);
      expect(result.pagination).toEqual({
        hasMore: true,
        totalAll: 10,
        totalPages: 5,
      });
    });

    it("should also handle bare array responses", async () => {
      const printers = [{ id: 1 }, { id: 2 }];
      const fetchMock = mockFetch(printers, 200, {
        "X-Biz-Has-More": "false",
        "X-Biz-Total-All": "2",
        "X-Biz-Total-Pages": "1",
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = new ApiClient(keys);
      const result = await client.getList("/printers");

      expect(result.data).toEqual(printers);
    });

    it("should default pagination to false/0 when headers missing", async () => {
      const fetchMock = mockFetch({ data: [] }, 200);
      vi.stubGlobal("fetch", fetchMock);

      const client = new ApiClient(keys);
      const result = await client.getList("/printers");

      expect(result.pagination).toEqual({
        hasMore: false,
        totalAll: 0,
        totalPages: 0,
      });
    });
  });

  describe("post", () => {
    it("should make a signed POST request with JSON body", async () => {
      const job = { id: 1, status: "pending" };
      const fetchMock = mockFetch({ job });
      vi.stubGlobal("fetch", fetchMock);

      const client = new ApiClient(keys);
      const result = await client.post("/jobs", {
        printerId: 1,
        url: "https://example.com/doc.pdf",
        description: "Test",
      });

      expect(result).toEqual({ job });

      const callArgs = fetchMock.mock.calls[0];
      const callUrl = callArgs[0] as string;
      const callOptions = callArgs[1] as RequestInit;

      expect(callUrl).toContain("/jobs");
      expect(callOptions.method).toBe("POST");
      expect(callOptions.headers).toMatchObject({
        "Content-Type": "application/json; charset=utf-8",
      });

      const body = JSON.parse(callOptions.body as string);
      expect(body.publicKey).toBe("pk_test");
      expect(typeof body.time).toBe("number");
      expect(typeof body.hash).toBe("string");
      expect(body.printerId).toBe(1);
    });

    it("should throw BizPrintError with field errors", async () => {
      const errorBody = {
        errorCode: "ERR_VALIDATION",
        message: "Validation failed",
        errors: { url: ["URL is required"] },
      };
      const fetchMock = mockFetch(errorBody, 422);
      vi.stubGlobal("fetch", fetchMock);

      const client = new ApiClient(keys);
      await expect(
        client.post("/jobs", { printerId: 1 }),
      ).rejects.toMatchObject({
        errorCode: "ERR_VALIDATION",
        statusCode: 422,
        fieldErrors: { url: ["URL is required"] },
      });
    });
  });

  describe("custom base URL", () => {
    it("should use provided base URL", async () => {
      const fetchMock = mockFetch({ id: 1 });
      vi.stubGlobal("fetch", fetchMock);

      const client = new ApiClient(keys, "https://custom.api.com/v1");
      await client.get("/printers/1");

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl.startsWith("https://custom.api.com/v1/printers/1?")).toBe(true);
    });
  });
});
