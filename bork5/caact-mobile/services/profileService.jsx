// services/profileService.js
import {
  canonicalizePhMobile,
  validatePersonName,
  validatePhone,
  validateRequired,
} from "../utils/authValidation";

export function getDisplayName(user) {
  if (!user) return "User";

  const fullName = [user.name_first, user.name_last, user.suffix]
    .filter(Boolean)
    .join(" ")
    .trim();

  return user.name || fullName || user.alias || user.email || "User";
}

export function getRoleLabel(user) {
  if (!user) return "Guest";
  if (user.role === "technician" || user.isTechnician) return "Technician";
  return "Customer";
}

export function buildEditableProfile(user) {
  const addresses = Array.isArray(user?.addresses) ? user.addresses : [];
  const defaultAddress =
    addresses.find((item) => item?.isDefault) || addresses[0] || {};
  const serviceAddress =
    user?.billingAddress ||
    user?.billing_address ||
    user?.location?.address ||
    defaultAddress ||
    {};
  const serviceMunicipality =
    user?.municipality || serviceAddress.city || defaultAddress.city || "";
  const serviceSubmunicipality =
    user?.submunicipality ||
    serviceAddress.barangay ||
    defaultAddress.barangay ||
    "";
  const serviceStreet =
    user?.thoroughfare || serviceAddress.street || defaultAddress.street || "";
  const serviceAddressLine =
    user?.address ||
    [
      serviceStreet,
      serviceSubmunicipality,
      serviceMunicipality,
      serviceAddress.province || defaultAddress.province,
      serviceAddress.region || defaultAddress.region,
    ]
      .filter(Boolean)
      .join(", ");

  return {
    name_first: user?.name_first || "",
    name_last: user?.name_last || "",
    suffix: user?.suffix || "",
    alias: user?.alias || "",
    name: user?.name || "",
    email: user?.email || "",
    phone: canonicalizePhMobile(user?.phone || ""),
    profilePhoto: user?.profilePhoto || null,
    address: serviceAddressLine || "",
    municipality: serviceMunicipality,
    municipalityCode: user?.municipalityCode || user?.municipality_code || "",
    submunicipality: serviceSubmunicipality,
    submunicipalityCode:
      user?.submunicipalityCode || user?.submunicipality_code || "",
    thoroughfare: serviceStreet,
    propertyBlockLot: user?.propertyBlockLot || user?.property_block_lot || "",
    apartmentUnit: user?.apartmentUnit || user?.apartment_unit || "",
    customerOnboardedAt:
      user?.customerOnboardedAt || user?.customer_onboarded_at || "",
    technicianOnboardedAt:
      user?.technicianOnboardedAt || user?.technician_onboarded_at || "",
    landmark: user?.landmark || "",
    plusCode: user?.plusCode || "",
    latitude:
      user?.latitude === null || user?.latitude === undefined
        ? ""
        : String(user.latitude),
    longitude:
      user?.longitude === null || user?.longitude === undefined
        ? ""
        : String(user.longitude),
  };
}

export function validateProfileForm(form) {
  const errors = {};

  const firstNameError = validatePersonName(form?.name_first, "First name");
  const lastNameError = validatePersonName(form?.name_last, "Last name", {
    required: false,
  });
  const aliasError = validateRequired(form?.alias, "Alias");
  const phoneError = form?.phone ? validatePhone(form.phone) : "";
  const addressError =
    validateRequired(form?.address, "Address") ||
    validateRequired(form?.municipality, "Municipality") ||
    validateRequired(form?.submunicipality, "Submunicipality") ||
    validateRequired(form?.thoroughfare, "Thoroughfare");

  if (firstNameError) errors.name_first = firstNameError;
  if (lastNameError) errors.name_last = lastNameError;
  if (aliasError) errors.alias = aliasError;
  if (phoneError) errors.phone = phoneError;
  if (addressError) errors.address = addressError;

  return errors;
}

export function buildUpdatedUser(currentUser, form) {
  const firstName = String(form?.name_first || "").trim();
  const lastName = String(form?.name_last || "").trim();
  const suffix = String(form?.suffix || "").trim();
  const fullName = [firstName, lastName, suffix].filter(Boolean).join(" ").trim();
  const municipality = String(form?.municipality || "").trim();
  const submunicipality = String(form?.submunicipality || "").trim();
  const thoroughfare = String(form?.thoroughfare || "").trim();
  const propertyBlockLot = String(form?.propertyBlockLot || "").trim();
  const apartmentUnit = String(form?.apartmentUnit || "").trim();
  const address =
    [apartmentUnit, propertyBlockLot, thoroughfare, submunicipality, municipality]
      .filter(Boolean)
      .join(", ") || String(form?.address || "").trim();

  return {
    ...currentUser,
    ...form,
    name_first: firstName,
    name_last: lastName,
    suffix,
    alias: String(form?.alias || "").trim(),
    name: fullName,
    phone: canonicalizePhMobile(form?.phone || ""),
    address,
    municipality,
    municipalityCode: form?.municipalityCode || "",
    municipality_code: form?.municipalityCode || "",
    submunicipality,
    submunicipalityCode: form?.submunicipalityCode || "",
    submunicipality_code: form?.submunicipalityCode || "",
    thoroughfare,
    propertyBlockLot,
    property_block_lot: propertyBlockLot,
    apartmentUnit,
    apartment_unit: apartmentUnit,
    customerOnboardedAt: form?.customerOnboardedAt || "",
    customer_onboarded_at: form?.customerOnboardedAt || "",
    technicianOnboardedAt: form?.technicianOnboardedAt || "",
    technician_onboarded_at: form?.technicianOnboardedAt || "",
    landmark: String(form?.landmark || "").trim(),
    plusCode: String(form?.plusCode || "").trim(),
    latitude:
      form?.latitude === "" ||
      form?.latitude === null ||
      form?.latitude === undefined
        ? null
        : Number(form.latitude),
    longitude:
      form?.longitude === "" ||
      form?.longitude === null ||
      form?.longitude === undefined
        ? null
        : Number(form.longitude),
    profilePhoto: form?.profilePhoto || null,
  };
}
