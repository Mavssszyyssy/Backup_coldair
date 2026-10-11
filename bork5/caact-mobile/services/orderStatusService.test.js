import { resolveOrderTimelineEndState } from "./orderStatusService";

test("completed orders finish with a check instead of a current-stage marker", () => {
  expect(resolveOrderTimelineEndState("complete", [{ stage: "placed" }, { stage: "completed" }])).toBe("completed");
  expect(resolveOrderTimelineEndState("complete", [{ label: "Submitted" }, { label: "Completed" }])).toBe("completed");
});

test("active or reopened installations still show the current stage", () => {
  expect(resolveOrderTimelineEndState("to_install", [{ stage: "installation" }])).toBe("current");
  expect(resolveOrderTimelineEndState("complete", [{ stage: "visit:scheduled" }])).toBe("current");
});

test("cancelled orders use a distinct terminal marker", () => {
  expect(resolveOrderTimelineEndState("cancelled", [{ stage: "cancelled" }])).toBe("cancelled");
});
