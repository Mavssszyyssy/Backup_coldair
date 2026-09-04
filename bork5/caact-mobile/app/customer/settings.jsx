import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, Platform, Text, TouchableOpacity, View } from "react-native";

import CustomerScreen from "../../components/customer/CustomerScreen";
import CustomerSettingsRow, { CustomerEditAction } from "../../components/customer/CustomerSettingsRow";
import BottomSheetSelect from "../../components/ui/BottomSheetSelect";
import Button from "../../components/ui/Button";
import Section from "../../components/ui/Section";
import StickyActionBar from "../../components/ui/StickyActionBar";
import TextField from "../../components/ui/TextField";
import { COLORS, FONT, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import {
  getBarangaysByLocality,
  getLocalitiesByProvince,
  getPhilippineRegions,
  getProvincesByRegion,
  resolvePhilippineAddressSelection,
} from "../../services/philippineAddressService";
import { buildEditableProfile } from "../../services/profileService";
import {
  getPostalCodeHint,
  getSuggestedPostalCode,
  validatePostalCodeForAddress,
} from "../../services/postalCodeValidation";
import {
  canonicalizePhMobile,
  sanitizePhMobileInput,
  validatePersonName,
  validatePhone,
  validateRequired,
} from "../../utils/authValidation";

const toText = (value) => String(value || "").trim();
const addressId = (address) => String(address?._id || address?.id || "");
const fullName = (user) => [user?.name_first, user?.name_last, user?.suffix].filter(Boolean).join(" ").trim() || user?.name || "Customer";
const addressLine = (address = {}) => [address.street, address.barangay, address.city, address.province, address.region].filter(Boolean).join(", ");

function blankAddress(user = {}) {
  return {
    label: "Home",
    type: "home",
    name: fullName(user),
    phone: canonicalizePhMobile(user?.phone || ""),
    region: "",
    regionCode: "",
    province: "",
    provinceCode: "",
    city: "",
    municipalityCode: "",
    barangay: "",
    submunicipalityCode: "",
    street: "",
    postalCode: "",
    isDefault: !Array.isArray(user?.addresses) || user.addresses.length === 0,
  };
}

function editableAddress(address, user) {
  if (!address) return blankAddress(user);
  return {
    ...blankAddress(user),
    ...address,
    city: address.city || user?.municipality || "",
    barangay: address.barangay || user?.submunicipality || "",
    street: address.street || "",
    phone: canonicalizePhMobile(address.phone || user?.phone || ""),
    regionCode: address.regionCode || "",
    provinceCode: address.provinceCode || "",
    municipalityCode: address.municipalityCode || "",
    submunicipalityCode: address.submunicipalityCode || "",
  };
}

function validateAddressForm(form) {
  const errors = {};
  const nameError = validateRequired(form.name, "Recipient name");
  const phoneError = validatePhone(form.phone);
  const regionError = validateRequired(form.region, "Region");
  const provinceError = validateRequired(form.province, "Province");
  const cityError = validateRequired(form.city, "City or municipality");
  const barangayError = validateRequired(form.barangay, "Barangay");
  const streetError = validateRequired(form.street, "Street address");
  if (nameError) errors.name = nameError;
  if (phoneError) errors.phone = phoneError;
  if (regionError) errors.region = regionError;
  if (provinceError) errors.province = provinceError;
  if (cityError) errors.city = cityError;
  if (barangayError) errors.barangay = barangayError;
  if (streetError) errors.street = streetError;
  const postalCodeError = validatePostalCodeForAddress(form);
  if (postalCodeError) errors.postalCode = postalCodeError;
  return errors;
}

export default function CustomerSettingsScreen() {
  const router = useRouter();
  const {
    current,
    logout,
    updateMyAccount,
    saveDeliveryAddress,
    deleteDeliveryAddress,
  } = useUserContext();
  const [profileForm, setProfileForm] = useState(() => buildEditableProfile(current));
  const [profileErrors, setProfileErrors] = useState({});
  const [editingProfile, setEditingProfile] = useState(false);
  const [addressForm, setAddressForm] = useState(null);
  const [addressErrors, setAddressErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [localitiesLoading, setLocalitiesLoading] = useState(true);
  const [barangaysLoading, setBarangaysLoading] = useState(false);
  const addressEditorRequest = useRef(0);

  const addresses = Array.isArray(current?.addresses) ? current.addresses : [];
  const isEditingAddress = Boolean(addressForm);
  const isEditing = editingProfile || isEditingAddress;

  useEffect(() => {
    setProfileForm(buildEditableProfile(current));
    if (!isEditingAddress) setAddressForm(null);
  }, [current]);

  useEffect(() => {
    let active = true;
    getPhilippineRegions().then((items) => active && setRegions(items)).finally(() => active && setRegionsLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const regionCode = addressForm?.regionCode;
    if (!regionCode) {
      setProvinces([]);
      return () => { active = false; };
    }
    setProvincesLoading(true);
    getProvincesByRegion(regionCode).then((items) => active && setProvinces(items)).finally(() => active && setProvincesLoading(false));
    return () => { active = false; };
  }, [addressForm?.regionCode]);

  useEffect(() => {
    let active = true;
    const provinceCode = addressForm?.provinceCode;
    if (!provinceCode) {
      setLocalities([]);
      setLocalitiesLoading(false);
      return () => { active = false; };
    }
    setLocalitiesLoading(true);
    getLocalitiesByProvince(provinceCode, addressForm?.regionCode).then((items) => active && setLocalities(items)).finally(() => active && setLocalitiesLoading(false));
    return () => { active = false; };
  }, [addressForm?.provinceCode, addressForm?.regionCode]);

  useEffect(() => {
    let active = true;
    const localityCode = addressForm?.municipalityCode;
    if (!localityCode) {
      setBarangays([]);
      return () => { active = false; };
    }
    setBarangaysLoading(true);
    getBarangaysByLocality(localityCode).then((items) => active && setBarangays(items)).finally(() => active && setBarangaysLoading(false));
    return () => { active = false; };
  }, [addressForm?.municipalityCode]);

  const updateProfileField = (key, value) => {
    setProfileForm((previous) => ({ ...previous, [key]: value }));
    setProfileErrors((previous) => ({ ...previous, [key]: "" }));
  };
  const updateAddressField = (key, value) => {
    setAddressForm((previous) => ({ ...previous, [key]: value }));
    setAddressErrors((previous) => ({ ...previous, [key]: "" }));
  };

  const openAddressEditor = async (address = null) => {
    setEditingProfile(false);
    setAddressErrors({});
    const draft = editableAddress(address, current);
    const requestId = ++addressEditorRequest.current;
    setAddressForm(draft);

    if (address && (!draft.regionCode || !draft.provinceCode || !draft.municipalityCode)) {
      const resolved = await resolvePhilippineAddressSelection(draft);
      if (addressEditorRequest.current !== requestId) return;
      setAddressForm((previous) => previous ? ({
        ...previous,
        region: resolved.region?.name || previous.region,
        regionCode: resolved.region?.code || previous.regionCode,
        province: resolved.province?.name || previous.province,
        provinceCode: resolved.province?.code || previous.provinceCode,
        city: resolved.locality?.name || previous.city,
        municipalityCode: resolved.locality?.code || previous.municipalityCode,
        barangay: resolved.barangay?.name || previous.barangay,
        submunicipalityCode: resolved.barangay?.code || previous.submunicipalityCode,
      }) : previous);
    }
  };
  const closeEditor = () => {
    Keyboard.dismiss();
    addressEditorRequest.current += 1;
    setEditingProfile(false);
    setAddressForm(null);
    setProfileErrors({});
    setAddressErrors({});
  };

  const selectRegion = (item) => {
    setAddressForm((previous) => ({
      ...previous,
      region: item.name,
      regionCode: item.code,
      province: "",
      provinceCode: "",
      city: "",
      municipalityCode: "",
      barangay: "",
      submunicipalityCode: "",
      postalCode: "",
    }));
    setAddressErrors((previous) => ({ ...previous, region: "", province: "", city: "", barangay: "", postalCode: "" }));
  };

  const selectProvince = (item) => {
    setAddressForm((previous) => ({
      ...previous,
      province: item.name,
      provinceCode: item.code,
      city: "",
      municipalityCode: "",
      barangay: "",
      submunicipalityCode: "",
      postalCode: "",
    }));
    setAddressErrors((previous) => ({ ...previous, province: "", city: "", barangay: "", postalCode: "" }));
  };

  const selectLocality = (item) => {
    setAddressForm((previous) => {
      const nextAddress = {
        ...previous,
        city: item.name,
        municipalityCode: item.code,
        barangay: "",
        submunicipalityCode: "",
        postalCode: "",
      };
      return { ...nextAddress, postalCode: getSuggestedPostalCode(nextAddress) };
    });
    setAddressErrors((previous) => ({ ...previous, city: "", barangay: "", postalCode: "" }));
  };

  const selectBarangay = (item) => {
    setAddressForm((previous) => ({
      ...previous,
      barangay: item.name,
      submunicipalityCode: item.code,
    }));
    setAddressErrors((previous) => ({ ...previous, barangay: "" }));
  };

  const saveProfile = async () => {
    Keyboard.dismiss();
    const errors = {};
    const firstNameError = validatePersonName(profileForm.name_first, "First name");
    const lastNameError = validatePersonName(profileForm.name_last, "Last name");
    const aliasError = validateRequired(profileForm.alias, "Alias");
    const phoneError = toText(profileForm.phone) ? validatePhone(profileForm.phone) : "";
    if (firstNameError) errors.name_first = firstNameError;
    if (lastNameError) errors.name_last = lastNameError;
    if (aliasError) errors.alias = aliasError;
    if (phoneError) errors.phone = phoneError;
    setProfileErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const profilePayload = {
        name_first: toText(profileForm.name_first),
        name_last: toText(profileForm.name_last),
        suffix: toText(profileForm.suffix),
        alias: toText(profileForm.alias),
      };
      if (toText(profileForm.phone)) profilePayload.phone = canonicalizePhMobile(profileForm.phone);
      const result = await updateMyAccount(profilePayload);
      if (!result.success) return Alert.alert("Save failed", result.error || "Unable to update your account.");
      setNotice("Account details updated.");
      setEditingProfile(false);
    } finally { setSaving(false); }
  };

  const saveAddress = async () => {
    Keyboard.dismiss();
    const errors = validateAddressForm(addressForm || {});
    setAddressErrors(errors);
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      const existingId = addressId(addressForm);
      const result = await saveDeliveryAddress({
        label: toText(addressForm.label) || "Delivery address",
        type: addressForm.type || "home",
        name: toText(addressForm.name),
        phone: canonicalizePhMobile(addressForm.phone),
        region: toText(addressForm.region),
        regionCode: toText(addressForm.regionCode),
        province: toText(addressForm.province),
        provinceCode: toText(addressForm.provinceCode),
        city: toText(addressForm.city),
        municipalityCode: toText(addressForm.municipalityCode),
        barangay: toText(addressForm.barangay),
        submunicipalityCode: toText(addressForm.submunicipalityCode),
        street: toText(addressForm.street),
        postalCode: toText(addressForm.postalCode),
        isDefault: Boolean(addressForm.isDefault),
      }, existingId);
      if (!result.success) {
        if (result.errors) setAddressErrors(result.errors);
        return Alert.alert("Address not saved", result.error || "Check the address details and try again.");
      }
      setNotice(existingId ? "Delivery address updated and branch refreshed." : "Delivery address added and branch assigned.");
      setAddressForm(null);
    } finally { setSaving(false); }
  };

  const confirmDeleteAddress = (address) => {
    const remove = async () => {
      setSaving(true);
      try {
        const result = await deleteDeliveryAddress(addressId(address));
        if (!result.success) return Alert.alert("Address not deleted", result.error || "Unable to delete this address.");
        setNotice("Delivery address deleted. The service branch was refreshed.");
        setAddressForm(null);
      } finally { setSaving(false); }
    };
    if (Platform.OS === "web") {
      if (typeof window === "undefined" || window.confirm("Delete this delivery address?")) void remove();
      return;
    }
    Alert.alert("Delete address", "This address will no longer be available at checkout.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void remove() },
    ]);
  };

  const performLogout = async () => { await logout(); router.replace("/sign-in"); };
  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined" || window.confirm("Sign out of your customer account?")) void performLogout();
      return;
    }
    Alert.alert("Sign Out", "Sign out of this customer account?", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: performLogout }]);
  };

  const subtitle = isEditingAddress ? (addressId(addressForm) ? "Edit delivery address" : "Add your first delivery address") : editingProfile ? "Edit account details" : "Account, delivery addresses, and security";
  const zipCodeHint = addressForm ? getPostalCodeHint(addressForm) : "";

  return (
    <CustomerScreen
      title="Account"
      subtitle={subtitle}
      contentContainerStyle={{ paddingBottom: isEditing ? 176 : 96 }}
      stickyAction={isEditing ? <StickyActionBar><Button title={saving ? "Saving..." : isEditingAddress ? "Save Address" : "Save Account"} onPress={isEditingAddress ? saveAddress : saveProfile} loading={saving} disabled={saving} /><Button title="Cancel" variant="secondary" onPress={closeEditor} disabled={saving} /></StickyActionBar> : null}
    >
      {notice ? <View style={{ flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#86efac", backgroundColor: "#f0fdf4" }}><Ionicons name="checkmark-circle" size={20} color={COLORS.success} /><Text style={{ flex: 1, color: "#166534", fontWeight: "700" }}>{notice}</Text></View> : null}

      {!isEditing ? <>
        <Section title="Account">
          <CustomerSettingsRow icon="person-circle-sharp" title={fullName(current)} subtitle={`${current?.alias || "No alias"} · ${current?.email || "No email"}`} right={<CustomerEditAction onPress={() => { setAddressForm(null); setEditingProfile(true); }} />} />
          <CustomerSettingsRow icon="call-sharp" title="Phone" subtitle={current?.phone || "No phone on file"} />
        </Section>
        <Section title="Delivery Addresses">
          {addresses.length ? addresses.map((address) => {
            const details = addressLine(address) || "Address details incomplete";
            const addressIssue = validatePostalCodeForAddress(address);
            return <CustomerSettingsRow key={addressId(address)} icon={address.isDefault ? "location-sharp" : "location-outline"} title={`${address.label || "Delivery address"}${address.isDefault ? " · Default" : ""}`} subtitle={addressIssue ? `${details}\nNeeds review: ${addressIssue}` : details} color={addressIssue ? COLORS.warning : COLORS.primary} onPress={() => openAddressEditor(address)} />;
          }) : <View style={{ paddingVertical: SPACING.sm }}><Text style={{ color: COLORS.textSecondary, lineHeight: 20 }}>No delivery address saved yet. You can add one whenever you are ready to check out.</Text></View>}
          <Button title={addresses.length ? "Add another address" : "Add delivery address"} variant="secondary" onPress={() => openAddressEditor()} />
        </Section>
        <Section title="Security & Session">
          <CustomerSettingsRow icon="shield-checkmark-sharp" title="Account Protection" subtitle="Password login and verified contact are enabled." />
          <CustomerSettingsRow icon="log-out-sharp" title="Sign Out" subtitle="Sign out of this customer account on this device." danger onPress={handleLogout} />
        </Section>
        <Section title="Help & Support">
          <CustomerSettingsRow icon="help-buoy-sharp" title="Frequently Asked Questions" subtitle="Orders, payments, delivery, warranty, and AC care" onPress={() => router.push("/customer/faq")} />
          <CustomerSettingsRow icon="chatbubble-ellipses-sharp" title="Contact Customer Support" subtitle="Get help with an order or service request" onPress={() => router.push("/customer/contact")} />
        </Section>
      </> : isEditingAddress ? <>
        <Section title="Address details">
          <TextField label="Address label" value={addressForm.label} onChangeText={(value) => updateAddressField("label", value)} placeholder="Home, office, etc." />
          <TextField label="Recipient name" value={addressForm.name} onChangeText={(value) => updateAddressField("name", value)} error={addressErrors.name} />
          <TextField label="Mobile number" value={addressForm.phone} onChangeText={(value) => updateAddressField("phone", sanitizePhMobileInput(value))} keyboardType="phone-pad" placeholder="09XXXXXXXXX" maxLength={12} error={addressErrors.phone} showKeyboardDone />
          <BottomSheetSelect label="Region" value={addressForm.region} placeholder="Select region" items={regions} loading={regionsLoading} error={addressErrors.region} emptyMessage="No regions found. Check your connection and try again." onSelect={selectRegion} />
          <BottomSheetSelect label="Province" value={addressForm.province} placeholder="Select province" items={provinces} loading={provincesLoading} disabled={!addressForm.regionCode} error={addressErrors.province} emptyMessage={addressForm.regionCode ? "No provinces found." : "Select a region first."} onSelect={selectProvince} />
          <BottomSheetSelect label="City or municipality" value={addressForm.city} placeholder="Select city or municipality" items={localities} loading={localitiesLoading} disabled={!addressForm.provinceCode} error={addressErrors.city} emptyMessage={addressForm.provinceCode ? "No city or municipality matched your search." : "Select a province first."} onSelect={selectLocality} />
          <BottomSheetSelect label="Barangay or district" value={addressForm.barangay} placeholder="Select barangay" items={barangays} loading={barangaysLoading} disabled={!addressForm.municipalityCode} error={addressErrors.barangay} emptyMessage={addressForm.municipalityCode ? "No barangays matched your search." : "Select a city or municipality first."} onSelect={selectBarangay} />
          <TextField label="Street address" value={addressForm.street} onChangeText={(value) => updateAddressField("street", value)} placeholder="House, block, lot, street" error={addressErrors.street} />
          <TextField label="ZIP Code *" value={addressForm.postalCode} onChangeText={(value) => updateAddressField("postalCode", value.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" inputMode="numeric" maxLength={4} autoCorrect={false} autoComplete="postal-code" textContentType="postalCode" error={addressErrors.postalCode} helperText={zipCodeHint} showKeyboardDone />
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: Boolean(addressForm.isDefault), disabled: Boolean(addressForm.isDefault || saving) }}
            disabled={addressForm.isDefault || saving}
            onPress={() => updateAddressField("isDefault", true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING.sm + 4,
              padding: SPACING.md,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: addressForm.isDefault ? COLORS.primary : COLORS.border,
              backgroundColor: addressForm.isDefault ? COLORS.primaryLight : COLORS.surfaceAlt,
            }}
          >
            <Ionicons
              name={addressForm.isDefault ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={addressForm.isDefault ? COLORS.primary : COLORS.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>
                {addressForm.isDefault ? "Default delivery address" : "Use as my default delivery address"}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>
                {addressForm.isDefault
                  ? "This address is already selected automatically at checkout."
                  : "This choice will be applied when you save the address."}
              </Text>
            </View>
          </TouchableOpacity>
          {addressId(addressForm) ? <Button title="Delete this address" variant="danger" disabled={saving} onPress={() => confirmDeleteAddress(addressForm)} /> : null}
        </Section>
      </> : <Section title="Account details">
        <TextField label="First name" value={profileForm.name_first} onChangeText={(value) => updateProfileField("name_first", value.replace(/[0-9]/g, ""))} error={profileErrors.name_first} />
        <TextField label="Last name" value={profileForm.name_last} onChangeText={(value) => updateProfileField("name_last", value.replace(/[0-9]/g, ""))} error={profileErrors.name_last} />
        <TextField label="Suffix (optional)" value={profileForm.suffix} onChangeText={(value) => updateProfileField("suffix", value)} />
        <TextField label="Sign-in alias" value={profileForm.alias} onChangeText={(value) => updateProfileField("alias", value.toLowerCase().trim())} autoCapitalize="none" error={profileErrors.alias} />
        <TextField label="Email" value={profileForm.email} editable={false} />
        <TextField label="Phone" value={profileForm.phone} onChangeText={(value) => updateProfileField("phone", sanitizePhMobileInput(value))} keyboardType="phone-pad" placeholder="09XXXXXXXXX" maxLength={12} error={profileErrors.phone} showKeyboardDone />
      </Section>}
    </CustomerScreen>
  );
}
