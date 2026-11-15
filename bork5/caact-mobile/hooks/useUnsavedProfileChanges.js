import { useFocusEffect, usePreventRemove } from "expo-router";
import { useCallback, useRef } from "react";
import { Alert, BackHandler, Keyboard } from "react-native";

export default function useUnsavedProfileChanges({ editing, dirty, saving, closeEditor, t }) {
  const promptOpen = useRef(false);
  const requestExit = useCallback((exit = closeEditor) => {
    if (saving || promptOpen.current) return;
    if (!dirty) {
      exit();
      return;
    }
    Keyboard.dismiss();
    promptOpen.current = true;
    Alert.alert(t("Discard changes?"), t("Your unsaved changes will be lost."), [
      { text: t("Keep Editing"), style: "cancel", onPress: () => { promptOpen.current = false; } },
      { text: t("Discard"), style: "destructive", onPress: () => {
        promptOpen.current = false;
        exit();
      } },
    ], { cancelable: false });
  }, [closeEditor, dirty, saving, t]);

  usePreventRemove(editing && (dirty || saving), ({ repeat }) => {
    requestExit(() => {
      closeEditor();
      repeat();
    });
  });

  useFocusEffect(useCallback(() => {
    if (!editing) return undefined;
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      requestExit();
      return true;
    });
    return () => back.remove();
  }, [editing, requestExit]));

  return requestExit;
}
