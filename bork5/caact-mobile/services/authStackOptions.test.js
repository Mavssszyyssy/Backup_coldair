import { AUTH_STACK_OPTIONS } from "../utils/authStackOptions";

test("authentication screens do not allow swipe gestures to trigger navigation", () => {
  expect(AUTH_STACK_OPTIONS).toMatchObject({
    gestureEnabled: false,
    fullScreenGestureEnabled: false,
  });
});
