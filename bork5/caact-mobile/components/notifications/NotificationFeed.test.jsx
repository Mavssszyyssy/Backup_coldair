import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { PanResponder } from "react-native";
import NotificationFeed from "./NotificationFeed";

test("a left swipe reveals Archive while a vertical scroll leaves the row closed", async () => {
  const responder = jest.spyOn(PanResponder, "create");
  const onOpen = jest.fn();
  const onMove = jest.fn();
  const item = { id: "n1", title: "Order update", unread: true };
  try {
    await render(<NotificationFeed notifications={[item]} onOpen={onOpen} onMove={onMove} t={(label) => label} />);
    expect(screen.queryByRole("button", { name: "Archive: Order update" })).toBeNull();
    const handlers = responder.mock.calls.at(-1)[0];
    expect(handlers.onMoveShouldSetPanResponderCapture(null, { dx: -12, dy: 36 })).toBe(false);
    expect(handlers.onMoveShouldSetPanResponderCapture(null, { dx: -70, dy: 3 })).toBe(true);
    await act(() => handlers.onPanResponderRelease(null, { dx: -70 }));
    await fireEvent.press(screen.getByRole("button", { name: "Archive: Order update" }));
    expect(onMove).toHaveBeenCalledWith(item);
    expect(onOpen).not.toHaveBeenCalled();
  } finally { responder.mockRestore(); }
});
