import config from "../../vercel.json";

const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key, value]));

describe("Vercel response security headers", () => {
  it("covers the SPA while preserving asset caching and client-side routes", () => {
    expect(config.headers[0].source).toBe("/(.*)");
    expect(config.headers.find(({ source }) => source === "/assets/(.*)")?.headers)
      .toEqual(expect.arrayContaining([expect.objectContaining({ key: "Cache-Control" })]));
    expect(config.rewrites).toContainEqual({ source: "/(.*)", destination: "/index.html" });
  });

  it("uses matching frame protections and leaves needed location access available", () => {
    expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("geolocation=(self)");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Permissions-Policy"]).toContain("microphone=()");
  });

  it("stages a restrictive CSP without blocking checkout before preview verification", () => {
    const policy = headers["Content-Security-Policy-Report-Only"];
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).toContain("connect-src 'self' https://api.coldair-act.online");
    expect(policy).toContain("frame-ancestors 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-(?:inline|eval)'/);
    expect(headers).not.toHaveProperty("Content-Security-Policy");
    expect(headers).not.toHaveProperty("Strict-Transport-Security");
    expect(headers).not.toHaveProperty("Access-Control-Allow-Origin");
  });
});
