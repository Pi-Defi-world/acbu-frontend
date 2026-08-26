import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "../../middleware";

describe("middleware CSP reporting", () => {
  it("points CSP violations at the report endpoint", () => {
    const request = new NextRequest("https://example.com/dashboard");

    const response = middleware(request);
    const policy = response.headers.get("Content-Security-Policy");

    expect(policy).toContain("report-uri /api/csp-report");
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
  });
});
