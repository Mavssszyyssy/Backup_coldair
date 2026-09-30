import fs from "fs";
import path from "path";

const projectRoot = path.join(__dirname, "..");
const appConfig = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "app.json"), "utf8"),
).expo;
const easConfig = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "eas.json"), "utf8"),
);

const pluginConfig = (name) => {
  const entry = appConfig.plugins.find((plugin) =>
    Array.isArray(plugin) ? plugin[0] === name : plugin === name,
  );
  return Array.isArray(entry) ? entry[1] : {};
};

test("uses an App Store-safe iOS identity, version policy, and HTTPS API", () => {
  expect(appConfig.ios.bundleIdentifier).toBe("com.maviitootie.coldair");
  expect(appConfig.scheme).toBe("coldair");
  expect(appConfig.extra.apiBaseUrl).toMatch(/^https:\/\//);
  expect(easConfig.cli.appVersionSource).toBe("remote");
  expect(easConfig.build.production.autoIncrement).toBe(true);
});

test("keeps App Transport Security enabled and declares exempt encryption", () => {
  expect(
    appConfig.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads,
  ).toBe(false);
  expect(appConfig.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
});

test("requests only iOS permissions used by current features", () => {
  expect(pluginConfig("expo-camera")).toMatchObject({
    microphonePermission: false,
  });
  expect(pluginConfig("expo-location")).toMatchObject({
    locationAlwaysAndWhenInUsePermission: false,
    locationAlwaysPermission: false,
    motionUsagePermission: false,
    isIosBackgroundLocationEnabled: false,
  });
  expect(pluginConfig("expo-notifications")).toMatchObject({
    mode: "production",
    enableBackgroundRemoteNotifications: false,
  });
  expect(pluginConfig("expo-secure-store")).toMatchObject({
    faceIDPermission: false,
  });
});

test("uses a square opaque source icon large enough for App Store artwork", () => {
  const icon = fs.readFileSync(
    path.join(projectRoot, appConfig.icon.replace(/^\.\//, "")),
  );
  const width = icon.readUInt32BE(16);
  const height = icon.readUInt32BE(20);
  const pngColorType = icon.readUInt8(25);

  expect(width).toBeGreaterThanOrEqual(1024);
  expect(height).toBe(width);
  expect(pngColorType).toBe(2);
});
