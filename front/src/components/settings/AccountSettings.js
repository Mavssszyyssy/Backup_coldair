import { Fingerprint, WarningDiamond } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueCard from "../common/boutique/BoutiqueCard";
import BoutiqueInput from "../common/boutique/BoutiqueInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS } from "../common/boutique/BoutiqueTheme";

function AccountSettings({
  user,
  onRequestPasswordChangeEmail,
  onDeleteAccount,
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteData, setDeleteData] = useState({
    password: "",
    confirmText: "",
  });
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingEmailRequest, setLoadingEmailRequest] = useState(false);

  const usesLocalPassword = Boolean(
    user?.authProvider !== "google" || user?.passwordHash,
  );

  const handleDeleteAccount = async () => {
    if (deleteData.confirmText.trim().toUpperCase() !== "DELETE") {
      alert("Please type DELETE to continue.");
      return;
    }
    if (usesLocalPassword && !deleteData.password) {
      alert("Password confirmation is required.");
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

  const handleRequestViaEmail = async () => {
    setLoadingEmailRequest(true);
    try {
      await onRequestPasswordChangeEmail?.();
    } finally {
      setLoadingEmailRequest(false);
    }
  };

  return (
    <BoutiqueCard padding={32}>
      <BoutiqueStack gap={32}>
        <BoutiqueBox direction="row" align="center" gap={12}>
          <BoutiqueBox
            width={40}
            height={40}
            background={BQ_COLORS.bg}
            align="center"
            justify="center"
            style={{ borderRadius: "12px", color: BQ_COLORS.brand }}
          >
            <Fingerprint size={20} weight="bold" />
          </BoutiqueBox>
          <BoutiqueText variant="h2">Security</BoutiqueText>
        </BoutiqueBox>

        <BoutiqueStack gap={16}>
          <BoutiqueBox
            direction="row"
            align="center"
            justify="space-between"
            padding="20px"
            background={BQ_COLORS.bgAlt}
            style={{ borderRadius: "16px" }}
          >
            <BoutiqueStack gap={4}>
              <BoutiqueText weight={700}>Change Password</BoutiqueText>
              <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>
                Send a secure password change link to your email.
              </BoutiqueText>
            </BoutiqueStack>
            <BoutiqueButton
              variant="outline"
              size="sm"
              onClick={handleRequestViaEmail}
              loading={loadingEmailRequest}
              style={{ width: "auto" }}
            >
              Send Link
            </BoutiqueButton>
          </BoutiqueBox>

          <BoutiqueBox
            direction="row"
            align="center"
            justify="space-between"
            padding="20px"
            background={BQ_COLORS.bgAlt}
            style={{ borderRadius: "16px" }}
          >
            <BoutiqueStack gap={4}>
              <BoutiqueText weight={700}>Forgot Password</BoutiqueText>
              <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>
                Use recovery screen if you are logged out.
              </BoutiqueText>
            </BoutiqueStack>
            <Link to="/forgot-password" style={{ textDecoration: "none" }}>
              <BoutiqueButton
                variant="ghost"
                size="sm"
                style={{ width: "auto" }}
              >
                Open
              </BoutiqueButton>
            </Link>
          </BoutiqueBox>

          <BoutiqueBox
            direction="row"
            align="center"
            justify="space-between"
            padding="20px"
            background="#fff1f2"
            style={{
              borderRadius: "16px",
              cursor: "pointer",
              border: "1px solid #fee2e2",
            }}
            onClick={() => setShowDeleteModal(true)}
          >
            <BoutiqueStack gap={4}>
              <BoutiqueText weight={700} color={BQ_COLORS.danger}>
                Delete Account
              </BoutiqueText>
              <BoutiqueText size="13px" color="#991b1b">
                This action is irreversible. Your profile will be removed.
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
          }}
          align="center"
          justify="center"
          onClick={() => setShowDeleteModal(false)}
        >
          <BoutiqueCard
            width="100%"
            style={{ maxWidth: "440px" }}
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
                <BoutiqueText variant="h2">Delete Account</BoutiqueText>
              </BoutiqueBox>

              <BoutiqueText color="#991b1b" weight={600}>
                Warning: This action is permanent and cannot be undone.
              </BoutiqueText>

              <BoutiqueStack gap={20}>
                {usesLocalPassword && (
                  <BoutiqueInput
                    label="Current Password"
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
                  label="Type DELETE to confirm"
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
                  Cancel
                </BoutiqueButton>
                <BoutiqueButton
                  variant="cancel"
                  flex={1}
                  onClick={handleDeleteAccount}
                  loading={loadingDelete}
                >
                  Delete Account
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
