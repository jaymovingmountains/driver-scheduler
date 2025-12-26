import { describe, expect, it, vi, beforeEach } from "vitest";
import { ADMIN_EMAIL } from "./db";

// Mock the notifications module
vi.mock("./notifications", () => ({
  sendLoginCode: vi.fn().mockResolvedValue(true),
}));

describe("Admin Email-Based Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have the correct admin email configured", () => {
    expect(ADMIN_EMAIL).toBe("jay@movingmountainslogistics.com");
  });

  it("should export ADMIN_EMAIL constant", () => {
    expect(typeof ADMIN_EMAIL).toBe("string");
    expect(ADMIN_EMAIL).toContain("@");
  });
});
