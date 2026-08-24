// app/(auth)/login.jsx
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import PasswordField from "../../components/ui/PasswordField";
import TextField from "../../components/ui/TextField";
import KeyboardAwareScrollView from "../../components/ui/KeyboardAwareScrollView";
import { COLORS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import {
  hasValidationErrors,
  normalizeEmail,
  validateLoginForm,
} from "../../utils/authValidation";

export function LoginScreen() {
  const router = useRouter();
  const { login, resolveHomeRoute } = useUserContext();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleLogin = async () => {
    if (submitting) return;

    const nextErrors = validateLoginForm(form);
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      const result = await login(normalizeEmail(form.email), form.password);

      if (result.success) {
        router.replace(resolveHomeRoute(result.user));
        return;
      }

      setErrors({
        email: result.error || " ",
        password: result.error || "Invalid credentials.",
      });
    } catch {
      setErrors({ email: "Unable to login right now.", password: "" });
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
        }}
        minBottomPadding={SPACING.xxl + 40}
      >
        <PageHeader
          title="Welcome Back"
          subtitle="Sign in to your account"
          color={COLORS.primary}
        />

        <Card>
          <TextField
            label="Email or Alias"
            value={form.email}
            onChangeText={(v) => updateField("email", v)}
            placeholder="you@example.com or your alias"
            error={errors.email}
            autoCapitalize="none"
          />
          <PasswordField
            label="Password"
            value={form.password}
            onChangeText={(v) => updateField("password", v)}
            error={errors.password}
          />
        </Card>

        <Button
          title={submitting ? "Signing in…" : "Sign In"}
          onPress={handleLogin}
          variant="primary"
          loading={submitting}
          disabled={submitting}
        />

        <TouchableOpacity
          onPress={() => router.push("/recover")}
          style={{ alignItems: "center", marginTop: SPACING.md }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/sign-up")}
          style={{ alignItems: "center", marginTop: SPACING.sm }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
            New customer? Register
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

export default LoginScreen;
