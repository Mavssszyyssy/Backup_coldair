// app/(auth)/sign-up.jsx
// Entry point for multi-step registration; redirects to step/0.
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useRegistrationDraft } from "../../context/RegistrationDraftContext";

export default function SignUpEntry() {
  const router = useRouter();
  const { resetDraft } = useRegistrationDraft();

  useEffect(() => {
    resetDraft();
    router.replace("/sign-up/step/0");
  }, [resetDraft]);

  return null;
}
