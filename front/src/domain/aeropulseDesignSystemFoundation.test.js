import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (...segments) => fs.readFileSync(
  path.resolve(process.cwd(), ...segments),
  "utf8",
);

describe("AEROPULSE design system foundation", () => {
  it("uses the official Tailwind Vite plugin without applying Preflight", () => {
    const packageJson = JSON.parse(readProjectFile("package.json"));
    const viteConfig = readProjectFile("vite.config.mjs");
    const theme = readProjectFile("src", "styles", "aeropulse-theme.css");

    expect(packageJson.devDependencies.tailwindcss).toBe("^4.3.3");
    expect(packageJson.devDependencies["@tailwindcss/vite"]).toBe("^4.3.3");
    expect(viteConfig).toContain('import tailwindcss from "@tailwindcss/vite"');
    expect(viteConfig).toContain("tailwindcss()");
    expect(theme).toContain('tailwindcss/theme.css" layer(theme) prefix(tw)');
    expect(theme).toContain('tailwindcss/utilities.css" layer(utilities) prefix(tw)');
    expect(theme).not.toContain("tailwindcss/preflight.css");
  });

  it("defines every required semantic color token", () => {
    const theme = readProjectFile("src", "styles", "aeropulse-theme.css");
    const requiredTokens = [
      "background",
      "foreground",
      "surface",
      "surface-secondary",
      "primary",
      "primary-foreground",
      "secondary",
      "accent",
      "muted",
      "muted-foreground",
      "border",
      "input",
      "success",
      "warning",
      "error",
      "information",
    ];

    requiredTokens.forEach((token) => {
      expect(theme).toContain(`--ap-color-${token}:`);
    });
  });

  it("keeps Boutique as a compatibility layer over the semantic tokens", () => {
    const boutiqueTheme = readProjectFile(
      "src",
      "components",
      "common",
      "boutique",
      "BoutiqueTheme.js",
    );
    const boutiqueCss = readProjectFile(
      "src",
      "components",
      "common",
      "boutique",
      "Boutique.css",
    );

    expect(boutiqueTheme).toContain('brand: "var(--ap-color-primary)"');
    expect(boutiqueTheme).toContain('radiusCard: "var(--ap-radius-card)"');
    expect(boutiqueTheme).not.toContain('radiusCard: "24px"');
    expect(boutiqueCss).not.toMatch(/^\s*:root\s*\{/m);
  });
});
