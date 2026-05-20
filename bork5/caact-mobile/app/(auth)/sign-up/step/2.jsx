import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import StickyActionBar from "../../../../components/ui/StickyActionBar";
import TextField from "../../../../components/ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../constants/theme";
import { useUserContext } from "../../../../context/UserContext";

const CODE_RESEND_MS = 60 * 1000;
const CODE_EXPIRES_MS = 5 * 60 * 1000;
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

function readParam(value) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function formatSeconds(msRemaining) {
  return Math.max(0, Math.ceil(msRemaining / 1000));
}

export default function SignUpStep2() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { register } = useUserContext();

  const [contactMethod, setContactMethod] = useState("mobile");
  const [mobileNumber, setMobileNumber] = useState("");
  const [messengerHandle, setMessengerHandle] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeExpiresAt, setCodeExpiresAt] = useState(0);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [blockUntil, setBlockUntil] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isBlocked = blockUntil > now;
  const resendCountdown =
    resendAvailableAt > now ? formatSeconds(resendAvailableAt - now) : 0;
  const codeExpiryCountdown =
    codeExpiresAt > now ? formatSeconds(codeExpiresAt - now) : 0;
  const blockCountdown = blockUntil > now ? formatSeconds(blockUntil - now) : 0;
  const codeSent = Boolean(verificationCode);

  const registrationPayload = useMemo(
    () => ({
      name_first: readParam(params.name_first).trim(),
      name_last: readParam(params.name_last).trim(),
      suffix: readParam(params.suffix).trim(),
      alias: readParam(params.alias).trim(),
      email: readParam(params.email).trim(),
      password: readParam(params.password),
      address: readParam(params.address).trim(),
      municipality: readParam(params.municipality).trim(),
      municipality_code: readParam(params.municipalityCode).trim(),
      submunicipality: readParam(params.submunicipality).trim(),
      submunicipality_code: readParam(params.submunicipalityCode).trim(),
      thoroughfare: readParam(params.thoroughfare).trim(),
      property_block_lot: readParam(params.propertyBlockLot).trim(),
      apartment_unit: readParam(params.apartmentUnit).trim(),
      landmark: readParam(params.landmark).trim(),
      plus_code: readParam(params.plusCode).trim(),
      contact_method: contactMethod,
      phone: contactMethod === "mobile" ? `+63${mobileNumber}` : "",
      messenger_handle:
        contactMethod === "messenger" ? messengerHandle.trim() : "",
    }),
    [contactMethod, messengerHandle, mobileNumber, params],
  );

  const resetVerificationSession = () => {
    setVerificationCode("");
    setCodeInput("");
    setCodeExpiresAt(0);
    setResendAvailableAt(0);
    setErrors((prev) => ({ ...prev, code: "" }));
  };

  const clearContactErrors = () => {
    setErrors((prev) => ({ ...prev, mobile: "", messenger: "", code: "" }));
  };

  const validateContactMethod = () => {
    const nextErrors = {};

    if (contactMethod === "mobile") {
      if (!mobileNumber.trim()) {
        nextErrors.mobile = "Mobile number is required.";
      } else if (!/^\d{10}$/.test(mobileNumber.trim())) {
        nextErrors.mobile = "Please enter exactly 10 digits after +63.";
      }
    } else if (!messengerHandle.trim()) {
      nextErrors.messenger = "Facebook Messenger handle is required.";
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const handleSendCode = () => {
    if (isBlocked) {
      Alert.alert(
        "Verification Blocked",
        `Too many failed attempts. Try again in ${blockCountdown}s.`,
      );
      return;
    }

    if (resendCountdown > 0) {
      Alert.alert(
        "Please Wait",
        `You can resend a code in ${resendCountdown}s.`,
      );
      return;
    }

    clearContactErrors();
    if (!validateContactMethod()) {
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const timestamp = Date.now();

    setVerificationCode(code);
    setCodeInput("");
    setCodeExpiresAt(timestamp + CODE_EXPIRES_MS);
    setResendAvailableAt(timestamp + CODE_RESEND_MS);
    setErrors((prev) => ({ ...prev, code: "" }));
  };

  const handleCompleteRegistration = async () => {
    if (submitting) {
      return;
    }

    if (isBlocked) {
      Alert.alert(
        "Verification Blocked",
        `Too many failed attempts. Try again in ${blockCountdown}s.`,
      );
      return;
    }

    clearContactErrors();
    if (!validateContactMethod()) {
      return;
    }

    if (!codeSent) {
      setErrors((prev) => ({
        ...prev,
        code: "Send a verification code first.",
      }));
      return;
    }

    if (codeExpiresAt <= now) {
      setErrors((prev) => ({
        ...prev,
        code: "This verification code has expired. Please request a new one.",
      }));
      return;
    }

    if (!/^\d{6}$/.test(codeInput.trim())) {
      setErrors((prev) => ({
        ...prev,
        code: "Enter the 6-digit verification code.",
      }));
      return;
    }

    if (codeInput.trim() !== verificationCode) {
      const nextAttemptCount = attemptCount + 1;
      setAttemptCount(nextAttemptCount);

      if (nextAttemptCount >= 3) {
        setBlockUntil(Date.now() + BLOCK_DURATION_MS);
        setErrors((prev) => ({
          ...prev,
          code: "Too many failed attempts. Verification is blocked for 1 day.",
        }));
        return;
      }

      setErrors((prev) => ({
        ...prev,
        code: `Incorrect code. ${3 - nextAttemptCount} attempt(s) remaining.`,
      }));
      return;
    }

    setSubmitting(true);
    try {
      const result = await register(registrationPayload);

      if (!result.success) {
        Alert.alert(
          "Registration Failed",
          result.error || "Unable to create account.",
        );
        return;
      }

      router.replace({
        pathname: "/customer/oobe",
        params: { registered: "1" },
      });
    } catch (error) {
      Alert.alert(
        "Registration Failed",
        error?.message || "Unable to create account right now.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: SPACING.md,
          paddingBottom: 126,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title="Create Account"
          subtitle="Step 3 of 3: Contact Verification"
          color={COLORS.primary}
          onBack={() => router.back()}
        />

        <Card>
          <Text
            style={{
              fontSize: FONT.base,
              fontWeight: FONT.bold,
              color: COLORS.textPrimary,
              marginBottom: SPACING.sm,
            }}
          >
            Choose Contact Method
          </Text>

          <TouchableOpacity
            onPress={() => {
              setContactMethod("mobile");
              resetVerificationSession();
              clearContactErrors();
            }}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: SPACING.sm,
              paddingHorizontal: SPACING.md,
              backgroundColor:
                contactMethod === "mobile"
                  ? COLORS.primaryLight
                  : "transparent",
              borderRadius: 8,
              marginBottom: SPACING.xs,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor:
                  contactMethod === "mobile" ? COLORS.primary : COLORS.border,
                justifyContent: "center",
                alignItems: "center",
                marginRight: SPACING.sm,
              }}
            >
              {contactMethod === "mobile" ? (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: COLORS.primary,
                  }}
                />
              ) : null}
            </View>
            <Text style={{ color: COLORS.textPrimary }}>
              Mobile Number (+63)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setContactMethod("messenger");
              resetVerificationSession();
              clearContactErrors();
            }}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: SPACING.sm,
              paddingHorizontal: SPACING.md,
              backgroundColor:
                contactMethod === "messenger"
                  ? COLORS.primaryLight
                  : "transparent",
              borderRadius: 8,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor:
                  contactMethod === "messenger"
                    ? COLORS.primary
                    : COLORS.border,
                justifyContent: "center",
                alignItems: "center",
                marginRight: SPACING.sm,
              }}
            >
              {contactMethod === "messenger" ? (
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: COLORS.primary,
                  }}
                />
              ) : null}
            </View>
            <Text style={{ color: COLORS.textPrimary }}>
              Facebook Messenger
            </Text>
          </TouchableOpacity>
        </Card>

        <Card>
          {contactMethod === "mobile" ? (
            <View style={{ marginBottom: SPACING.sm + 6 }}>
              <Text
                style={{
                  fontSize: FONT.base,
                  color: COLORS.textPrimary,
                  fontWeight: "600",
                  marginBottom: SPACING.xs + 2,
                }}
              >
                Mobile Number
              </Text>
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: RADIUS.md,
                  borderWidth: 1,
                  borderColor: errors.mobile
                    ? COLORS.danger
                    : COLORS.borderInput,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: SPACING.md - 2,
                  paddingVertical: SPACING.md - 2,
                }}
              >
                <Text
                  style={{
                    fontSize: FONT.base,
                    color: COLORS.textPrimary,
                    fontWeight: "600",
                    marginRight: SPACING.xs,
                  }}
                >
                  +63
                </Text>
                <TextInput
                  value={mobileNumber}
                  onChangeText={(value) => {
                    setMobileNumber(value.replace(/\D/g, "").slice(0, 10));
                    resetVerificationSession();
                    setErrors((prev) => ({ ...prev, mobile: "" }));
                  }}
                  placeholder="9123456789"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  style={{
                    flex: 1,
                    fontSize: FONT.base,
                    color: COLORS.textPrimary,
                  }}
                  maxLength={10}
                />
              </View>
              {errors.mobile ? (
                <Text
                  style={{
                    color: COLORS.danger,
                    marginTop: SPACING.xs,
                    fontSize: FONT.sm,
                  }}
                >
                  {errors.mobile}
                </Text>
              ) : null}
            </View>
          ) : (
            <TextField
              label="Facebook Messenger Handle"
              value={messengerHandle}
              onChangeText={(value) => {
                setMessengerHandle(value);
                resetVerificationSession();
                setErrors((prev) => ({ ...prev, messenger: "" }));
              }}
              placeholder="username or profile URL"
              error={errors.messenger}
              autoCapitalize="none"
            />
          )}

          {contactMethod === "messenger" ? (
            <Text
              style={{
                color: COLORS.textSecondary,
                marginBottom: SPACING.sm,
              }}
            >
              Message the company Facebook page first, then enter the handle you
              used here.
            </Text>
          ) : null}

          <Button
            title={
              resendCountdown > 0 && codeSent
                ? `Resend in ${resendCountdown}s`
                : codeSent
                  ? "Resend Verification Code"
                  : "Send Verification Code"
            }
            onPress={handleSendCode}
            variant="secondary"
            style={{ marginTop: SPACING.sm }}
            disabled={resendCountdown > 0 || isBlocked}
          />
        </Card>

        {__DEV__ && codeSent ? (
          <Card
            style={{
              backgroundColor: COLORS.primaryLight,
              borderColor: COLORS.primary,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                fontWeight: FONT.bold,
                color: COLORS.primary,
                marginBottom: SPACING.xs,
              }}
            >
              Debug: Verification Code
            </Text>
            <Text
              style={{
                fontSize: FONT.lg,
                fontWeight: "800",
                color: COLORS.textPrimary,
              }}
            >
              {verificationCode}
            </Text>
            <Text
              style={{
                fontSize: FONT.sm,
                color: COLORS.textSecondary,
                marginTop: SPACING.xs,
              }}
            >
              {contactMethod === "mobile"
                ? `Sent to +63${mobileNumber}`
                : `Sent to ${messengerHandle}`}
            </Text>
            <Text
              style={{
                fontSize: FONT.sm,
                color: COLORS.textSecondary,
                marginTop: SPACING.xs,
              }}
            >
              Expires in {codeExpiryCountdown}s
            </Text>
          </Card>
        ) : null}

        {isBlocked ? (
          <Card
            style={{
              backgroundColor: COLORS.dangerLight,
              borderColor: COLORS.danger,
              borderWidth: 1,
            }}
          >
            <Text style={{ color: COLORS.danger, fontWeight: FONT.bold }}>
              Verification blocked
            </Text>
            <Text style={{ color: COLORS.danger, marginTop: SPACING.xs }}>
              Too many failed attempts. Try again in {blockCountdown}s.
            </Text>
          </Card>
        ) : null}

        <Card>
          <TextField
            label="Verification Code"
            value={codeInput}
            onChangeText={(value) => {
              setCodeInput(value.replace(/\D/g, "").slice(0, 6));
              setErrors((prev) => ({ ...prev, code: "" }));
            }}
            placeholder="Enter 6-digit code"
            keyboardType="number-pad"
            autoCapitalize="none"
            maxLength={6}
            error={errors.code}
          />
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>
            Attempts used: {attemptCount}/3
          </Text>
        </Card>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignItems: "center", marginTop: SPACING.md }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
            Back to previous step
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <StickyActionBar>
        <Button
          title={submitting ? "Creating Account..." : "Complete Registration"}
          onPress={handleCompleteRegistration}
          variant="primary"
          loading={submitting}
          disabled={submitting || isBlocked}
        />
      </StickyActionBar>
    </SafeAreaView>
  );
}
