import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { CUSTOMER_SERVICE_OFFERINGS, COLD_AIR_WEBSITE } from "../../constants/company";
import { COLORS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { getDisplayName } from "../../services/profileService";
import { createServiceRequest } from "../../services/serviceRequestStorage";
import { getUnitsByUser } from "../../services/unitStorage";

export default function CustomerServicesScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const [units, setUnits] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(CUSTOMER_SERVICE_OFFERINGS[0]?.id || "");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [dateError, setDateError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    getUnitsByUser(current?.id).then((items) => {
      if (!active) return;
      setUnits(items);
      if (!selectedUnitId && items[0]?.id) setSelectedUnitId(items[0].id);
    });
    return () => { active = false; };
  }, [current, selectedUnitId]));

  const selectedService = useMemo(() => CUSTOMER_SERVICE_OFFERINGS.find((item) => item.id === selectedServiceId) || CUSTOMER_SERVICE_OFFERINGS[0], [selectedServiceId]);
  const selectedUnit = useMemo(() => units.find((item) => String(item.id) === String(selectedUnitId)) || null, [units, selectedUnitId]);

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

    setSubmitting(true);
    try {
      await createServiceRequest({
        userId: current?.id,
        customerName: getDisplayName(current),
        customerEmail: current?.email || "",
        customerPhone: current?.phone || "",
        unitId: selectedUnit.id,
        unitName: selectedUnit.unitName,
        unitSerialNumber: selectedUnit.serialNumber || "",
        qrCode: selectedUnit.qrCode || "",
        serviceType: selectedService.title,
        issueType: selectedService.defaultIssueType,
        issueDescription: issueDescription.trim(),
        preferredDate,
        notes: notes.trim(),
        address: current?.address || selectedUnit.placementArea || "",
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
    <CustomerScreen title="Services" subtitle="Book a service appointment for your registered AC unit" contentContainerStyle={{ paddingBottom: 116 }} stickyAction={<StickyActionBar><Button title={submitting ? "Submitting..." : "Submit Request"} onPress={handleSubmit} loading={submitting} disabled={submitting || units.length === 0} /></StickyActionBar>}>
      {units.length === 0 ? <Card><EmptyState title="Register a unit first" message="Service requests need a registered AC unit. Buy from the website and add your AC unit before booking." action={<Button title="Visit Website" onPress={() => Linking.openURL(COLD_AIR_WEBSITE)} />} /></Card> : null}
      <Card>
        <CustomerSectionHeader title="Available Services" />
        <BottomSheetSelect label="Service" value={selectedService?.title} placeholder="Choose service" items={CUSTOMER_SERVICE_OFFERINGS} itemIcon="construct-sharp" getKey={(item) => item.id} getLabel={(item) => item.title} onSelect={(service) => setSelectedServiceId(service.id)} />
        <Text style={{ color: COLORS.textSecondary, lineHeight: 20 }}>{selectedService?.summary}</Text>
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
