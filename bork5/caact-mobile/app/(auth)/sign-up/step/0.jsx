import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Ionicons from "@expo/vector-icons/Ionicons";
import BottomSheetSelect from "../../../../components/ui/BottomSheetSelect";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import StickyActionBar from "../../../../components/ui/StickyActionBar";
import TextField from "../../../../components/ui/TextField";
import { COLORS, FONT, SPACING } from "../../../../constants/theme";
import { getCurrentLocationSnapshot } from "../../../../services/locationService";
import {
  getBarangaysByLocality,
  getPhilippineLocalities,
} from "../../../../services/philippineAddressService";
import { validatePersonName } from "../../../../utils/authValidation";

export default function SignUpStep0() {
  const router = useRouter();
  const [form, setForm] = useState({
    name_first: "",
    name_last: "",
    suffix: "",
    municipality: "",
    municipalityCode: "",
    submunicipality: "",
    submunicipalityCode: "",
    thoroughfare: "",
    propertyBlockLot: "",
    apartmentUnit: "",
    landmark: "",
    plusCode: "",
    locationAddress: "",
  });
  const [errors, setErrors] = useState({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [localities, setLocalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [localitiesLoading, setLocalitiesLoading] = useState(true);
  const [barangaysLoading, setBarangaysLoading] = useState(false);

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
    setErrors((prev) => ({ ...prev, municipality: "", submunicipality: "" }));
  };

  const handleBarangaySelect = (item) => {
    setForm((prev) => ({
      ...prev,
      submunicipality: item.displayName || item.name,
      submunicipalityCode: item.code,
    }));
    setErrors((prev) => ({ ...prev, submunicipality: "" }));
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const snapshot = await getCurrentLocationSnapshot();
      setForm((prev) => ({
        ...prev,
        plusCode: snapshot.plusCode || "",
        locationAddress: snapshot.displayAddress || "",
      }));

      if (snapshot.plusCode) {
        Alert.alert("Location Found", `Plus Code: ${snapshot.plusCode}`);
      }
    } catch (error) {
      Alert.alert(
        "Location Error",
        error?.message || "Unable to get location.",
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const continueToAccountDetails = (includeAddress) => {
    const address = includeAddress
      ? [
          form.apartmentUnit.trim(),
          form.propertyBlockLot.trim(),
          form.thoroughfare.trim(),
          form.submunicipality.trim(),
          form.municipality.trim(),
        ]
          .filter(Boolean)
          .join(", ")
      : "";

    router.push({
      pathname: "/sign-up/step/1",
      params: {
        name_first: form.name_first.trim(),
        name_last: form.name_last.trim(),
        suffix: form.suffix.trim(),
        address,
        municipality: includeAddress ? form.municipality.trim() : "",
        submunicipality: includeAddress ? form.submunicipality.trim() : "",
        thoroughfare: includeAddress ? form.thoroughfare.trim() : "",
        propertyBlockLot: includeAddress ? form.propertyBlockLot.trim() : "",
        apartmentUnit: includeAddress ? form.apartmentUnit.trim() : "",
        landmark: includeAddress ? form.landmark.trim() : "",
        plusCode: includeAddress ? form.plusCode.trim() : "",
        municipalityCode: includeAddress ? form.municipalityCode : "",
        submunicipalityCode: includeAddress ? form.submunicipalityCode : "",
      },
    });
  };

  const validateNameStep = () => {
    const nextErrors = {};

    const firstNameError = validatePersonName(form.name_first, "First name");
    const lastNameError = validatePersonName(form.name_last, "Last name");

    if (firstNameError) nextErrors.name_first = firstNameError;
    if (lastNameError) nextErrors.name_last = lastNameError;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateNameStep()) continueToAccountDetails(true);
  };

  const handleSkipAddress = () => {
    if (validateNameStep()) continueToAccountDetails(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: SPACING.md,
          paddingBottom: 112,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title="Create Account"
          subtitle="Step 1 of 3: Your name and optional delivery address"
          color={COLORS.primary}
          onBack={() => router.push("/sign-in")}
        />

        <Card>
            <TextField
              label="First Name"
              value={form.name_first}
              onChangeText={(value) => updateNameField("name_first", value)}
              placeholder="First name"
              error={errors.name_first}
            />
            <TextField
              label="Last Name"
              value={form.name_last}
              onChangeText={(value) => updateNameField("name_last", value)}
            placeholder="Last name"
            error={errors.name_last}
          />
          <TextField
            label="Suffix (optional)"
            value={form.suffix}
            onChangeText={(value) => updateField("suffix", value)}
            placeholder="Jr., Sr., III, etc."
          />
        </Card>

        <Card>
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={{ color: COLORS.textPrimary, fontSize: FONT.base, fontWeight: FONT.bold }}>
              Delivery Address (Optional)
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 3 }}>
              Add this now for faster checkout, or skip it and add it when you are ready to order.
            </Text>
          </View>
          <BottomSheetSelect
            label="Municipality (optional)"
            value={form.municipality}
            placeholder="City or municipality"
            items={localities}
            loading={localitiesLoading}
            error={errors.municipality}
            emptyMessage="No city or municipality matched your search."
            onSelect={handleMunicipalitySelect}
          />
          <BottomSheetSelect
            label="Submunicipality (optional)"
            value={form.submunicipality}
            placeholder="Barangay or district"
            items={barangays}
            loading={barangaysLoading}
            disabled={!form.municipalityCode}
            error={errors.submunicipality}
            emptyMessage={
              form.municipalityCode
                ? "No barangays matched your search."
                : "Select a municipality first."
            }
            onSelect={handleBarangaySelect}
          />
          <TextField
            label="Thoroughfare (optional)"
            value={form.thoroughfare}
            onChangeText={(value) => updateField("thoroughfare", value)}
            placeholder="Street name"
            error={errors.thoroughfare}
          />
          <TextField
            label="Property, Block, or Lot"
            value={form.propertyBlockLot}
            onChangeText={(value) => updateField("propertyBlockLot", value)}
            placeholder="Block 5, Lot 12"
          />
          <TextField
            label="Apartment Unit"
            value={form.apartmentUnit}
            onChangeText={(value) => updateField("apartmentUnit", value)}
            placeholder="Unit 101"
          />
          <TextField
            label="Landmark(s) (optional)"
            value={form.landmark}
            onChangeText={(value) => updateField("landmark", value)}
            placeholder="Near the church"
          />

          {form.plusCode ? (
            <View
              style={{
                backgroundColor: COLORS.primaryLight,
                borderRadius: 8,
                padding: SPACING.md,
                marginTop: SPACING.sm,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: SPACING.xs,
                }}
              >
                <Ionicons name="location" size={20} color={COLORS.primary} />
                <Text
                  style={{
                    fontSize: FONT.lg,
                    fontWeight: "800",
                    color: COLORS.textPrimary,
                    marginLeft: SPACING.xs,
                  }}
                >
                  {form.plusCode}
                </Text>
              </View>
              <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>
                {form.locationAddress || "Location found"}
              </Text>
              <TouchableOpacity
                onPress={handleGetLocation}
                disabled={locationLoading}
                activeOpacity={0.7}
                style={{
                  marginTop: SPACING.sm,
                  paddingVertical: SPACING.xs,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="location-sharp"
                  size={16}
                  color={COLORS.primary}
                />
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 12,
                    marginLeft: SPACING.xs,
                  }}
                >
                  Refresh Location
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              title={locationLoading ? "Getting location..." : "Get Location"}
              onPress={handleGetLocation}
              variant="secondary"
              loading={locationLoading}
              disabled={locationLoading}
              style={{ marginTop: SPACING.sm }}
              leftIcon={
                <Ionicons
                  name="location-sharp"
                  size={18}
                  color={COLORS.primary}
                />
              }
            />
          )}
        </Card>

        <TouchableOpacity
          onPress={() => router.push("/sign-in")}
          style={{ alignItems: "center", marginTop: SPACING.md }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
            Already have an account? Sign in
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <StickyActionBar>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button
            title="Skip for Now"
            onPress={handleSkipAddress}
            variant="secondary"
            style={{ flex: 1 }}
          />
          <Button
            title="Next"
            onPress={handleNext}
            variant="primary"
            style={{ flex: 1 }}
            leftIcon={<Ionicons name="arrow-forward-sharp" size={18} color={COLORS.surface} />}
          />
        </View>
      </StickyActionBar>
    </SafeAreaView>
  );
}
