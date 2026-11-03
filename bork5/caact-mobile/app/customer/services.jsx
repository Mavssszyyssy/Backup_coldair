import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { startLiveRefresh } from "../../services/liveRefresh";
import { customerServiceChoices } from "../../services/customerServiceChoices";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Text, View } from "react-native";

import CustomerScreen from "../../components/customer/CustomerScreen";
import CustomerSectionHeader from "../../components/customer/CustomerSectionHeader";
import ServiceRequestPaymentSummary from "../../components/customer/ServiceRequestPaymentSummary";
import BottomSheetSelect from "../../components/ui/BottomSheetSelect";
import Button from "../../components/ui/Button";
import CalendarDatePicker from "../../components/ui/CalendarDatePicker";
import { getManilaDateKey, getServiceBookingMaxDateKey, serviceBookingDateError } from "../../services/serviceBookingDate";
import Card from "../../components/ui/Card";
import DetailRow from "../../components/ui/DetailRow";
import EmptyState from "../../components/ui/EmptyState";
import StatusChip from "../../components/ui/StatusChip";
import StickyActionBar from "../../components/ui/StickyActionBar";
import TextField from "../../components/ui/TextField";
import { COLD_AIR_WEBSITE } from "../../constants/company";
import { COLORS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { getDisplayName } from "../../services/profileService";
import { createWarrantyClaim, fetchServiceCatalog, getStoredToken } from "../../services/api";
import { getCustomerServiceHistory } from "../../services/customerHistoryService";
import { createServiceRequest } from "../../services/serviceRequestStorage";
import { cacheUnitUpdate, getUnitsByUser } from "../../services/unitStorage";
import { canonicalizePhMobile, validatePhone } from "../../utils/authValidation";
import { useInterfaceLanguage } from "../../hooks/useInterfaceLanguage";

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

const ACTIVE_REQUEST_STATUSES = new Set(["pending", "submitted", "reviewed", "assigned", "in progress", "on hold"]);
const ACTIVE_CLAIM_STATUSES = new Set(["submitted", "under_review", "approved"]);
const MAX_SERVICE_CONCERN_LENGTH = 500;

const readableStatus = (value = "") => String(value || "").replace(/_/g, " ");

const getActiveWarrantyClaim = (unit) =>
  (unit?.warranty?.claims || []).find((claim) => ACTIVE_CLAIM_STATUSES.has(String(claim?.status || "").toLowerCase())) || null;

const hasActiveWarranty = (unit) =>
  String(unit?.warrantyStatus || unit?.warranty?.status || "").toLowerCase() === "active";

const formatDate = (value = "") => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

export default function CustomerServicesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { current } = useUserContext();
  const { language, t } = useInterfaceLanguage();
  const [units, setUnits] = useState([]);
  const [serviceOfferings, setServiceOfferings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [serviceCatalogError, setServiceCatalogError] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [concernInputKey, setConcernInputKey] = useState(0);
  const [notes, setNotes] = useState("");
  const [requestMode, setRequestMode] = useState("service");
  const [dateError, setDateError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const appliedUnitParam = useRef("");
  const appliedTypeParam = useRef("");
  const openedRequestParam = useRef("");
  const requestedUnitId = String(Array.isArray(params.unitId) ? params.unitId[0] || "" : params.unitId || "");
  const requestedRequestId = String(Array.isArray(params.requestId) ? params.requestId[0] || "" : params.requestId || "");

  const loadServiceCatalog = useCallback(async () => {
    const token = await getStoredToken();
    if (!token) return;
    const result = await fetchServiceCatalog(token);
    if (!result.success) {
      setServiceCatalogError(result.error || "Unable to load services.");
      return;
    }
    setServiceCatalogError("");
    const choices = customerServiceChoices(result.offerings || []);
    setServiceOfferings(choices);
    setSelectedServiceId((currentId) => choices.some(item => item.id === currentId) ? currentId : choices[0]?.id || "");
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadingUnits(true);
    loadServiceCatalog();
    getUnitsByUser(current?.id, { sync: false }).then((items) => {
      if (!active || items.length === 0) return;
      setUnits(items);
      setLoadingUnits(false);
    }).catch(() => {});
    const stop = startLiveRefresh(({ background }) => Promise.allSettled([
      getUnitsByUser(current?.id),
      getCustomerServiceHistory(current?.id, { includeTasks: false }),
    ]).then(([unitsResult, historyResult]) => {
      if (!active) return;
      if (unitsResult.status === "fulfilled") {
        const items = unitsResult.value;
        setUnits(items);
        // A background update must not switch the AC being booked.
        if (!background) setSelectedUnitId((currentId) => {
          if (requestedUnitId && items.some((item) => String(item.id) === requestedUnitId)) return requestedUnitId;
          if (currentId && items.some((item) => String(item.id) === String(currentId))) return currentId;
          return "";
        });
      }
      if (historyResult.status === "fulfilled") setRequests(historyResult.value.requests || []);
    }).finally(() => {
      if (active) setLoadingUnits(false);
    }));
    return () => { active = false; stop(); };
  }, [current?.id, loadServiceCatalog, requestedUnitId]));

  const selectedService = useMemo(() => serviceOfferings.find((item) => item.id === selectedServiceId) || null, [serviceOfferings, selectedServiceId]);
  useEffect(() => {
    if (!requestedRequestId || openedRequestParam.current === requestedRequestId) return;
    const request = requests.find((item) => String(item.id || item._id) === requestedRequestId);
    if (!request?.unitId) return;
    openedRequestParam.current = requestedRequestId;
    router.replace({ pathname: "/customer/units/[id]", params: { id: String(request.unitId), page: "service" } });
  }, [requestedRequestId, requests, router]);
  const selectedUnit = useMemo(() => units.find((item) => String(item.id) === String(selectedUnitId)) || null, [units, selectedUnitId]);
  const hasRequestedUnit = Boolean(requestedUnitId && selectedUnit && String(selectedUnit.id) === requestedUnitId);
  const selectedActiveRequest = useMemo(() => requests.find((request) =>
    String(request.unitId || "") === String(selectedUnitId || "") &&
    ACTIVE_REQUEST_STATUSES.has(String(request.status || "").toLowerCase())), [requests, selectedUnitId]);
  const activeWarrantyClaim = useMemo(() => getActiveWarrantyClaim(selectedUnit), [selectedUnit]);
  const warrantyEligible = hasActiveWarranty(selectedUnit) && !activeWarrantyClaim;

  useEffect(() => {
    if (requestedUnitId && appliedUnitParam.current !== String(requestedUnitId) && units.some((item) => String(item.id) === String(requestedUnitId))) {
      setSelectedUnitId(String(requestedUnitId));
      appliedUnitParam.current = String(requestedUnitId);
    }
  }, [requestedUnitId, units]);

  useEffect(() => {
    const rawType = Array.isArray(params.serviceType) ? params.serviceType[0] : params.serviceType;
    const requestedType = String(rawType || "").trim().toLowerCase();
    if (!requestedType || appliedTypeParam.current === requestedType) return;
    if (requestedType === "warranty") {
      setRequestMode("warranty");
      appliedTypeParam.current = requestedType;
      return;
    }
    if (!serviceOfferings.length) return;
    const preferredId = requestedType === "deep_cleaning" ? "cleaning"
      : requestedType === "regular_cleaning" ? "maintenance"
        : requestedType === "inspection" ? "consultation" : requestedType;
    const match = serviceOfferings.find((item) => {
      const values = [item.id, item.title, item.defaultIssueType].map((value) => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_"));
      return values.includes(requestedType) || values.includes(preferredId);
    });
    if (!match) return;
    appliedTypeParam.current = requestedType;
    setRequestMode("service");
    setSelectedServiceId(match.id);
    setIssueDescription((currentValue) => currentValue || `AMP recommended ${requestedType.replace(/_/g, " ")} for this AC unit.`);
  }, [params.serviceType, serviceOfferings]);

  const selectDate = (value) => {
    setPreferredDate(value);
    setDateError("");
  };

  const handleSubmit = async () => {
    if (requestMode === "service" && !selectedService) return Alert.alert(t("Required"), t("Choose a service offering."));
    if (!selectedUnit) return Alert.alert(t("AC unit required"), t("Choose the registered AC unit that needs service."));
    if (selectedActiveRequest) {
      return Alert.alert(t("Request already open"), t("This AC unit already has a service request in progress. You do not need to submit another one."));
    }
    if (activeWarrantyClaim) {
      return Alert.alert(t("Warranty claim in progress"), language === "Filipino"
        ? `Ang iyong warranty claim ay ${t(readableStatus(activeWarrantyClaim.status))} na. Aabisuhan ka namin kapag nagbago ang status nito.`
        : `Your warranty claim is already ${readableStatus(activeWarrantyClaim.status)}. We will notify you when it changes.`);
    }
    if (!issueDescription.trim()) return Alert.alert(t("Required"), t("Describe the request or concern."));
    if (issueDescription.trim().length > MAX_SERVICE_CONCERN_LENGTH) return Alert.alert(t("Required"), t("Service concern must be 500 characters or fewer."));

    if (requestMode === "warranty") {
      if (!warrantyEligible) return Alert.alert(t("Warranty unavailable"), t("This AC does not currently have active warranty coverage. You can choose a standard service request instead."));
      const token = await getStoredToken();
      if (!token) return Alert.alert(t("Sign in required"), t("Please sign in again before submitting warranty support."));
      setSubmitting(true);
      try {
        const result = await createWarrantyClaim(token, selectedUnit.id, {
          issue: issueDescription.trim(),
          notes: notes.trim(),
        });
        if (!result.success) throw new Error(result.error);
        const nextUnit = {
          ...selectedUnit,
          warranty: result.warranty,
          warrantyStatus: result.warranty?.status || "under_review",
        };
        setUnits((items) => items.map((item) => String(item.id) === String(nextUnit.id) ? nextUnit : item));
        await cacheUnitUpdate(nextUnit.id, {
          warranty: nextUnit.warranty,
          warrantyStatus: nextUnit.warrantyStatus,
        }).catch(() => null);
        setIssueDescription("");
        setConcernInputKey((value) => value + 1);
        setNotes("");
        Alert.alert(t("Warranty support submitted"), t("Your claim is now under review. A service visit will be arranged after approval, so no appointment date is needed yet."));
      } catch (error) {
        Alert.alert(t("Claim not submitted"), t(error?.message || "Unable to submit warranty support."));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const bookingError = serviceBookingDateError(preferredDate);
    if (bookingError) { setDateError(bookingError); return; }
    const serviceAddress = getServiceAddress(current);
    const contactPhone = canonicalizePhMobile(serviceAddress.phone || current?.phone || "");
    const contactError = validatePhone(contactPhone);
    if (contactError) {
      return Alert.alert(
        t("Valid contact number required"),
        `${t(contactError)} ${t("Add or update your delivery address before requesting service.")}`,
        [
          { text: t("Cancel"), style: "cancel" },
          { text: t("Open Account"), onPress: () => router.push("/customer/settings") },
        ],
      );
    }

    setSubmitting(true);
    try {
      const createdRequest = await createServiceRequest({
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
        region: serviceAddress.region || "",
        postalCode: serviceAddress.postalCode || "",
        barangay: serviceAddress.barangay || current?.submunicipality || "",
        landmark: current?.landmark || "",
        plusCode: current?.plusCode || "",
        deliveryInstructions: current?.deliveryInstructions || "",
      });
      setRequests((items) => [createdRequest, ...items.filter((item) => String(item.id) !== String(createdRequest.id))]);
      Alert.alert(t("Request Submitted"), t("Your preferred date was recorded. We will notify you once a technician and time slot are assigned."));
      setIssueDescription("");
      setConcernInputKey((value) => value + 1);
      setPreferredDate("");
      setNotes("");
    } catch (error) {
      Alert.alert(t("Request Failed"), t(error?.message || "Unable to create your service request."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitTitle = selectedActiveRequest
    ? "Request Already Open"
    : activeWarrantyClaim
      ? "Warranty Claim in Progress"
      : requestMode === "warranty"
        ? "Submit Warranty Claim"
        : "Submit Service Request";

  return (
    <CustomerScreen title={t("Service Request")} subtitle={t("Arrange AC cleaning, request a repair, or submit a warranty claim")} contentContainerStyle={{ paddingBottom: 116 }} stickyAction={<StickyActionBar><Button title={t(loadingUnits ? "Loading AC Units..." : submitting ? "Submitting..." : submitTitle)} onPress={handleSubmit} loading={submitting} disabled={loadingUnits || submitting || !selectedUnit || (requestMode === "service" ? !selectedService : !warrantyEligible) || Boolean(selectedActiveRequest) || Boolean(activeWarrantyClaim)} /></StickyActionBar>}>
      {loadingUnits ? <Card><View style={{ alignItems: "center", gap: SPACING.sm, paddingVertical: SPACING.lg }}><ActivityIndicator color={COLORS.primary} /><Text style={{ color: COLORS.textSecondary }}>{t("Loading registered AC units and open requests...")}</Text></View></Card> : null}
      {!loadingUnits && units.length === 0 ? <Card><EmptyState title={t("Register a unit first")} message={t("Service requests need a registered AC unit. Buy from the website and add your AC unit before booking.")} action={<Button title={t("Visit Website")} onPress={() => Linking.openURL(COLD_AIR_WEBSITE)} />} /></Card> : null}
      <Card>
        <CustomerSectionHeader title={t("What do you need?")} />
        {hasRequestedUnit ? (
          <DetailRow label={t("AC unit selected for this request")} value={`${selectedUnit.unitName || t("Unnamed AC Unit")}\n${t("Serial")}: ${selectedUnit.serialNumber || t("Not recorded")}`} multiline />
        ) : (
          <BottomSheetSelect translate={t}
            label={t("AC unit")}
            value={selectedUnit ? `${selectedUnit.unitName || t("AC Unit")} · ${selectedUnit.serialNumber || t("Serial not recorded")}` : ""}
            placeholder={t("Choose a registered AC")}
            items={units}
            itemIcon="snow-sharp"
            searchPlaceholder={t("Search model or serial number")}
            getKey={(unit) => String(unit.id)}
            getLabel={(unit) => `${unit.unitName || t("AC Unit")} · ${unit.serialNumber || t("Serial not recorded")}`}
            onSelect={(unit) => setSelectedUnitId(String(unit.id))}
          />
        )}
        <BottomSheetSelect translate={t} label={t("Request type")} value={t(requestMode === "warranty" ? "Warranty Claim" : "Cleaning or Service")} items={[{ id:"service", title:"Cleaning or Service" }, { id:"warranty", title:"Warranty Claim" }]} getKey={item => item.id} getLabel={item => t(item.title)} onSelect={item => setRequestMode(item.id)} />
        {selectedUnit && !hasRequestedUnit ? <View style={{ marginTop: SPACING.sm }}>
          <DetailRow label={t("Selected AC")} value={`${selectedUnit.unitName || t("Unnamed AC Unit")}\n${t("Serial")}: ${selectedUnit.serialNumber || t("Not recorded")}`} multiline />
          <Text style={{ color: COLORS.textSecondary, lineHeight: 20 }}>{t("The request will be linked to this exact registered unit. Use the AC unit dropdown above to change it.")}</Text>
        </View> : hasRequestedUnit ? <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.xs }}>{t("This request is locked to the AC unit you opened. Return to My AC Units to choose a different unit.")}</Text> : <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.xs }}>{t("Choose one registered AC unit before completing the request.")}</Text>}
        {requestMode === "service" ? <>
        <BottomSheetSelect translate={t} label={t("Service")} value={selectedService?.title} placeholder={t("Choose service")} items={serviceOfferings} itemIcon="construct-sharp" getKey={(item) => item.id} getLabel={(item) => item.title} onSelect={(service) => setSelectedServiceId(service.id)} />
        <Text style={{ color: COLORS.textSecondary, lineHeight: 20 }}>{selectedService?.summary}</Text>
        {selectedService?.pricing?.label ? <Text style={{ color: COLORS.primary, fontWeight: "700", marginTop: SPACING.xs }}>{t("Service price")}: {selectedService.pricing.label}</Text> : null}
        {serviceCatalogError ? <Text style={{ color: COLORS.danger, marginTop: SPACING.xs }}>{t(serviceCatalogError)}</Text> : null}
        {serviceCatalogError ? <Button title={t("Retry services")} variant="secondary" onPress={loadServiceCatalog} /> : null}
        <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.sm }}>{t("Regular and deep cleaning are the two cleaning options. If you are unsure when the AC was last cleaned, describe it below so our team can advise you.")}</Text>
        </> : <Text style={{ color: COLORS.textSecondary, lineHeight: 20 }}>{t("Describe the fault below. Our team will review your coverage before arranging a visit. Submitting a claim does not mean it has been approved.")}</Text>}
        <Button title={t("Browse FAQs")} variant="secondary" onPress={() => router.push("/customer/faq")} />
      </Card>
      {selectedUnit ? <Card>
        <CustomerSectionHeader title={t("Coverage & Request Status")} />
        <DetailRow label={t("Warranty")} value={t(readableStatus(selectedUnit.warrantyStatus || selectedUnit.warranty?.status || "pending activation"))} />
        <DetailRow label={t("Coverage expires")} value={selectedUnit.warrantyExpirationDate || selectedUnit.warranty?.expirationDate ? formatDate(selectedUnit.warrantyExpirationDate || selectedUnit.warranty?.expirationDate) : t("Not recorded")} />
        {selectedActiveRequest ? <>
          <StatusChip label={t(selectedActiveRequest.status || "Submitted")} color={COLORS.warning} />
          <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.sm }}>
            {language === "Filipino"
              ? `Pinoproseso na ang ${selectedActiveRequest.serviceType || selectedActiveRequest.issueType || t("Service")}. Maaari mong subaybayan ang mga update rito at sa iyong mga notification.`
              : `${selectedActiveRequest.serviceType || selectedActiveRequest.issueType || "Service"} is already being handled. You can follow updates here and in your notifications.`}
          </Text>
        </> : null}
        {activeWarrantyClaim ? <View style={selectedActiveRequest ? { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border } : undefined}>
          <StatusChip label={`${t("Claim")} ${t(readableStatus(activeWarrantyClaim.status))}`} color={COLORS.warning} />
          <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.sm }}>
            {String(activeWarrantyClaim.status).toLowerCase() === "approved"
              ? t("Your claim was approved and a service request was created. The branch will notify you when a technician and schedule are assigned.")
              : t("No duplicate request is needed. Your claim is being reviewed, and you will be notified when its status changes.")}
          </Text>
        </View> : null}
        {selectedActiveRequest ? <Button
          title={t("View Request Details")}
          variant="secondary"
          style={{ marginTop: SPACING.md }}
          onPress={() => router.push({
            pathname: "/customer/units/[id]",
            params: { id: selectedUnit.id, page: "service" },
          })}
        /> : null}
        {requestMode === "warranty" && !warrantyEligible && !activeWarrantyClaim ? <Text accessibilityRole="alert" style={{ color: COLORS.danger, lineHeight: 20 }}>{t("This AC does not currently have active warranty coverage. Choose Cleaning or Service for a standard request, or contact our team about your coverage.")}</Text> : null}
      </Card> : null}
      <ServiceRequestPaymentSummary mode={requestMode} service={selectedService} payment={selectedActiveRequest?.servicePayment} />
      {!selectedActiveRequest && !activeWarrantyClaim ? <Card>
        <CustomerSectionHeader title={t(requestMode === "warranty" ? "Warranty Claim Details" : "Visit Details")} />
        {requestMode === "service" ? <CalendarDatePicker label={t("Preferred Date")} value={preferredDate} onChange={selectDate} minimumDate={getManilaDateKey()} maximumDate={getServiceBookingMaxDateKey()} required error={t(dateError)} /> : null}
        <TextField key={concernInputKey} label={t(requestMode === "warranty" ? "AC problem" : "Service Concern")} value={issueDescription} onChangeText={setIssueDescription} placeholder={t(requestMode === "warranty" ? "Describe the fault you want us to review" : "Tell us about the cleaning or service needed")} maxLength={MAX_SERVICE_CONCERN_LENGTH} helperText={`${issueDescription.length}/${MAX_SERVICE_CONCERN_LENGTH}`} multiline style={{ minHeight: 100, textAlignVertical: "top" }} />
        <TextField label={t("Notes (optional)")} value={notes} onChangeText={setNotes} placeholder={t("Additional site instructions or preferences")} multiline style={{ minHeight: 80, textAlignVertical: "top" }} />
      </Card> : null}
    </CustomerScreen>
  );
}
