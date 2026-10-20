import { useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import PageHeader from "../../../../components/ui/PageHeader";
import StickyActionBar from "../../../../components/ui/StickyActionBar";
import KeyboardAwareScrollView from "../../../../components/ui/KeyboardAwareScrollView";
import MobileLegalConsent from "../../../../components/legal/MobileLegalConsent";
import { COLORS, SPACING } from "../../../../constants/theme";
import { useRegistrationDraft } from "../../../../context/RegistrationDraftContext";
import { hasAllLegalConsents } from "../../../../services/legalConsent";

export default function SignUpStep0() {
  const router = useRouter();
  const { draft, updateDraft, resetDraft } = useRegistrationDraft();
  const [showErrors, setShowErrors] = useState(false);

  const continueRegistration = () => {
    setShowErrors(true);
    if (hasAllLegalConsents(draft.legalConsent)) router.push("/sign-up/step/1");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.md }} minBottomPadding={126}>
        <PageHeader title="Create Account" subtitle="Step 1 of 4: Terms & Privacy" color={COLORS.primary} onBack={() => { resetDraft(); router.replace("/sign-in"); }} />
        <MobileLegalConsent
          value={draft.legalConsent}
          onChange={(legalConsent) => updateDraft({ legalConsent })}
          showErrors={showErrors}
        />
      </KeyboardAwareScrollView>
      <StickyActionBar>
        <Button title="Continue to email verification" onPress={continueRegistration} variant="primary" />
      </StickyActionBar>
    </SafeAreaView>
  );
}
