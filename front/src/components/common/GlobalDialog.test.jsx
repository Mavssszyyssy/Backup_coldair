import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import GlobalDialog from "./GlobalDialog";
import { confirmDialog, confirmLogout } from "../../utils/dialog";

afterEach(cleanup);

test("cancelling a shared confirmation leaves the action untouched", async () => {
  const action = vi.fn();
  render(<GlobalDialog />);

  let result;
  act(() => {
    result = confirmDialog({
      title: "Delete Address?",
      message: "This delivery address will be removed.",
      confirmText: "Delete",
      onConfirm: action,
    });
  });

  expect(screen.getByRole("alertdialog", { name: "Delete Address?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  await expect(result).resolves.toBe(false);
  expect(action).not.toHaveBeenCalled();
});

test("an in-progress confirmation cannot be submitted twice", async () => {
  let finishLogout;
  const action = vi.fn(() => new Promise((resolve) => {
    finishLogout = resolve;
  }));
  render(<GlobalDialog />);

  let result;
  act(() => {
    result = confirmLogout(action);
  });

  const confirmButton = screen.getByRole("button", { name: "Logout" });
  fireEvent.click(confirmButton);
  fireEvent.click(confirmButton);

  expect(action).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Logging out..." })).toBeDisabled();

  await act(async () => {
    finishLogout();
    await result;
  });
  await expect(result).resolves.toBe(true);
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

test("escape safely cancels a confirmation", async () => {
  render(<GlobalDialog />);

  let result;
  act(() => {
    result = confirmDialog("Continue with this change?");
  });
  fireEvent.keyDown(document, { key: "Escape" });

  await expect(result).resolves.toBe(false);
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

test("feedback opened by a confirmed action remains visible after the action finishes", async () => {
  render(<GlobalDialog />);

  act(() => {
    confirmDialog({
      title: "Approve Request?",
      message: "Stock will be updated.",
      confirmText: "Approve",
      onConfirm: () => window.alert("Request approved successfully."),
    });
  });
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));

  expect(await screen.findByRole("dialog", { name: "Notice" })).toBeInTheDocument();
  expect(screen.getByText("Request approved successfully.")).toBeInTheDocument();
});
