import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text, TouchableOpacity } from "react-native";

import ConfirmationProvider from "./ConfirmationProvider";
import { confirmAction } from "../../utils/confirmAction";

function ConfirmationTrigger({ onConfirm }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={() => confirmAction({
        title: "Delete Address?",
        message: "This delivery address will be removed.",
        confirmText: "Delete",
        pendingText: "Deleting...",
        destructive: true,
        onConfirm,
      })}
    >
      <Text>Open Confirmation</Text>
    </TouchableOpacity>
  );
}

test("the mobile confirmation provider cancels without running the action", async () => {
  const action = jest.fn();
  await render(<ConfirmationProvider><ConfirmationTrigger onConfirm={action} /></ConfirmationProvider>);

  fireEvent.press(screen.getByText("Open Confirmation"));
  expect(await screen.findByText("Delete Address?")).toBeTruthy();
  fireEvent.press(screen.getByText("Cancel"));

  await waitFor(() => expect(screen.queryByText("Delete Address?")).toBeNull());
  expect(action).not.toHaveBeenCalled();
});

test("the mobile confirmation provider shows the pending state while submitting", async () => {
  let finishAction;
  const action = jest.fn(() => new Promise((resolve) => {
    finishAction = resolve;
  }));
  await render(<ConfirmationProvider><ConfirmationTrigger onConfirm={action} /></ConfirmationProvider>);

  fireEvent.press(screen.getByText("Open Confirmation"));
  await screen.findByText("Delete Address?");
  fireEvent.press(screen.getByText("Delete"));

  expect(action).toHaveBeenCalledTimes(1);
  expect(await screen.findByText("Deleting...")).toBeTruthy();

  await act(async () => {
    finishAction();
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.queryByText("Delete Address?")).toBeNull());
});
