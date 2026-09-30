import { Alert } from "react-native";

let presentConfirmation = null;

export function registerConfirmationPresenter(presenter) {
  presentConfirmation = presenter;
  return () => {
    if (presentConfirmation === presenter) presentConfirmation = null;
  };
}

export async function confirmAction({
  title = "Confirm Action",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  pendingText = "Processing...",
  destructive = false,
  onConfirm,
  errorMessage = "Unable to complete this action. Please try again.",
}) {
  const options = {
    title,
    message,
    confirmText,
    cancelText,
    pendingText,
    destructive,
    onConfirm,
    errorMessage,
  };

  if (presentConfirmation) return presentConfirmation(options);

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? "destructive" : "default",
          onPress: () => {
            Promise.resolve(onConfirm?.())
              .then(() => resolve(true))
              .catch((error) => {
                console.error(`${title} confirm action failed:`, error);
                resolve(false);
              });
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
