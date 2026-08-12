import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";

import CustomerScreen from "../../components/customer/CustomerScreen";
import CustomerSettingsRow, {
  CustomerEditAction,
} from "../../components/customer/CustomerSettingsRow";
import BottomSheetSelect from "../../components/ui/BottomSheetSelect";
import Button from "../../components/ui/Button";
import Section from "../../components/ui/Section";
import StickyActionBar from "../../components/ui/StickyActionBar";
import TextField from "../../components/ui/TextField";
import { COLORS } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import {
  getBarangaysByLocality,
  getPhilippineLocalities,
} from "../../services/philippineAddressService";
import {
  buildEditableProfile,
  buildUpdatedUser,
  validateProfileForm,
} from "../../services/profileService";

export default function CustomerSettingsScreen() {
  const router = useRouter();
  const { current, logout, updateUser } = useUserContext();
  const [form, setForm] = useState(() => buildEditableProfile(current));
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localities, setLocalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [localitiesLoading, setLocalitiesLoading] = useState(true);
  const [barangaysLoading, setBarangaysLoading] = useState(false);
  const [addressNotice, setAddressNotice] = useState("");

  useEffect(() => {
    setForm(buildEditableProfile(current));
    setErrors({});
    setIsEditing(false);
  }, [current]);

  useEffect(() => {
    let active = true;
    getPhilippineLocalities()
      .then((items) => {
        if (active) setLocalities(items);
      })
      .finally(() => {
        if (active) setLocalitiesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!form.municipalityCode) {
      setBarangays([]);
      return () => {
        active = false;
      };
    }

    setBarangaysLoading(true);
    getBarangaysByLocality(form.municipalityCode)
      .then((items) => {
        if (active) setBarangays(items);
      })
      .finally(() => {
        if (active) setBarangaysLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form.municipalityCode]);

  const addressSummary = useMemo(
    () =>
      [
        form.apartmentUnit,
        form.propertyBlockLot,
        form.thoroughfare,
        form.submunicipality,
        form.municipality,
      ]
        .filter(Boolean)
        .join(", ") ||
      form.address ||
      "Not set",
    [form],
  );

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const updateNameField = (key, value) => {
    updateField(key, String(value || "").replace(/[0-9]/g, ""));
  };

  const handleMunicipalitySelect = (item) => {
    setForm((prev) => ({
      ...prev,
      municipality: item.displayName || item.name,
      municipalityCode: item.code,
      submunicipality: "",
      submunicipalityCode: "",
    }));
    setErrors((prev) => ({ ...prev, address: "" }));
  };

  const handleBarangaySelect = (item) => {
    setForm((prev) => ({
      ...prev,
      submunicipality: item.displayName || item.name,
      submunicipalityCode: item.code,
    }));
    setErrors((prev) => ({ ...prev, address: "" }));
  };

  const handleCancelEdit = () => {
    setForm(buildEditableProfile(current));
    setErrors({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    const nextErrors = validateProfileForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const success = await updateUser(buildUpdatedUser(current, form));

      if (!success) {
        Alert.alert("Save Failed", "Unable to update your profile.");
        return;
      }

      setIsEditing(false);
      setAddressNotice("Delivery address saved and ready for checkout.");
      Alert.alert("Delivery Address Saved", "Your delivery address is now ready to use at checkout.");
    } finally {
      setSaving(false);
    }
  };

  const performLogout = async () => {
    await logout();
    router.replace("/sign-in");
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      const confirmed =
        typeof window === "undefined" ||
        window.confirm("Sign out of your customer account?");
      if (confirmed) performLogout();
      return;
    }

    Alert.alert("Sign Out", "Sign out of your customer account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: performLogout },
    ]);
  };

  return (
    <CustomerScreen
      title="Settings"
      subtitle={
        isEditing ? "Editing profile details" : "Account, address, and security"
      }
      contentContainerStyle={{ paddingBottom: isEditing ? 176 : 96 }}
      stickyAction={
        isEditing ? (
          <StickyActionBar>
            <Button
              title={saving ? "Saving..." : "Save Changes"}
              onPress={handleSave}
              loading={saving}
              disabled={saving}
            />
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleCancelEdit}
              disabled={saving}
            />
          </StickyActionBar>
        ) : null
      }
    >
      {addressNotice ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#86efac",
            backgroundColor: "#f0fdf4",
          }}
        >
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={{ marginRight: 8 }} />
          <Text style={{ flex: 1, color: "#166534", fontWeight: "700" }}>{addressNotice}</Text>
        </View>
      ) : null}
      {!isEditing ? (
        <>
          <Section title="Account">
            <CustomerSettingsRow
              icon="person-circle-sharp"
              title={form.name || current?.name || "Customer"}
              subtitle={`${form.alias || "No alias"} - ${form.email || "No email"}`}
              right={<CustomerEditAction onPress={() => setIsEditing(true)} />}
            />
            <CustomerSettingsRow
              icon="call-sharp"
              title="Phone"
              subtitle={form.phone || "No phone on file"}
              right={
                <Ionicons
                  name="checkmark-circle-sharp"
                  size={20}
                  color={COLORS.success}
                />
              }
            />
          </Section>

          <Section title="Service Address">
            <CustomerSettingsRow
              icon="location-sharp"
              title="Primary Address"
              subtitle={addressSummary}
            />
            <CustomerSettingsRow
              icon="navigate-circle-sharp"
              title="Location Reference"
              subtitle={
                form.plusCode || form.landmark || "No landmark or Plus Code set"
              }
            />
          </Section>
        </>
      ) : (
        <>
          <Section title="Account Details">
            <TextField
              label="First Name"
              value={form.name_first}
              onChangeText={(value) => updateNameField("name_first", value)}
              error={errors.name_first}
            />
            <TextField
              label="Last Name"
              value={form.name_last}
              onChangeText={(value) => updateNameField("name_last", value)}
              error={errors.name_last}
            />
            <TextField
              label="Suffix"
              value={form.suffix}
              onChangeText={(value) => updateField("suffix", value)}
            />
            <TextField
              label="Alias"
              value={form.alias}
              onChangeText={(value) => updateField("alias", value)}
              autoCapitalize="none"
              error={errors.alias}
            />
            <TextField label="Email" value={form.email} editable={false} />
            <TextField
              label="Phone"
              value={form.phone}
              onChangeText={(value) => updateField("phone", value)}
              keyboardType="phone-pad"
              error={errors.phone}
            />
          </Section>

          <Section title="Service Address">
            <BottomSheetSelect
              label="Municipality"
              value={form.municipality}
              placeholder="City or municipality"
              items={localities}
              loading={localitiesLoading}
              error={errors.address}
              emptyMessage="No city or municipality matched your search."
              onSelect={handleMunicipalitySelect}
            />
            <BottomSheetSelect
              label="Submunicipality"
              value={form.submunicipality}
              placeholder="Barangay or district"
              items={barangays}
              loading={barangaysLoading}
              disabled={!form.municipalityCode}
              emptyMessage={
                form.municipalityCode
                  ? "No barangays matched your search."
                  : "Select a municipality first."
              }
              onSelect={handleBarangaySelect}
            />
            <TextField
              label="Thoroughfare"
              value={form.thoroughfare}
              onChangeText={(value) => updateField("thoroughfare", value)}
              error={errors.address}
            />
            <TextField
              label="Property, Block, or Lot"
              value={form.propertyBlockLot}
              onChangeText={(value) => updateField("propertyBlockLot", value)}
            />
            <TextField
              label="Apartment Unit"
              value={form.apartmentUnit}
              onChangeText={(value) => updateField("apartmentUnit", value)}
            />
            <TextField
              label="Landmark"
              value={form.landmark}
              onChangeText={(value) => updateField("landmark", value)}
            />
            <TextField
              label="Plus Code"
              value={form.plusCode}
              onChangeText={(value) => updateField("plusCode", value)}
            />
          </Section>
        </>
      )}

      <Section title="Security & Session">
        <CustomerSettingsRow
          icon="shield-checkmark-sharp"
          title="Account Protection"
          subtitle="Password login and verified contact are enabled."
          right={
            <Ionicons
              name="checkmark-circle-sharp"
              size={20}
              color={COLORS.success}
            />
          }
        />
        <CustomerSettingsRow
          icon="log-out-sharp"
          title="Sign Out"
          subtitle="Sign out of this customer account on this device."
          danger
          onPress={handleLogout}
          right={
            <Ionicons
              name="chevron-forward-sharp"
              size={18}
              color={COLORS.danger}
            />
          }
        />
      </Section>
    </CustomerScreen>
  );
}
