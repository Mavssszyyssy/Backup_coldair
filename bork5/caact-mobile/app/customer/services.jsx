import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Text } from "react-native";

import CustomerScreen from "../../components/customer/CustomerScreen";
import CustomerSectionHeader from "../../components/customer/CustomerSectionHeader";
import BottomSheetSelect from "../../components/ui/BottomSheetSelect";
import Button from "../../components/ui/Button";
import CalendarDatePicker, { getTodayDateKey, isPastCalendarDate } from "../../components/ui/CalendarDatePicker";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import StickyActionBar from "../../components/ui/StickyActionBar";
import TextField from "../../components/ui/TextField";
import { COLD_AIR_WEBSITE } from "../../constants/company";
import { COLORS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { getDisplayName } from "../../services/profileService";
import { fetchServiceCatalog, getStoredToken } from "../../services/api";
import { createServiceRequest } from "../../services/serviceRequestStorage";
import { getUnitsByUser } from "../../services/unitStorage";
import { canonicalizePhMobile, validatePhone } from "../../utils/authValidation";

const getServiceAddress = (user = {}) => {
  const addresses = Array.isArray(user?.addresses) ? user.addresses : [];
  return addresses.find((item) => item?.isDefault) || addresses[0] || {
    phone: user?.phone || "",
    street: user?.address || "",
    city: user?.municipality || user?.billingAddress?.city || "",
    province: user?.billingAddress?.province || "",
    barangay: user?.submunicipality || user?.billingAddress?.barangay || "",
  };
};

export default function CustomerServicesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { current } = useUserContext();
  const [units, setUnits] = useState([]);
  const [serviceOfferings, setServiceOfferings] = useState([]);
  const [serviceCatalogError, setServiceCatalogError] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [dateError, setDateError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadServiceCatalog = useCallback(async () => {
    const token = await getStoredToken();
    if (!token) return;
    const result = await fetchServiceCatalog(token);
    if (!result.success) {
      setServiceCatalogError(result.error || "Unable to load services.");
      return;
    }
    setServiceCatalogError("");
    setServiceOfferings(result.offerings);
    setSelectedServiceId((currentId) => currentId || result.offerings[0]?.id || "");
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    loadServiceCatalog();
    getUnitsByUser(current?.id).then((items) => {
      if (!active) return;
      setUnits(items);
      if (!selectedUnitId && items[0]?.id) setSelectedUnitId(items[0].id);
    });
    return () => { active = false; };
  }, [current, selectedUnitId, loadServiceCatalog]));

  const selectedService = useMemo(() => serviceOfferings.find((item) => item.id === selectedServiceId) || null, [serviceOfferings, selectedServiceId]);
  const selectedUnit = useMemo(() => units.find((item) => String(item.id) === String(selectedUnitId)) || null, [units, selectedUnitId]);

  useEffect(() => {
    const requestedUnitId = Array.isArray(params.unitId) ? params.unitId[0] : params.unitId;
    if (requestedUnitId && units.some((item) => String(item.id) === String(requestedUnitId))) {
      setSelectedUnitId(String(requestedUnitId));
    }
  }, [params.unitId, units]);

  useEffect(() => {
    const rawType = Array.isArray(params.serviceType) ? params.serviceType[0] : params.serviceType;
    const requestedType = String(rawType || "").trim().toLowerCase();
    if (!requestedType || !serviceOfferings.length) return;
    const preferredId = requestedType === "deep_cleaning" ? "cleaning" : requestedType === "regular_cleaning" ? "maintenance" : requestedType;
    const match = serviceOfferings.find((item) => {
      const values = [item.id, item.title, item.defaultIssueType].map((value) => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_"));
      return values.includes(requestedType) || values.includes(preferredId);
    });
    if (!match) return;
    setSelectedServiceId(match.id);
    setIssueDescription((currentValue) => currentValue || `AMP recommended ${requestedType.replace(/_/g, " ")} for this AC unit.`);
  }, [params.serviceType, serviceOfferings]);

  const selectDate = (value) => {
    setPreferredDate(value);
    setDateError("");
  };

  const handleSubmit = async () => {
    if (!selectedService) return Alert.alert("Required", "Choose a service offering.");
    if (!selectedUnit) return Alert.alert("Required", "Select a registered AC unit first.");
    if (!preferredDate) {
      setDateError("Choose your preferred appointment date.");
      return;
    }
    if (isPastCalendarDate(preferredDate)) {
      setDateError("Please choose today or a future date.");
      return;
    }
    if (!issueDescription.trim()) return Alert.alert("Required", "Describe the request or concern.");

    const serviceAddress = getServiceAddress(current);
    const contactPhone = canonicalizePhMobile(serviceAddress.phone || current?.phone || "");
    const contactError = validatePhone(contactPhone);
    if (contactError) {
      return Alert.alert(
        "Valid contact number required",
        `${contactError} Add or update your delivery address before requesting service.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => router.push("/customer/settings") },
        ],
      );
    }

    setSubmitting(true);
    try {
      await createServiceRequest({
        userId: current?.id,
        customerName: getDisplayName(current),
        customerEmail: current?.email || "",
        customerPhone: contactPhone,
        unitId: selectedUnit.id,
        unitName: selectedUnit.unitName,
        unitSerialNumber: selectedUnit.serialNumber || "",
        qrCode: selectedUnit.qrCode || "",
        serviceId: selectedService.id,
        serviceType: selectedService.title,
        issueType: selectedService.defaultIssueType,
        issueDescription: issueDescription.trim(),
        preferredDate,
        notes: notes.trim(),
        address: serviceAddress.street || current?.address || selectedUnit.placementArea || "",
        city: serviceAddress.city || current?.municipality || "",
        province: serviceAddress.province || "",
        barangay: serviceAddress.barangay || current?.submunicipality || "",
        landmark: current?.landmark || "",
        plusCode: current?.plusCode || "",
        deliveryInstructions: current?.deliveryInstructions || "",
      });
      Alert.alert("Request Submitted", "Your preferred date was recorded. We will notify you once a technician and time slot are assigned.");
      setIssueDescription("");
      setPreferredDate("");
      setNotes("");
    } catch (error) {
      Alert.alert("Request Failed", error?.message || "Unable to create your service request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerScreen title="Services" subtitle="Book a service appointment for your registered AC unit" contentContainerStyle={{ paddingBottom: 116 }} stickyAction={<StickyActionBar><Button title={submitting ? "Submitting..." : "Submit Request"} onPress={handleSubmit} loading={submitting} disabled={submitting || units.length === 0 || !selectedService} /></StickyActionBar>}>
      {units.length === 0 ? <Card><EmptyState title="Register a unit first" message="Service requests need a registered AC unit. Buy from the website and add your AC unit before booking." action={<Button title="Visit Website" onPress={() => Linking.openURL(COLD_AIR_WEBSITE)} />} /></Card> : null}
      <Card>
        <CustomerSectionHeader title="Available Services" />
        <BottomSheetSelect label="Service" value={selectedService?.title} placeholder="Choose service" items={serviceOfferings} itemIcon="construct-sharp" getKey={(item) => item.id} getLabel={(item) => item.title} onSelect={(service) => setSelectedServiceId(service.id)} />
        <Text style={{ color: COLORS.textSecondary, lineHeight: 20 }}>{selectedService?.summary}</Text>
        {selectedService?.pricing?.label ? <Text style={{ color: COLORS.primary, fontWeight: "700", marginTop: SPACING.xs }}>Service price: {selectedService.pricing.label}</Text> : null}
        {serviceCatalogError ? <Text style={{ color: COLORS.danger, marginTop: SPACING.xs }}>{serviceCatalogError}</Text> : null}
        {serviceCatalogError ? <Button title="Retry services" variant="secondary" onPress={loadServiceCatalog} /> : null}
        <Button title="Browse FAQs" variant="secondary" onPress={() => router.push("/customer/faq")} />
      </Card>
      <Card>
        <CustomerSectionHeader title="Appointment Details" />
        <BottomSheetSelect label="Select AC Unit" value={selectedUnit?.unitName} placeholder="Choose registered AC unit" items={units} itemIcon="snow-sharp" getKey={(item) => String(item.id)} getLabel={(item) => `${item.unitName || "Unnamed AC Unit"}${item.brand ? ` - ${item.brand}` : ""}`} onSelect={(unit) => setSelectedUnitId(unit.id)} />
        <CalendarDatePicker label="Preferred Date" value={preferredDate} onChange={selectDate} minimumDate={getTodayDateKey()} required error={dateError} />
        <TextField label="Service Concern" value={issueDescription} onChangeText={setIssueDescription} placeholder="Describe the issue, delivery concern, or service needed" multiline style={{ minHeight: 100, textAlignVertical: "top" }} />
        <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Additional site instructions or preferences" multiline style={{ minHeight: 80, textAlignVertical: "top" }} />
      </Card>
    </CustomerScreen>
  );
}
