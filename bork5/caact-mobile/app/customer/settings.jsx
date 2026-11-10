import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, Text, TouchableOpacity, View } from "react-native";

import CustomerScreen from "../../components/customer/CustomerScreen";
import CustomerSettingsRow, { CustomerEditAction } from "../../components/customer/CustomerSettingsRow";
import BottomSheetSelect from "../../components/ui/BottomSheetSelect";
import Button from "../../components/ui/Button";
import Section from "../../components/ui/Section";
import StickyActionBar from "../../components/ui/StickyActionBar";
import TextField from "../../components/ui/TextField";
import PasswordField from "../../components/ui/PasswordField";
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
  getSuggestedPostalCode,
  validatePostalCodeForAddress,
} from "../../services/postalCodeValidation";
import {
  canonicalizePhMobile,
  sanitizePhMobileInput,
  validateAccountPassword,
  validatePersonName,
  validatePhone,
  validateRequired,
} from "../../utils/authValidation";
import { confirmAction } from "../../utils/confirmAction";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

const toText = (value) => String(value || "").trim();
const MAX_SAVED_ADDRESSES = 8;
const SUCCESS_NOTICE_DURATION_MS = 4000;
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
  const nameError = validatePersonName(form.name, "Recipient name", { maxLength: 60 });
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
  const { language, t, updateLanguage } = useInterfaceLanguage();
  const [savingLanguage, setSavingLanguage] = useState(false);
  const {
    current,
    logout,
    updateMyAccount,
    changeMyPassword,
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
  const [securityMode, setSecurityMode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [localitiesLoading, setLocalitiesLoading] = useState(true);
  const [barangaysLoading, setBarangaysLoading] = useState(false);
  const addressEditorRequest = useRef(0);
  const noticeTimeout = useRef(null);

  useEffect(() => () => {
    if (noticeTimeout.current !== null) clearTimeout(noticeTimeout.current);
  }, []);

  const showNotice = (message) => {
    if (noticeTimeout.current !== null) clearTimeout(noticeTimeout.current);
    setNotice(message);
    noticeTimeout.current = setTimeout(() => {
      setNotice("");
      noticeTimeout.current = null;
    }, SUCCESS_NOTICE_DURATION_MS);
  };

  const addresses = Array.isArray(current?.addresses) ? current.addresses : [];
  const isEditingAddress = Boolean(addressForm);
  const isEditing = editingProfile || isEditingAddress || Boolean(securityMode);

  const selectLanguage = async (nextLanguage) => {
    if (savingLanguage || nextLanguage === language) return;
    setSavingLanguage(true);
    const result = await updateLanguage(nextLanguage);
    setSavingLanguage(false);
    if (!result.success) Alert.alert(t("Unable to save preferences."), result.error || t("Please try again."));
  };

  useEffect(() => {
    if (!editingProfile) setProfileForm(buildEditableProfile(current));
    if (!isEditingAddress) setAddressForm(null);
  }, [current, editingProfile]);

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
    if (!address && addresses.length >= MAX_SAVED_ADDRESSES) {
      Alert.alert(t("Address limit reached"), t("You can save up to 8 delivery addresses."));
      return;
    }
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
    setSecurityMode("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setProfileErrors({});
    setAddressErrors({});
  };

  const savePassword = async () => {
    const validationError = validateAccountPassword(newPassword);
    if (!currentPassword || validationError || newPassword !== confirmPassword) {
      Alert.alert(t("Check your password"), t(!currentPassword ? "Enter your current password." : validationError || "New passwords do not match."));
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert(t("Check your password"), t("New password must be different from your current password."));
      return;
    }
    setSaving(true);
    try {
      const result = await changeMyPassword({ currentPassword, newPassword });
      if (!result.success) return Alert.alert(t("Password not changed"), t(result.error || "Please try again."));
      showNotice(t("Password changed successfully."));
      closeEditor();
    } finally { setSaving(false); }
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
    if (saving) return;
    Keyboard.dismiss();
    const errors = {};
    const firstNameError = validatePersonName(profileForm.name_first, "First name");
    const lastNameError = validatePersonName(profileForm.name_last, "Last name");
    const aliasError = /^[a-z0-9_.-]{3,30}$/.test(toText(profileForm.alias)) ? "" : "Username must be 3-30 letters, numbers, dots, underscores, or hyphens.";
    const phoneError = validatePhone(profileForm.phone);
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
      profilePayload.phone = canonicalizePhMobile(profileForm.phone);
      const result = await updateMyAccount(profilePayload);
      if (!result.success) return Alert.alert(t("Save failed"), t(result.error || "Unable to update your account."));
      showNotice(t("Account details updated."));
      setEditingProfile(false);
    } finally { setSaving(false); }
  };

  const saveAddress = async () => {
    if (saving) return;
    Keyboard.dismiss();
    if (!addressId(addressForm) && addresses.length >= MAX_SAVED_ADDRESSES) {
      Alert.alert(t("Address limit reached"), t("You can save up to 8 delivery addresses."));
      return;
    }
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
        return Alert.alert(t("Address not saved"), t(result.error || "Check the address details and try again."));
      }
      showNotice(t(existingId ? "Delivery address updated and branch refreshed." : "Delivery address added and branch assigned."));
      setAddressForm(null);
    } finally { setSaving(false); }
  };

  const confirmDeleteAddress = (address) => {
    const remove = async () => {
      setSaving(true);
      try {
        const result = await deleteDeliveryAddress(addressId(address));
        if (!result.success) return Alert.alert(t("Address not deleted"), t(result.error || "Unable to delete this address."));
        showNotice(t("Delivery address deleted. The service branch was refreshed."));
        setAddressForm(null);
      } finally { setSaving(false); }
    };
    return confirmAction({
      title: t("Delete Address?"),
      message: t("This address will no longer be available at checkout."),
      confirmText: t("Delete Address"),
      pendingText: t("Deleting..."),
      destructive: true,
      onConfirm: remove,
    });
  };

  const performLogout = async () => { await logout(); router.replace("/sign-in"); };
  const handleLogout = () => confirmAction({
    title: t("Sign out?"),
    message: t("Are you sure you want to sign out of your account?"),
    confirmText: t("Sign out"),
    pendingText: t("Signing out..."),
    destructive: true,
    onConfirm: performLogout,
  });

  const subtitle = securityMode === "password" ? "Reset your password" : isEditingAddress ? (addressId(addressForm) ? "Edit delivery address" : "Add your first delivery address") : editingProfile ? "Edit account details" : "Account, delivery addresses, and security";
  const saveCurrentEditor = securityMode === "password" ? savePassword : isEditingAddress ? saveAddress : saveProfile;
  const saveTitle = securityMode === "password" ? "Reset Password" : isEditingAddress ? "Save Address" : "Save Account";
  return (
    <CustomerScreen
      title={t("Account")}
      subtitle={t(subtitle)}
      contentContainerStyle={{ paddingBottom: isEditing ? 176 : 96 }}
      stickyAction={isEditing ? <StickyActionBar><Button title={t(saving ? "Saving..." : saveTitle)} onPress={saveCurrentEditor} loading={saving} disabled={saving} /><Button title={t("Cancel")} variant="secondary" onPress={closeEditor} disabled={saving} /></StickyActionBar> : null}
    >
      {notice ? <View style={{ flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#86efac", backgroundColor: "#f0fdf4" }}><Ionicons name="checkmark-circle" size={20} color={COLORS.success} /><Text style={{ flex: 1, color: "#166534", fontWeight: "700" }}>{notice}</Text></View> : null}

      {!isEditing ? <>
        <Section title={t("Personal details")}>
          <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm }}>{t("Review your name and contact details.")}</Text>
          <CustomerSettingsRow icon="person-circle-sharp" title={fullName(current)} subtitle={`${current?.alias || t("No username")} · ${current?.email || t("No email")}`} right={<CustomerEditAction onPress={() => { setProfileForm(buildEditableProfile(current)); setAddressForm(null); setEditingProfile(true); }} />} />
          <CustomerSettingsRow icon="call-sharp" title={t("Phone")} subtitle={current?.phone || t("No phone on file")} />
        </Section>
        <Section title={t("Interface language")}>
          <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>{t("Choose the language used for buttons, labels, and navigation.")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            {["English", "Filipino"].map((choice) => (
              <TouchableOpacity key={choice} accessibilityRole="radio" accessibilityState={{ checked: language === choice, disabled: savingLanguage }} disabled={savingLanguage} onPress={() => selectLanguage(choice)} style={{ minWidth: 112, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 10, borderWidth: 1, borderColor: language === choice ? COLORS.primary : COLORS.border, backgroundColor: language === choice ? COLORS.primaryLight : COLORS.surface }}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold, textAlign: "center" }}>{t(choice)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>
        <Section title={t("Delivery Addresses")}>
          <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>{language === "Filipino" ? `${addresses.length} sa ${MAX_SAVED_ADDRESSES} naka-save na address` : `${addresses.length} of ${MAX_SAVED_ADDRESSES} saved addresses`}</Text>
          {addresses.length ? addresses.map((address) => {
            const details = addressLine(address) || t("Address details incomplete");
            const addressIssue = validatePostalCodeForAddress(address);
            return <CustomerSettingsRow key={addressId(address)} icon={address.isDefault ? "location-sharp" : "location-outline"} title={`${address.label || t("Delivery address")}${address.isDefault ? ` · ${t("Default")}` : ""}`} subtitle={addressIssue ? `${details}\n${t("Needs review")}: ${addressIssue}` : details} color={addressIssue ? COLORS.warning : COLORS.primary} onPress={() => openAddressEditor(address)} />;
          }) : <View style={{ paddingVertical: SPACING.sm }}><Text style={{ color: COLORS.textSecondary, lineHeight: 20 }}>{t("No delivery address saved yet. You can add one whenever you are ready to check out.")}</Text></View>}
          <Button title={t(addresses.length ? "Add another address" : "Add delivery address")} variant="secondary" disabled={addresses.length >= MAX_SAVED_ADDRESSES} onPress={() => openAddressEditor()} />
          {addresses.length >= MAX_SAVED_ADDRESSES ? <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>{t("You can save up to 8 delivery addresses. Edit or delete one to add another.")}</Text> : null}
        </Section>
        <Section title={t("Password & sign-in")}>
          <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm }}>{t("Manage your password and learn how email codes are used at sign-in.")}</Text>
          <CustomerSettingsRow icon="key-sharp" title={t("Reset Password")} subtitle={t("Verify your current password and choose a new one.")} onPress={() => { setAddressForm(null); setEditingProfile(false); setSecurityMode("password"); }} />
          <CustomerSettingsRow icon="mail-outline" title={t("Email code at sign-in")} subtitle={t("After entering your password, you may be asked for a one-time code sent to your email.")} />
        </Section>
        <Section title={t("Help & Support")}>
          <CustomerSettingsRow icon="help-buoy-sharp" title={t("Frequently Asked Questions")} subtitle={t("Orders, payments, delivery, warranty, and AC care")} onPress={() => router.push("/customer/faq")} />
          <CustomerSettingsRow icon="chatbubble-ellipses-sharp" title={t("Contact Customer Support")} subtitle={t("Get help with an order or service request")} onPress={() => router.push("/customer/contact")} />
        </Section>
        <Section title={t("Session")}>
          <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm }}>{t("Manage this device's signed-in session.")}</Text>
          <CustomerSettingsRow icon="log-out-sharp" title={t("Sign out")} subtitle={t("Sign out of this customer account on this device.")} danger onPress={handleLogout} />
        </Section>
      </> : securityMode === "password" ? <Section title={t("Reset Password")}>
        <PasswordField label={t("Current Password")} value={currentPassword} onChangeText={setCurrentPassword} editable={!saving} />
        <PasswordField label={t("New Password")} value={newPassword} onChangeText={setNewPassword} showRequirements editable={!saving} />
        <PasswordField label={t("Confirm New Password")} value={confirmPassword} onChangeText={setConfirmPassword} editable={!saving} />
      </Section> : isEditingAddress ? <>
        <Section title={t("Address details")}>
          <TextField translate={t} label={t("Address label")} value={addressForm.label} onChangeText={(value) => updateAddressField("label", value)} placeholder={t("Home, office, etc.")} />
          <TextField translate={t} label={t("Recipient name")} value={addressForm.name} onChangeText={(value) => updateAddressField("name", value)} error={addressErrors.name} />
          <TextField translate={t} label={t("Mobile number")} value={addressForm.phone} onChangeText={(value) => updateAddressField("phone", sanitizePhMobileInput(value))} keyboardType="phone-pad" placeholder="09XXXXXXXXX" error={addressErrors.phone} showKeyboardDone />
          <BottomSheetSelect translate={t} label={t("Region")} value={addressForm.region} placeholder={t("Select region")} items={regions} loading={regionsLoading} error={addressErrors.region} emptyMessage={t("No regions found. Check your connection and try again.")} onSelect={selectRegion} />
          <BottomSheetSelect translate={t} label={t("Province")} value={addressForm.province} placeholder={t("Select province")} items={provinces} loading={provincesLoading} disabled={!addressForm.regionCode} error={addressErrors.province} emptyMessage={t(addressForm.regionCode ? "No provinces found." : "Select a region first.")} onSelect={selectProvince} />
          <BottomSheetSelect translate={t} label={t("City or municipality")} value={addressForm.city} placeholder={t("Select city or municipality")} items={localities} loading={localitiesLoading} disabled={!addressForm.provinceCode} error={addressErrors.city} emptyMessage={t(addressForm.provinceCode ? "No city or municipality matched your search." : "Select a province first.")} onSelect={selectLocality} />
          <BottomSheetSelect translate={t} label={t("Barangay or district")} value={addressForm.barangay} placeholder={t("Select barangay")} items={barangays} loading={barangaysLoading} disabled={!addressForm.municipalityCode} error={addressErrors.barangay} emptyMessage={t(addressForm.municipalityCode ? "No barangays matched your search." : "Select a city or municipality first.")} onSelect={selectBarangay} />
          <TextField translate={t} label={t("Street address")} value={addressForm.street} onChangeText={(value) => updateAddressField("street", value)} placeholder={t("House, block, lot, street")} error={addressErrors.street} />
          <TextField translate={t} label={t("ZIP Code *")} value={addressForm.postalCode} onChangeText={(value) => updateAddressField("postalCode", value.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" inputMode="numeric" maxLength={4} autoCorrect={false} autoComplete="postal-code" textContentType="postalCode" error={addressErrors.postalCode} showKeyboardDone />
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
                {t(addressForm.isDefault ? "Default delivery address" : "Use as my default delivery address")}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>
                {t(addressForm.isDefault
                  ? "This address is already selected automatically at checkout."
                  : "This choice will be applied when you save the address.")}
              </Text>
            </View>
          </TouchableOpacity>
          {addressId(addressForm) ? <Button title={t("Delete this address")} variant="danger" disabled={saving} onPress={() => confirmDeleteAddress(addressForm)} /> : null}
        </Section>
      </> : <Section title={t("Account details")}>
        <TextField translate={t} label={t("First name")} value={profileForm.name_first} maxLength={30} helperText={`${profileForm.name_first?.length || 0}/30`} onChangeText={(value) => updateProfileField("name_first", value.replace(/[0-9]/g, ""))} error={t(profileErrors.name_first)} />
        <TextField translate={t} label={t("Last name")} value={profileForm.name_last} maxLength={30} helperText={`${profileForm.name_last?.length || 0}/30`} onChangeText={(value) => updateProfileField("name_last", value.replace(/[0-9]/g, ""))} error={t(profileErrors.name_last)} />
        <TextField translate={t} label={t("Suffix (optional)")} value={profileForm.suffix} onChangeText={(value) => updateProfileField("suffix", value)} />
        <TextField translate={t} label={t("Username")} value={profileForm.alias} onChangeText={(value) => updateProfileField("alias", value.toLowerCase().trim())} autoCapitalize="none" error={profileErrors.alias} />
        <TextField translate={t} label={t("Email")} value={profileForm.email} editable={false} />
        <TextField translate={t} label={t("Phone")} value={profileForm.phone} onChangeText={(value) => updateProfileField("phone", sanitizePhMobileInput(value))} keyboardType="phone-pad" placeholder="09XXXXXXXXX" error={profileErrors.phone} showKeyboardDone />
      </Section>}
    </CustomerScreen>
  );
}
