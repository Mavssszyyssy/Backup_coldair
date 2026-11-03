import { useCallback } from "react";

import { useUserContext } from "../context/UserContext";
import { translateText } from "../services/interfaceI18n";

export function useInterfaceLanguage() {
  const { current, updateLanguage } = useUserContext();
  const language = current?.preferences?.language === "Filipino" ? "Filipino" : "English";
  const t = useCallback((text) => translateText(text, language), [language]);
  return { language, t, updateLanguage };
}
