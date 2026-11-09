import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, signToken, verifyToken } from "../src/lib/auth.js";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });
});

describe("jwt", () => {
  it("round-trips a signed payload", () => {
    const payload = { staffId: "s1", orgId: "o1", role: "caseworker" as const };
    const token = signToken(payload);
    expect(verifyToken(token)).toMatchObject(payload);
  });

  it("rejects a tampered token", () => {
    const token = signToken({ staffId: "s1", orgId: "o1", role: "admin" });
    expect(() => verifyToken(token + "tampered")).toThrow();
  });
});
