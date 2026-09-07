import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import StickyActionBar from "../../../../components/ui/StickyActionBar";
import TextField from "../../../../components/ui/TextField";
import KeyboardAwareScrollView from "../../../../components/ui/KeyboardAwareScrollView";
import { COLORS, FONT, SPACING } from "../../../../constants/theme";
import { useUserContext } from "../../../../context/UserContext";
import {
  requestVerificationOtp,
  verifyRegistrationOtp,
} from "../../../../services/api";

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

  const contactMethod = "email";
  const [codeSent, setCodeSent] = useState(false);
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
  const phoneForApi = "";
  const otpAction = "register_email";
  const otpChannel = "email";
  const addressStreet = [
    readParam(params.apartmentUnit).trim(),
    readParam(params.propertyBlockLot).trim(),
    readParam(params.thoroughfare).trim(),
  ]
    .filter(Boolean)
    .join(", ");
  const primaryLocation = useMemo(
    () => ({
      coordinates: {
        latitude: null,
        longitude: null,
        accuracy: null,
        timestamp: null,
      },
      address: {
        region: readParam(params.region).trim(),
        regionCode: readParam(params.regionCode).trim(),
        province: readParam(params.province).trim(),
        provinceCode: readParam(params.provinceCode).trim(),
        city: readParam(params.municipality).trim(),
        municipalityCode: readParam(params.municipalityCode).trim(),
        barangay: readParam(params.submunicipality).trim(),
        submunicipalityCode: readParam(params.submunicipalityCode).trim(),
        street: addressStreet,
        postalCode: "",
      },
      source: "manual",
    }),
    [addressStreet, params],
  );

  const registrationPayload = useMemo(
    () => ({
      name_first: readParam(params.name_first).trim(),
      name_last: readParam(params.name_last).trim(),
      suffix: readParam(params.suffix).trim(),
      alias: readParam(params.alias).trim(),
      email: readParam(params.email).trim(),
      password: readParam(params.password),
      role: readParam(params.role).trim() || "customer",
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
      phone: phoneForApi,
      messenger_handle: "",
      locations: primaryLocation.address.city ? [primaryLocation] : [],
    }),
    [
      contactMethod,
      params,
      phoneForApi,
      primaryLocation,
    ],
  );

  const clearContactErrors = () => {
    setErrors((prev) => ({ ...prev, mobile: "", code: "" }));
  };

  const validateContactMethod = () => {
    const nextErrors = {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrationPayload.email)) {
      nextErrors.code = "Go back and enter a valid email address.";
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const handleSendCode = async () => {
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

    const timestamp = Date.now();
    setSubmitting(true);

    try {
      let result;
      try {
        result = await requestVerificationOtp({
          action: otpAction,
          channel: otpChannel,
          email: registrationPayload.email,
          phone: phoneForApi,
          messenger_handle: "",
        });
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          code: error?.message || "Unable to send verification code.",
        }));
        return;
      }

      if (!result.success) {
        setErrors((prev) => ({
          ...prev,
          code: result.error || "Unable to send verification code.",
        }));
        return;
      }

      setCodeSent(true);
      setCodeInput("");
      setCodeExpiresAt(result?.expiresAt ? new Date(result.expiresAt).getTime() : timestamp + CODE_EXPIRES_MS);
      setResendAvailableAt(result?.resendAvailableAt ? new Date(result.resendAvailableAt).getTime() : timestamp + CODE_RESEND_MS);
      setErrors((prev) => ({ ...prev, code: "" }));
    } finally {
      setSubmitting(false);
    }
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

    setSubmitting(true);
    try {
      const verification = await verifyRegistrationOtp({
        action: otpAction,
        channel: otpChannel,
        email: registrationPayload.email,
        phone: phoneForApi,
        messenger_handle: "",
        code: codeInput.trim(),
      });

      if (!verification.success) {
        const nextAttemptCount = attemptCount + 1;
        setAttemptCount(nextAttemptCount);

        if (nextAttemptCount >= 5) {
          setBlockUntil(Date.now() + BLOCK_DURATION_MS);
          setErrors((prev) => ({
            ...prev,
            code:
              "Too many failed attempts. Verification is blocked for 1 day.",
          }));
          return;
        }

        setErrors((prev) => ({
          ...prev,
          code:
            verification.error ||
            `Incorrect code. ${5 - nextAttemptCount} attempt(s) remaining.`,
        }));
        return;
      }

      const result = await register({
        ...registrationPayload,
        registrationVerificationToken: verification.registrationVerificationToken,
      });

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
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: SPACING.md,
          paddingBottom: 126,
        }}
        minBottomPadding={150}
      >
        <PageHeader
          title="Create Account"
          subtitle="Step 3 of 3: Email Verification"
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
            Verify your email
          </Text>
          <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>
            A verification code will be sent to {registrationPayload.email || "your email address"}.
          </Text>

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
            disabled={resendCountdown > 0 || isBlocked || submitting}
          />
        </Card>

        {codeSent ? <Card><Text style={{ color: COLORS.textSecondary }}>Code sent by {`email to ${registrationPayload.email}`}. It expires in {codeExpiryCountdown}s.</Text></Card> : null}

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
            Attempts used: {attemptCount}/5
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
      </KeyboardAwareScrollView>
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
