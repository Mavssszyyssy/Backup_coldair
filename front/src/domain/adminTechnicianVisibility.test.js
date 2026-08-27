import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin technician visit visibility", () => {
  it("shows the recorded technician GPS check-in and map action", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src", "components", "ADMIN", "Technicians", "AdminTechnician.js"),
      "utf8",
    );

    expect(source).toContain("GPS check-in verified");
    expect(source).toContain("Open check-in map");
    expect(source).toContain("task?.payload?.checkIn");
  });
});
