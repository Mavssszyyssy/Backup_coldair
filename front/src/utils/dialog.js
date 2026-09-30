const dispatchDialog = (detail) => new Promise((resolve) => {
  window.dispatchEvent(
    new CustomEvent("app:dialog", {
      detail: { ...detail, resolve },
    }),
  );
});

const confirmDialog = (messageOrOptions, title = "Please Confirm") => {
  const options = typeof messageOrOptions === "string"
    ? { message: messageOrOptions, title }
    : messageOrOptions;
  return dispatchDialog({ type: "confirm", ...options });
};

const alertDialog = (messageOrOptions, title = "Notice") => {
  const options = typeof messageOrOptions === "string"
    ? { message: messageOrOptions, title }
    : messageOrOptions;
  return dispatchDialog({ type: "alert", ...options });
};

const confirmLogout = (onConfirm) => confirmDialog({
  title: "Confirm Logout",
  message: "Are you sure you want to log out of your account?",
  confirmText: "Logout",
  cancelText: "Cancel",
  pendingText: "Logging out...",
  destructive: true,
  onConfirm,
  errorMessage: "Unable to log out. Please try again.",
});

export { alertDialog, confirmDialog, confirmLogout };
