import { WarningDiamond } from "@phosphor-icons/react";
import { useState } from "react";
import { translateText } from "../../utils/customerI18n";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";
import AccountSecurityManagement from "../security/AccountSecurityManagement";

function AccountSettings({
  user,
  onChangePassword,
  onDeleteAccount,
}) {
  const t = (value) => translateText(value, user?.preferences?.language);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteData, setDeleteData] = useState({
    password: "",
    confirmText: "",
  });
  const [loadingDelete, setLoadingDelete] = useState(false);

  const usesLocalPassword = Boolean(
    user?.authProvider !== "google" || user?.passwordHash,
  );

  const handleDeleteAccount = async () => {
    if (deleteData.confirmText.trim().toUpperCase() !== "DELETE") {
      alert(t("Please type DELETE to continue."));
      return;
    }
    if (usesLocalPassword && !deleteData.password) {
      alert(t("Password confirmation is required."));
      return;
    }

    setLoadingDelete(true);
    try {
      await onDeleteAccount({
        password: deleteData.password,
        confirmText: deleteData.confirmText,
      });
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <BoutiqueCard padding={32}>
      <BoutiqueStack gap={32}>
        <AccountSecurityManagement
          user={user}
          onChangePassword={onChangePassword}
        />

        <BoutiqueStack gap={16}>
          <BoutiqueBox
            direction="row"
            align="center"
            justify="space-between"
            padding="20px"
            background={BQ_COLORS.surfaceAlt}
            style={{
              borderRadius: "16px",
              cursor: "pointer",
              border: "1px solid #fee2e2",
            }}
            onClick={() => setShowDeleteModal(true)}
          >
            <BoutiqueStack gap={4}>
              <BoutiqueText weight={700} color={BQ_COLORS.danger}>
                {t("Delete Account")}
              </BoutiqueText>
              <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>
                {t("This action is irreversible. Your profile will be removed.")}
              </BoutiqueText>
            </BoutiqueStack>
            <BoutiqueText weight={800} color={BQ_COLORS.danger}>
              →
            </BoutiqueText>
          </BoutiqueBox>
        </BoutiqueStack>
      </BoutiqueStack>

      {showDeleteModal && (
        <BoutiqueBox
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            padding: "16px",
          }}
          align="center"
          justify="center"
          onClick={() => setShowDeleteModal(false)}
        >
          <BoutiqueCard
            width="100%"
            style={{ maxWidth: "440px", maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}
            padding={40}
            onClick={(e) => e.stopPropagation()}
            className="bq-slide-up"
          >
            <BoutiqueStack gap={24}>
              <BoutiqueBox direction="row" align="center" gap={12}>
                <WarningDiamond
                  size={24}
                  weight="fill"
                  color={BQ_COLORS.danger}
                />
                <BoutiqueText variant="h2">{t("Delete Account")}</BoutiqueText>
              </BoutiqueBox>

              <BoutiqueText color={BQ_COLORS.danger} weight={600}>
                {t("Warning: This action is permanent and cannot be undone.")}
              </BoutiqueText>

              <BoutiqueStack gap={20}>
                {usesLocalPassword && (
                  <BoutiqueInput
                    label={t("Current Password")}
                    language={user?.preferences?.language}
                    type="password"
                    value={deleteData.password}
                    onChange={(e) =>
                      setDeleteData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    required
                  />
                )}
                <BoutiqueInput
                  label={t("Type DELETE to confirm")}
                  placeholder="DELETE"
                  value={deleteData.confirmText}
                  onChange={(e) =>
                    setDeleteData((prev) => ({
                      ...prev,
                      confirmText: e.target.value,
                    }))
                  }
                  required
                />
              </BoutiqueStack>

              <BoutiqueBox direction="row" gap={12} margin="12px 0 0">
                <BoutiqueButton
                  variant="outline"
                  flex={1}
                  onClick={() => setShowDeleteModal(false)}
                >
                  {t("Cancel")}
                </BoutiqueButton>
                <BoutiqueButton
                  variant="cancel"
                  flex={1}
                  onClick={handleDeleteAccount}
                  loading={loadingDelete}
                >
                  {t("Delete Account")}
                </BoutiqueButton>
              </BoutiqueBox>
            </BoutiqueStack>
          </BoutiqueCard>
        </BoutiqueBox>
      )}
    </BoutiqueCard>
  );
}

export default AccountSettings;
