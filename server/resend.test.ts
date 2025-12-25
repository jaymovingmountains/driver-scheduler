import { describe, expect, it } from "vitest";

describe("Resend API Key Validation", () => {
  it("validates RESEND_API_KEY is configured and valid", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    
    // Check that API key is set
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey?.startsWith("re_")).toBe(true);
    
    // Validate the API key by calling Resend's domains endpoint (lightweight check)
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    
    // A valid API key should return 200, invalid returns 401
    expect(response.status).toBe(200);
  });
});
