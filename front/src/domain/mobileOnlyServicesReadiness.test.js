import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readWeb = (...segments) => fs.readFileSync(
  path.resolve(process.cwd(), "src", "components", ...segments),
  "utf8",
);

describe("mobile-only customer service workflow", () => {
  it("does not expose service or warranty submission from the website", () => {
    const services = readWeb("services", "Services.js");
    const contact = readWeb("contact", "ContactForm.js");

    expect(services).toContain("MOBILE APP ONLY");
    expect(services).not.toContain("apiRequest");
    expect(services).not.toContain("/service-requests/me");
    expect(services).not.toContain("/warranties/units/");
    expect(contact).not.toContain('value: "service"');
    expect(contact).not.toContain('value: "warranty"');
    expect(contact).toContain("Messages sent here do not create service appointments");
  });

  it("keeps the real service and warranty creation flows in mobile", () => {
    const mobileServices = fs.readFileSync(
      path.resolve(process.cwd(), "..", "bork5", "caact-mobile", "app", "customer", "services.jsx"),
      "utf8",
    );

    expect(mobileServices).toContain("createServiceRequest");
    expect(mobileServices).toContain("createWarrantyClaim");
    expect(mobileServices).toContain("Submit Warranty Support");
  });

  it("constrains customer-support icons so they cannot cover the page", () => {
    const css = readWeb("contact", "Contact.css");

    expect(css).toContain(".contact-page .contact-icon .contact-info-icon");
    expect(css).toContain("width: 24px !important");
    expect(css).toContain(".contact-page .support-team-icon");
  });
});
