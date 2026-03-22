import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { signGetParams, signPostBody } from "../auth.js";

const keys = {
  publicKey: "pk_test_abc123",
  secretKey: "sk_test_secret456",
};

describe("signGetParams", () => {
  it("should add publicKey, time, and hash to query params", () => {
    const params = signGetParams({}, keys, 1700000000);

    expect(params.get("publicKey")).toBe(keys.publicKey);
    expect(params.get("time")).toBe("1700000000");
    expect(params.get("hash")).toBeTruthy();
  });

  it("should preserve existing query args", () => {
    const params = signGetParams({ page: "2", perPage: "10" }, keys, 1700000000);

    expect(params.get("page")).toBe("2");
    expect(params.get("perPage")).toBe("10");
    expect(params.get("publicKey")).toBe(keys.publicKey);
  });

  it("should produce correct hash", () => {
    const time = 1700000000;
    const params = signGetParams({ page: "1" }, keys, time);

    // Manually compute expected hash
    const base = new URLSearchParams({ page: "1" });
    base.set("publicKey", keys.publicKey);
    base.set("time", String(time));
    const expected = createHash("sha256")
      .update(base.toString() + ":" + keys.secretKey)
      .digest("hex");

    expect(params.get("hash")).toBe(expected);
  });

  it("should use current time when not provided", () => {
    const before = Math.floor(Date.now() / 1000);
    const params = signGetParams({}, keys);
    const after = Math.floor(Date.now() / 1000);

    const time = Number(params.get("time"));
    expect(time).toBeGreaterThanOrEqual(before);
    expect(time).toBeLessThanOrEqual(after);
  });
});

describe("signPostBody", () => {
  it("should add publicKey, time, and hash to body", () => {
    const body = signPostBody(
      { printerId: 1, url: "https://example.com/doc.pdf", description: "Test" },
      keys,
      1700000000,
    );

    expect(body.publicKey).toBe(keys.publicKey);
    expect(body.time).toBe(1700000000);
    expect(typeof body.hash).toBe("string");
  });

  it("should preserve original data fields", () => {
    const data = { printerId: 1, url: "https://example.com/doc.pdf", description: "Test" };
    const body = signPostBody(data, keys, 1700000000);

    expect(body.printerId).toBe(1);
    expect(body.url).toBe("https://example.com/doc.pdf");
    expect(body.description).toBe("Test");
  });

  it("should produce correct hash", () => {
    const time = 1700000000;
    const data = { printerId: 1, url: "https://example.com/doc.pdf", description: "Test" };
    const body = signPostBody(data, keys, time);

    // Manually compute expected hash
    const dataToSign = { ...data, publicKey: keys.publicKey, time };
    const expected = createHash("sha256")
      .update(JSON.stringify(dataToSign) + ":" + keys.secretKey)
      .digest("hex");

    expect(body.hash).toBe(expected);
  });

  it("should use number for time, not string", () => {
    const body = signPostBody({}, keys, 1700000000);
    expect(typeof body.time).toBe("number");
  });

  it("should handle URLs with slashes correctly", () => {
    const data = { url: "https://example.com/path/to/file.pdf" };
    const body = signPostBody(data, keys, 1700000000);

    // Verify the hash is computed with unescaped slashes (JS default)
    const dataToSign = { ...data, publicKey: keys.publicKey, time: 1700000000 };
    const json = JSON.stringify(dataToSign);
    expect(json).toContain("https://example.com/path/to/file.pdf");
    expect(json).not.toContain("\\/");

    const expected = createHash("sha256")
      .update(json + ":" + keys.secretKey)
      .digest("hex");
    expect(body.hash).toBe(expected);
  });
});
