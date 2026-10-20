import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
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
import KeyboardAwareScrollView from "../../../../components/ui/KeyboardAwareScrollView";
import { COLORS, FONT, SPACING } from "../../../../constants/theme";
import { getCurrentLocationSnapshot } from "../../../../services/locationService";
import {
  getBarangaysByLocality,
  getLocalitiesByProvince,
  getPhilippineRegions,
  getProvincesByRegion,
} from "../../../../services/philippineAddressService";
import { validateRequired } from "../../../../utils/authValidation";
import { hasAllLegalConsents, LEGAL_VERSION } from "../../../../services/legalConsent";
import { useRegistrationDraft } from "../../../../context/RegistrationDraftContext";
import { useUserContext } from "../../../../context/UserContext";

export default function SignUpStep3() {
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const { register } = useUserContext();
  const [submittingAction, setSubmittingAction] = useState(null);
  const [form, setForm] = useState({
    region: draft.address.region || "",
    regionCode: draft.address.regionCode || "",
    province: draft.address.province || "",
    provinceCode: draft.address.provinceCode || "",
    municipality: draft.address.municipality || "",
    municipalityCode: draft.address.municipalityCode || "",
    submunicipality: draft.address.submunicipality || "",
    submunicipalityCode: draft.address.submunicipalityCode || "",
    thoroughfare: draft.address.thoroughfare || "",
    propertyBlockLot: draft.address.propertyBlockLot || "",
    apartmentUnit: draft.address.apartmentUnit || "",
    landmark: draft.address.landmark || "",
    plusCode: draft.address.plusCode || "",
    locationAddress: draft.address.locationAddress || "",
  });
  const [errors, setErrors] = useState({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [localitiesLoading, setLocalitiesLoading] = useState(true);
  const [barangaysLoading, setBarangaysLoading] = useState(false);

  useEffect(() => {
    updateDraft({ address: form });
  }, [form]);

  useEffect(() => {
    let active = true;
    getPhilippineRegions()
      .then((items) => {
        if (active) setRegions(items);
      })
      .finally(() => {
        if (active) setRegionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!form.regionCode) {
      setProvinces([]);
      return () => { active = false; };
    }
    setProvincesLoading(true);
    getProvincesByRegion(form.regionCode)
      .then((items) => active && setProvinces(items))
      .finally(() => active && setProvincesLoading(false));
    return () => { active = false; };
  }, [form.regionCode]);

  useEffect(() => {
    let active = true;
    if (!form.provinceCode) {
      setLocalities([]);
      setLocalitiesLoading(false);
      return () => { active = false; };
    }
    setLocalitiesLoading(true);
    getLocalitiesByProvince(form.provinceCode, form.regionCode)
      .then((items) => active && setLocalities(items))
      .finally(() => active && setLocalitiesLoading(false));
    return () => { active = false; };
  }, [form.provinceCode, form.regionCode]);

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

  const handleRegionSelect = (item) => {
    setForm((prev) => ({
      ...prev,
      region: item.name,
      regionCode: item.code,
      province: "",
      provinceCode: "",
      municipality: "",
      municipalityCode: "",
      submunicipality: "",
      submunicipalityCode: "",
    }));
    setErrors((prev) => ({
      ...prev,
      region: "",
      province: "",
      municipality: "",
      submunicipality: "",
    }));
  };

  const handleProvinceSelect = (item) => {
    setForm((prev) => ({
      ...prev,
      province: item.name,
      provinceCode: item.code,
      municipality: "",
      municipalityCode: "",
      submunicipality: "",
      submunicipalityCode: "",
    }));
    setErrors((prev) => ({
      ...prev,
      province: "",
      municipality: "",
      submunicipality: "",
    }));
  };

  const handleMunicipalitySelect = (item) => {
    setForm((prev) => ({
      ...prev,
      municipality: item.name,
      municipalityCode: item.code,
      submunicipality: "",
      submunicipalityCode: "",
    }));
    setErrors((prev) => ({ ...prev, municipality: "", submunicipality: "" }));
  };

  const handleBarangaySelect = (item) => {
    setForm((prev) => ({
      ...prev,
      submunicipality: item.name,
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

  const buildAddress = (includeAddress) => {
    const address = includeAddress
      ? [
          form.apartmentUnit.trim(),
          form.propertyBlockLot.trim(),
          form.thoroughfare.trim(),
          form.submunicipality.trim(),
          form.municipality.trim(),
          form.province.trim(),
          form.region.trim(),
        ]
          .filter(Boolean)
          .join(", ")
      : "";

    return {
        address,
        region: includeAddress ? form.region.trim() : "",
        regionCode: includeAddress ? form.regionCode : "",
        province: includeAddress ? form.province.trim() : "",
        provinceCode: includeAddress ? form.provinceCode : "",
        municipality: includeAddress ? form.municipality.trim() : "",
        submunicipality: includeAddress ? form.submunicipality.trim() : "",
        thoroughfare: includeAddress ? form.thoroughfare.trim() : "",
        propertyBlockLot: includeAddress ? form.propertyBlockLot.trim() : "",
        apartmentUnit: includeAddress ? form.apartmentUnit.trim() : "",
        landmark: includeAddress ? form.landmark.trim() : "",
        plusCode: includeAddress ? form.plusCode.trim() : "",
        municipalityCode: includeAddress ? form.municipalityCode : "",
        submunicipalityCode: includeAddress ? form.submunicipalityCode : "",
    };
  };

  const validateAddress = (includeAddress = false) => {
    const nextErrors = {};

    if (includeAddress) {
      [
        ["region", "Region"],
        ["province", "Province"],
        ["municipality", "City or municipality"],
        ["submunicipality", "Barangay"],
        ["thoroughfare", "Street address"],
      ].forEach(([field, label]) => {
        const error = validateRequired(form[field], label);
        if (error) nextErrors[field] = error;
      });
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return false;
    }

    return true;
  };

  const submitRegistration = async (includeAddress) => {
    if (submittingAction || !validateAddress(includeAddress)) return;
    if (!hasAllLegalConsents(draft.legalConsent) || !draft.emailVerified || !draft.registrationVerificationToken || !draft.name_first || !draft.name_last || !draft.password) {
      Alert.alert("Registration incomplete", "Please finish the earlier account steps before creating your account.");
      router.replace("/sign-up/step/0");
      return;
    }
    const address = buildAddress(includeAddress);
    const addressStreet = [address.apartmentUnit, address.propertyBlockLot, address.thoroughfare].filter(Boolean).join(", ");
    const primaryLocation = {
      coordinates: { latitude: null, longitude: null, accuracy: null, timestamp: null },
      address: {
        region: address.region, regionCode: address.regionCode,
        province: address.province, provinceCode: address.provinceCode,
        city: address.municipality, municipalityCode: address.municipalityCode,
        barangay: address.submunicipality, submunicipalityCode: address.submunicipalityCode,
        street: addressStreet, postalCode: "",
      },
      source: "manual",
    };
    setSubmittingAction(includeAddress ? "save" : "skip");
    try {
      const result = await register({
        name_first: draft.name_first.trim(), name_last: draft.name_last.trim(), suffix: draft.suffix.trim(),
        alias: draft.alias.trim(), email: draft.email.trim(), password: draft.password,
        role: "customer", phone: "", contact_method: "email", messenger_handle: "",
        address: address.address, municipality: address.municipality,
        municipality_code: address.municipalityCode, submunicipality: address.submunicipality,
        submunicipality_code: address.submunicipalityCode, thoroughfare: address.thoroughfare,
        property_block_lot: address.propertyBlockLot, apartment_unit: address.apartmentUnit,
        landmark: address.landmark, plus_code: address.plusCode,
        locations: includeAddress ? [primaryLocation] : [],
        legalConsent: { ...draft.legalConsent, version: LEGAL_VERSION },
        registrationVerificationToken: draft.registrationVerificationToken,
      });
      if (!result.success) {
        Alert.alert("Registration Failed", result.error || "Unable to create account.");
        return;
      }
      router.replace({ pathname: "/customer/oobe", params: { registered: "1" } });
    } catch (error) {
      Alert.alert("Registration Failed", error?.message || "Unable to create account right now.");
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: SPACING.md,
          paddingBottom: 112,
        }}
        minBottomPadding={148}
      >
        <PageHeader
          title="Create Account"
          subtitle="Step 4 of 4: Optional delivery address"
          color={COLORS.primary}
          onBack={() => router.back()}
        />

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
            label="Region (optional)"
            value={form.region}
            placeholder="Select region"
            items={regions}
            loading={regionsLoading}
            error={errors.region}
            emptyMessage="No regions found. Check your connection and try again."
            onSelect={handleRegionSelect}
          />
          <BottomSheetSelect
            label="Province (optional)"
            value={form.province}
            placeholder="Select province"
            items={provinces}
            loading={provincesLoading}
            disabled={!form.regionCode}
            error={errors.province}
            emptyMessage={form.regionCode ? "No provinces found." : "Select a region first."}
            onSelect={handleProvinceSelect}
          />
          <BottomSheetSelect
            label="City or municipality (optional)"
            value={form.municipality}
            placeholder="City or municipality"
            items={localities}
            loading={localitiesLoading}
            disabled={!form.provinceCode}
            error={errors.municipality}
            emptyMessage={form.provinceCode ? "No city or municipality matched your search." : "Select a province first."}
            onSelect={handleMunicipalitySelect}
          />
          <BottomSheetSelect
            label="Barangay or district (optional)"
            value={form.submunicipality}
            placeholder="Barangay or district"
            items={barangays}
            loading={barangaysLoading}
            disabled={!form.municipalityCode}
            error={errors.submunicipality}
            emptyMessage={
              form.municipalityCode
                ? "No barangays matched your search."
                : "Select a city or municipality first."
            }
            onSelect={handleBarangaySelect}
          />
          <TextField
            label="Street address (optional)"
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

      </KeyboardAwareScrollView>
      <StickyActionBar>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button
            title={submittingAction === "skip" ? "Creating account..." : "Skip for now"}
            onPress={() => submitRegistration(false)}
            variant="secondary"
            disabled={Boolean(submittingAction)}
            style={{ flex: 1 }}
          />
          <Button
            title={submittingAction === "save" ? "Creating account..." : "Save Location"}
            onPress={() => submitRegistration(true)}
            variant="primary"
            disabled={Boolean(submittingAction)}
            style={{ flex: 1 }}
            leftIcon={<Ionicons name="arrow-forward-sharp" size={18} color={COLORS.surface} />}
          />
        </View>
      </StickyActionBar>
    </SafeAreaView>
  );
}
