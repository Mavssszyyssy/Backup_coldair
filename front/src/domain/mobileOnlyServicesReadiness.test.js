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
    expect(mobileServices).toContain("Submit Warranty Claim");
  });

  it("keeps customer-support contact details static and icons constrained", () => {
    const css = readWeb("contact", "Contact.css");
    const contactInfo = readWeb("contact", "ContactInfo.js");

    expect(contactInfo).toContain('<dl className="contact-detail-list">');
    expect(contactInfo).not.toContain("<button");
    expect(css).toContain(".contact-page .contact-detail-icon svg");
    expect(css).toContain("width: 25px");
    expect(css).toContain(".contact-page .support-team-icon");
  });

  it("keeps the customer-support content centered with responsive page padding", () => {
    const contact = readWeb("contact", "Contact.js");
    const css = readWeb("contact", "Contact.css");

    expect(contact).toContain('<main className="contact-page">');
    expect(css).toContain("max-width: 1280px");
    expect(css).toContain("margin: 0 auto");
    expect(css).toContain("padding: 36px 28px 48px");
  });
});
