import { describe, expect, it } from "vitest";
import { getNotificationId } from "./notificationIdentity";

describe("notification identity", () => {
  it("uses the public id returned by the current alerts API", () => {
    expect(getNotificationId({ id: "alert-1", _id: "legacy-alert-1" })).toBe("alert-1");
  });

  it("keeps older customer alerts actionable when only _id is available", () => {
    expect(getNotificationId({ _id: "legacy-customer-alert-1" })).toBe("legacy-customer-alert-1");
  });

  it("does not build an invalid read endpoint when the alert has no identifier", () => {
    expect(getNotificationId({ title: "Alert" })).toBe("");
  });
});
