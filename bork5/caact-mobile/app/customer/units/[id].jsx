import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Text, TextInput, View } from "react-native";

import {
  CustomerRecommendationPanel,
  CustomerMaintenancePanel,
} from "../../../components/customer/CustomerMaintenancePanels";
import CustomerScreen from "../../../components/customer/CustomerScreen";
import CustomerSectionHeader from "../../../components/customer/CustomerSectionHeader";
import CustomerUnitImage from "../../../components/customer/CustomerUnitImage";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import DetailRow from "../../../components/ui/DetailRow";
import EmptyState from "../../../components/ui/EmptyState";
import BottomSheetSelect from "../../../components/ui/BottomSheetSelect";
import { COLORS, FONT, RADIUS, SPACING } from "../../../constants/theme";
import { useUserContext } from "../../../context/UserContext";
import {
  buildNextRecommendedMaintenance,
  buildMaintenanceRecommendation,
} from "../../../services/maintenanceRecommendationService";
import { getCustomerServiceHistory } from "../../../services/customerHistoryService";
import {
  canCustomerCancelServiceRequest,
  getLatestTaskCheckIn,
  isActiveServiceRequest,
} from "../../../services/customerHistoryLogic";
import { cancelServiceRequest } from "../../../services/serviceRequestStorage";
import { formatUnitHorsepower } from "../../../services/unitDisplayService";
import {
  cacheUnitUpdate,
  getUnitByCode,
} from "../../../services/unitStorage";
import { createWarrantyClaim, generateAmpReport, getStoredToken, updateAmpRoomSize } from "../../../services/api";

function readParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value = "") {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(value = "") {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

const ACTIVE_CLAIM_STATUSES = new Set(["submitted", "under_review"]);
const DETAIL_PAGES = ["Overview", "Warranty", "Service Visits", "AMP Reports"];
const DETAIL_PAGE_INDEX = { overview: 0, warranty: 1, service: 2, services: 2, amp: 3 };

function detailPageFromParam(value) {
  const normalized = String(readParam(value) || "").trim().toLowerCase();
  return DETAIL_PAGE_INDEX[normalized] ?? 0;
}
const ROOM_SIZE_OPTIONS = [6, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 50].map((size) => ({
  id: String(size),
  value: size,
  label: `Approximately ${size} m²`,
}));

function checkInMapUrl(checkIn = {}) {
  const latitude = Number(checkIn?.latitude);
  const longitude = Number(checkIn?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function warrantyStatusLabel(status = "") {
  const normalized = String(status || "pending_activation").toLowerCase();
  const labels = {
    pending_activation: "Activation pending",
    active: "Active",
    expired: "Expired",
    under_review: "Claim under review",
    approved: "Claim approved",
    rejected: "Claim not approved",
    void: "Unavailable",
  };
  return labels[normalized] || normalized.replace(/_/g, " ");
}

function warrantyGuidance(unit = {}, status = "") {
  if (status === "pending_activation") {
    return "No action is needed. Your warranty activates automatically after the technician completes and verifies your AC installation.";
  }
  return unit?.warrantyRecommendation || "Keep your installation and completed service records for future warranty support.";
}

function serviceName(value = "") {
  const normalized = String(value || "regular_cleaning").trim().toLowerCase();
  const labels = {
    regular_cleaning: "Regular cleaning",
    deep_cleaning: "Deep cleaning",
    maintenance: "Maintenance",
    repair: "Repair",
  };
  return labels[normalized] || normalized.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function serviceRequestHistoryForUnit(loadedUnit = {}, loadedHistory = {}) {
  const requests = Array.isArray(loadedHistory.requests) ? loadedHistory.requests : [];
  const linkedTasks = Array.isArray(loadedHistory.linkedTasks) ? loadedHistory.linkedTasks : [];
  const unitId = String(loadedUnit.id || "");
  const unitName = String(loadedUnit.unitName || "").trim().toLowerCase();
  const serialNumber = String(loadedUnit.serialNumber || "").trim().toLowerCase();

  const relatedRequests = requests.filter((request) =>
    (unitId && String(request.unitId || "") === unitId) ||
    (unitName && String(request.unitName || "").trim().toLowerCase() === unitName) ||
    (serialNumber && String(request.unitSerialNumber || "").trim().toLowerCase() === serialNumber),
  );
  const relatedRequestIds = new Set(
    relatedRequests.map((request) => String(request.id || "")).filter(Boolean),
  );
  const relatedTasks = linkedTasks.filter((task) =>
    (unitId && String(task.unitId || "") === unitId) ||
    (serialNumber && Array.isArray(task.serialNumbers) && task.serialNumbers.some(
      (value) => String(value || "").trim().toLowerCase() === serialNumber,
    )) ||
    (unitName && String(task.unitName || "").trim().toLowerCase() === unitName) ||
    relatedRequestIds.has(String(task.requestId || "")),
  );

  return {
    requests: relatedRequests,
    linkedTasks: relatedTasks,
    completedServices: relatedTasks.filter(
      (task) => String(task.status || "").trim().toLowerCase() === "completed",
    ),
  };
}

function requestStatusColors(status = "") {
  const normalized = String(status).trim().toLowerCase();
  if (normalized === "completed") return { background: COLORS.successLight, text: COLORS.success };
  if (normalized === "cancelled") return { background: COLORS.dangerLight, text: COLORS.danger };
  if (["assigned", "in progress"].includes(normalized)) return { background: COLORS.primaryLight, text: COLORS.primaryDark };
  return { background: COLORS.warningLight, text: COLORS.warning };
}

export default function CustomerUnitDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { current } = useUserContext();
  const [unit, setUnit] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [history, setHistory] = useState({
    requests: [],
    linkedTasks: [],
    completedServices: [],
  });
  const [loading, setLoading] = useState(true);
  const [claimIssue, setClaimIssue] = useState("");
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [ampReport, setAmpReport] = useState(null);
  const [ampReportLoading, setAmpReportLoading] = useState("");
  const [roomSize, setRoomSize] = useState("");
  const [roomSaving, setRoomSaving] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState("");
  const [detailPage, setDetailPage] = useState(() => detailPageFromParam(params.page));

  const unitId = readParam(params.id);

  useEffect(() => {
    setDetailPage(detailPageFromParam(params.page));
  }, [params.page]);

  const handleWarrantyClaim = async () => {
    if (!claimIssue.trim()) {
      Alert.alert("Describe the issue", "Enter a short description of the warranty concern first.");
      return;
    }
    const token = await getStoredToken();
    if (!token || !unit?.id) {
      Alert.alert("Sign in required", "Please sign in again before submitting a warranty claim.");
      return;
    }
    setClaimSubmitting(true);
    try {
      const result = await createWarrantyClaim(token, unit.id, { issue: claimIssue.trim() });
      if (!result.success) throw new Error(result.error);
      const nextUnit = {
        ...unit,
        warranty: result.warranty,
        warrantyStatus: result.warranty?.status || "under_review",
      };
      setUnit(nextUnit);
      await cacheUnitUpdate(nextUnit.id, {
        warranty: nextUnit.warranty,
        warrantyStatus: nextUnit.warrantyStatus,
      }).catch(() => null);
      const nextRecommendation = buildMaintenanceRecommendation({ unit: nextUnit });
      setRecommendation(nextRecommendation);
      setMaintenance(buildNextRecommendedMaintenance(nextRecommendation));
      setClaimIssue("");
      Alert.alert("Warranty claim submitted", "Your claim is under review. We will notify you when it is updated.");
    } catch (error) {
      Alert.alert("Claim not submitted", error?.message || "Please try again.");
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleAmpReport = async (reportType) => {
    const token = await getStoredToken();
    if (!token || !unit?.id) {
      Alert.alert("Sign in required", "Please sign in again before generating an AMP report.");
      return;
    }
    setAmpReportLoading(reportType);
    try {
      const result = await generateAmpReport(token, { unitId: unit.id, reportType });
      if (!result.success || !result.report) throw new Error(result.error);
      setAmpReport(result.report);
      Alert.alert("AMP report ready", `${result.report.reportLabel} was generated for ${result.report.branch}.`);
    } catch (error) {
      Alert.alert("Report unavailable", error?.message || "Please try again.");
    } finally {
      setAmpReportLoading("");
    }
  };

  const handleCancelServiceRequest = (request) => {
    if (!canCustomerCancelServiceRequest(request)) {
      Alert.alert(
        "Cancellation unavailable",
        "This request can no longer be cancelled because the technician has already started or completed the work.",
      );
      return;
    }

    Alert.alert(
      "Cancel this service request?",
      "The branch and assigned technician will be notified. You can book another visit afterward.",
      [
        { text: "Keep Request", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            setCancellingRequestId(String(request.id));
            try {
              const updatedRequest = await cancelServiceRequest(
                request.id,
                current?.name || current?.email || "Customer",
                "Service request cancelled by the customer before work began.",
              );
              try {
                const refreshedHistory = await getCustomerServiceHistory(current?.id);
                setHistory(serviceRequestHistoryForUnit(unit, refreshedHistory));
              } catch {
                setHistory((previous) => ({
                  ...previous,
                  requests: previous.requests.map((item) =>
                    String(item.id) === String(updatedRequest.id) ? updatedRequest : item,
                  ),
                  linkedTasks: previous.linkedTasks.map((task) =>
                    String(task.id || "") === String(updatedRequest.linkedTaskId || "")
                      ? { ...task, status: "cancelled" }
                      : task,
                  ),
                }));
              }
              Alert.alert("Request cancelled", "The service request and any scheduled work have been cancelled.");
            } catch (error) {
              Alert.alert("Unable to cancel request", error?.message || "Please try again.");
            } finally {
              setCancellingRequestId("");
            }
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Promise.all([
        getUnitByCode(unitId),
        getCustomerServiceHistory(current?.id),
      ])
        .then(([loadedUnit, loadedHistory]) => {
          if (!active) return;

          const ownsUnit =
            loadedUnit &&
            String(loadedUnit.userId || "") === String(current?.id || "");

          if (!ownsUnit) {
            setUnit(null);
            setRecommendation(null);
            setMaintenance(null);
            setHistory(loadedHistory);
            return;
          }

          setUnit(loadedUnit);
          setHistory(serviceRequestHistoryForUnit(loadedUnit, loadedHistory));
          const nextRecommendation = buildMaintenanceRecommendation({ unit: loadedUnit });
          setRecommendation(nextRecommendation);
          setMaintenance(buildNextRecommendedMaintenance(nextRecommendation));
          setRoomSize(loadedUnit.roomSizeSqm ? String(loadedUnit.roomSizeSqm) : "");
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [current, unitId]),
  );

  if (loading) {
    return (
      <CustomerScreen title="AC Unit Details" subtitle="Loading your registered AC unit">
        <Card style={{ alignItems: "center", paddingVertical: SPACING.xl }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.sm }}>
            Getting the latest unit, warranty, and service details...
          </Text>
        </Card>
      </CustomerScreen>
    );
  }

  if (!unit) {
    return (
      <CustomerScreen title="AC Unit Details" subtitle="AC unit not found">
        <Card>
          <EmptyState
            title="AC unit unavailable"
            message="This AC unit could not be found for your account."
            icon="alert-circle-sharp"
            iconColor={COLORS.warning}
            action={
              <Button title="Back to Home" onPress={() => router.replace("/customer/home")} />
            }
          />
        </Card>
      </CustomerScreen>
    );
  }

  const activeRequests = history.requests.filter(isActiveServiceRequest);
  const activeServiceRequest = activeRequests[0];
  const activeWarrantyClaim = (unit?.warranty?.claims || []).find((claim) =>
    ACTIVE_CLAIM_STATUSES.has(String(claim?.status || "").toLowerCase()),
  );
  const warrantyStatus = String(unit?.warrantyStatus || unit?.warranty?.status || "pending_activation").toLowerCase();
  const canSubmitWarrantyClaim = warrantyStatus === "active" && !activeServiceRequest && !activeWarrantyClaim;
  const latestCheckInRecord = getLatestTaskCheckIn(history.linkedTasks);
  const checkedInTask = latestCheckInRecord?.task || null;
  const latestCheckIn = latestCheckInRecord?.checkIn || null;
  const latestCheckInMapUrl = checkInMapUrl(latestCheckIn);
  const selectedRoomSize = ROOM_SIZE_OPTIONS.find(
    (option) => String(option.value) === String(roomSize),
  );
  const goToDetailPage = (nextPage) => {
    setDetailPage(Math.max(0, Math.min(DETAIL_PAGES.length - 1, nextPage)));
  };

  return (
    <CustomerScreen
      title="AC Unit Details"
      subtitle={unit?.unitName || "Loading AC unit details"}
    >
      <Card style={{ backgroundColor: COLORS.primary, borderColor: COLORS.primary, overflow: "hidden" }}>
        <View style={{ position: "absolute", width: 150, height: 150, borderRadius: RADIUS.full, backgroundColor: "rgba(255,255,255,0.10)", right: -45, top: -56 }} />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: SPACING.sm,
          }}
        >
          <CustomerUnitImage unit={unit} size={88} style={{ marginRight: SPACING.md, borderWidth: 0 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#DBEAFE", fontSize: FONT.sm, fontWeight: FONT.bold }}>YOUR REGISTERED UNIT</Text>
            <Text
              style={{
                color: COLORS.surface,
                fontSize: FONT.xl,
                fontWeight: FONT.black,
              }}
            >
              {unit?.unitName || "Unnamed AC Unit"}
            </Text>
            <Text style={{ color: "#E0F2FE", marginTop: 2 }}>
              {[unit?.brand, unit?.model].filter(Boolean).join(" / ") ||
                "Brand and model not set"}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.sm }}>
          <View style={{ flexGrow: 1, minWidth: "45%", backgroundColor: "rgba(255,255,255,0.13)", borderRadius: RADIUS.md, padding: SPACING.sm }}>
            <Text style={{ color: "#BFDBFE", fontSize: FONT.sm }}>Installed</Text>
            <Text style={{ color: COLORS.surface, fontWeight: FONT.black, marginTop: 2 }}>{unit?.installationDate || "Not recorded"}</Text>
          </View>
          <View style={{ flexGrow: 1, minWidth: "45%", backgroundColor: "rgba(255,255,255,0.13)", borderRadius: RADIUS.md, padding: SPACING.sm }}>
            <Text style={{ color: "#BFDBFE", fontSize: FONT.sm }}>Status</Text>
            <Text style={{ color: COLORS.surface, fontWeight: FONT.black, marginTop: 2 }}>{unit?.status || "Active"}</Text>
          </View>
          <View style={{ flexGrow: 1, minWidth: "45%", backgroundColor: "rgba(255,255,255,0.13)", borderRadius: RADIUS.md, padding: SPACING.sm }}>
            <Text style={{ color: "#BFDBFE", fontSize: FONT.sm }}>Horsepower</Text>
            <Text style={{ color: COLORS.surface, fontWeight: FONT.black, marginTop: 2 }}>{formatUnitHorsepower(unit)}</Text>
          </View>
        </View>
      </Card>

      <Card style={{ paddingVertical: SPACING.sm + 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: FONT.bold }}>
              PAGE {detailPage + 1} OF {DETAIL_PAGES.length}
            </Text>
            <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginTop: 2 }}>
              {DETAIL_PAGES[detailPage]}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {DETAIL_PAGES.map((page, index) => (
              <View
                key={page}
                accessibilityLabel={`${page}${index === detailPage ? ", current page" : ""}`}
                style={{
                  width: index === detailPage ? 22 : 8,
                  height: 8,
                  borderRadius: RADIUS.full,
                  backgroundColor: index === detailPage ? COLORS.primary : COLORS.border,
                }}
              />
            ))}
          </View>
        </View>
      </Card>

      {detailPage === 0 ? (
        <>
          <CustomerRecommendationPanel recommendation={recommendation} />
          <CustomerMaintenancePanel maintenance={maintenance} />
          <Card>
            <CustomerSectionHeader title="Your AC at a glance" />
            <DetailRow label="Model" value={unit?.productSku || unit?.model || "Not recorded"} />
            <DetailRow label="Serial Number" value={unit?.serialNumber} />
            <DetailRow label="Last Service" value={formatDate(unit?.lastServiceDate)} />
            <DetailRow label="Placement" value={unit?.placementArea || "Not set"} />
            <DetailRow label="Horsepower" value={formatUnitHorsepower(unit)} />
            <BottomSheetSelect
              label="Room size"
              value={selectedRoomSize?.label || (roomSize ? `${roomSize} m²` : "")}
              placeholder="Choose the closest room size"
              items={ROOM_SIZE_OPTIONS}
              itemIcon="resize-sharp"
              searchPlaceholder="Search room sizes"
              getKey={(option) => option.id}
              getLabel={(option) => option.label}
              onSelect={(option) => setRoomSize(String(option.value))}
            />
            <Button title="Save Room Size" loading={roomSaving} disabled={roomSaving} onPress={async () => {
              const value = Number(roomSize);
              if (!value || value <= 0) return Alert.alert("Choose a room size", "Select the closest room size before saving.");
              setRoomSaving(true);
              try {
                const token = await getStoredToken(); const result = await updateAmpRoomSize(token, unit.id, value);
                if (!result.success) throw new Error(result.error);
                const nextUnit = { ...unit, roomSizeSqm: value, capacityAssessment: result.recommendation?.capacityAssessment };
                setUnit(nextUnit); const nextRecommendation = buildMaintenanceRecommendation({ unit: nextUnit }); setRecommendation(nextRecommendation); setMaintenance(buildNextRecommendedMaintenance(nextRecommendation));
                Alert.alert("Room size saved", result.recommendation?.capacityAssessment?.summary || "Capacity assessment updated.");
              } catch (error) { Alert.alert("Unable to save", error.message || "Please try again."); } finally { setRoomSaving(false); }
            }} />
            <DetailRow label="Inventory QR" value={unit?.qrCode} multiline />
          </Card>
        </>
      ) : null}

      {detailPage === 1 ? (
        <Card>
          <CustomerSectionHeader title="Warranty" />
          {warrantyStatus === "pending_activation" ? (
            <View style={{ flexDirection: "row", gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.warningLight, marginBottom: SPACING.sm }}>
              <Ionicons name="time-sharp" size={22} color={COLORS.warning} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>Waiting for installation verification</Text>
                <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: 3 }}>
                  No acceptance is required from you. Coverage dates and details will appear automatically after your technician completes the verified installation.
                </Text>
              </View>
            </View>
          ) : null}
          <DetailRow label="Status" value={warrantyStatusLabel(warrantyStatus)} />
          <DetailRow label="Warranty Type" value={unit?.warranty?.warrantyType || "Standard manufacturer warranty"} />
          <DetailRow label="Coverage Start" value={formatDate(unit?.warranty?.startDate)} />
          <DetailRow label="Expires" value={formatDate(unit?.warrantyExpirationDate || unit?.warranty?.expirationDate)} />
          <DetailRow label="Covered Components" value={unit?.warranty?.coveredComponents?.join(", ") || "Coverage details pending"} multiline />
          <DetailRow label="Limitations" value={unit?.warranty?.coverageLimitations?.join(" ") || "See warranty terms"} multiline />
          <DetailRow label="Warranty Claims" value={String(unit?.warranty?.claims?.length || 0)} />
          {(unit?.warranty?.claims || []).map((claim) => (
            <DetailRow key={claim.claimId} label={`${claim.claimId} · ${String(claim.status || "submitted").replace(/_/g, " ")}`} value={claim.issue || "Warranty claim"} multiline />
          ))}
          {(unit?.warranty?.serviceRecords || []).slice(0, 5).map((record, index) => (
            <DetailRow key={`${record.serviceDate}-${index}`} label={`Warranty service · ${formatDate(record.serviceDate)}`} value={record.summary || record.visitType || "Service record"} multiline />
          ))}
          <DetailRow
            label={warrantyStatus === "pending_activation" ? "What happens next" : "Warranty guidance"}
            value={warrantyGuidance(unit, warrantyStatus)}
            multiline
          />
          {activeServiceRequest ? <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.sm }}>
            This AC already has an open {activeServiceRequest.serviceType || activeServiceRequest.issueType || "service"} request ({activeServiceRequest.status}). You do not need to open a separate warranty claim while it is being handled.
          </Text> : null}
          {activeWarrantyClaim ? <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.sm }}>
            Warranty claim {activeWarrantyClaim.claimId} is {String(activeWarrantyClaim.status || "under review").replace(/_/g, " ")}. No duplicate request is needed; you will be notified after the review.
          </Text> : null}
          {canSubmitWarrantyClaim ? (
            <>
              <Text style={{ color: COLORS.text, fontWeight: FONT.bold, marginTop: SPACING.sm }}>Request warranty support</Text>
              <TextInput value={claimIssue} onChangeText={setClaimIssue} placeholder="Describe the issue with your AC unit" placeholderTextColor={COLORS.textMuted} multiline style={{ minHeight: 88, marginTop: SPACING.xs, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.sm, color: COLORS.text, textAlignVertical: "top" }} />
              <Button title="Submit Warranty Claim" onPress={handleWarrantyClaim} loading={claimSubmitting} disabled={claimSubmitting} />
            </>
          ) : null}
          {["expired", "void", "pending_activation"].includes(warrantyStatus) && !activeServiceRequest ? <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.sm }}>
            {warrantyStatus === "pending_activation"
              ? "Need help before activation? You can still book a standard service visit from the Service Visits page."
              : `Warranty support is unavailable while coverage is ${warrantyStatus.replace(/_/g, " ")}. You can still book a standard service visit from the Service Visits page.`}
          </Text> : null}
        </Card>
      ) : null}

      {detailPage === 2 ? (
        <>
          <Card>
            <CustomerSectionHeader title="Technician Check-in" />
            {latestCheckIn ? (
              <>
                <View style={{ alignSelf: "flex-start", backgroundColor: COLORS.successLight, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm + 4, paddingVertical: 6, marginBottom: SPACING.sm }}>
                  <Text style={{ color: COLORS.success, fontWeight: FONT.black, fontSize: FONT.sm }}>GPS ARRIVAL VERIFIED</Text>
                </View>
                <DetailRow label="Technician" value={checkedInTask?.assignedTechnicianName || "Assigned technician"} />
                <DetailRow label="Checked in" value={formatDateTime(latestCheckIn.checkedInAt)} />
                <DetailRow label="GPS location" value={`${Number(latestCheckIn.latitude).toFixed(5)}, ${Number(latestCheckIn.longitude).toFixed(5)}`} multiline />
                <DetailRow label="Location accuracy" value={Number(latestCheckIn.accuracy) > 0 ? `Within approximately ${Math.round(Number(latestCheckIn.accuracy))} meters` : "Device GPS verified"} multiline />
                {latestCheckInMapUrl ? <Button title="Open Check-in Map" variant="secondary" onPress={() => Linking.openURL(latestCheckInMapUrl)} leftIcon={<Ionicons name="map-sharp" size={18} color={COLORS.primary} />} /> : null}
              </>
            ) : (
              <Text style={{ color: COLORS.textSecondary, lineHeight: 20 }}>
                No technician check-in has been recorded for this AC yet. The GPS arrival will appear here after the assigned technician checks in at your service address.
              </Text>
            )}
          </Card>
          <Card>
            <CustomerSectionHeader title="Service Requests" />
            <DetailRow label="Open Requests" value={String(activeRequests.length)} />
            <DetailRow label="Linked Work Orders" value={String(history.linkedTasks.length)} />
            <DetailRow label="Completed Services" value={String(history.completedServices.length)} />
            {history.requests.length ? history.requests.map((request, requestIndex) => {
              const statusColors = requestStatusColors(request.status);
              const requestTimeline = Array.isArray(request.timeline)
                ? [...request.timeline].sort(
                    (left, right) => new Date(left.timestamp || 0) - new Date(right.timestamp || 0),
                  )
                : [];
              const linkedTask = history.linkedTasks.find(
                (task) =>
                  String(task.id || "") === String(request.linkedTaskId || "") ||
                  String(task.requestId || "") === String(request.id || ""),
              );
              const requestReference = String(request.id || "").slice(-8).toUpperCase();

              return (
                <View
                  key={request.id || `service-request-${requestIndex}`}
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                    paddingTop: SPACING.md,
                    marginTop: SPACING.md,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: SPACING.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.textPrimary, fontSize: FONT.md, fontWeight: FONT.black }}>
                        {serviceName(request.serviceType || request.issueType)}
                      </Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 }}>
                        Request {requestReference || requestIndex + 1}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: statusColors.background, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm + 3, paddingVertical: 6 }}>
                      <Text style={{ color: statusColors.text, fontSize: FONT.sm, fontWeight: FONT.black }}>
                        {request.status || "Submitted"}
                      </Text>
                    </View>
                  </View>
                  <DetailRow label="Concern" value={request.issueDescription || request.concern || "Service requested"} multiline />
                  <DetailRow label="Preferred visit" value={formatDate(request.preferredDate)} />
                  <DetailRow label="Submitted" value={formatDateTime(request.createdAt)} />
                  <DetailRow label="Responsible branch" value={request.branch || "Being assigned"} />
                  <DetailRow
                    label="Technician"
                    value={request.assignedTechnicianName || linkedTask?.assignedTechnicianName || "Not assigned yet"}
                  />
                  {request.taskCode || linkedTask?.taskCode ? (
                    <DetailRow label="Work order" value={request.taskCode || linkedTask.taskCode} />
                  ) : null}

                  <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, marginTop: SPACING.md }}>
                    Request Timeline
                  </Text>
                  {requestTimeline.length ? requestTimeline.map((event, eventIndex) => (
                    <View
                      key={event.id || `${event.title}-${event.timestamp}-${eventIndex}`}
                      style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm }}
                    >
                      <View style={{ alignItems: "center", width: 18 }}>
                        <View style={{ width: 10, height: 10, borderRadius: RADIUS.full, backgroundColor: statusColors.text, marginTop: 4 }} />
                        {eventIndex < requestTimeline.length - 1 ? (
                          <View style={{ width: 2, flex: 1, minHeight: 34, backgroundColor: COLORS.border, marginTop: 3 }} />
                        ) : null}
                      </View>
                      <View style={{ flex: 1, paddingBottom: SPACING.xs }}>
                        <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>
                          {event.title || "Request updated"}
                        </Text>
                        {event.description ? (
                          <Text style={{ color: COLORS.textSecondary, lineHeight: 19, marginTop: 2 }}>{event.description}</Text>
                        ) : null}
                        <Text style={{ color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 3 }}>
                          {[event.actor, formatDateTime(event.timestamp)].filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                    </View>
                  )) : (
                    <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.sm }}>
                      The request was submitted. Further updates will appear here.
                    </Text>
                  )}

                  {canCustomerCancelServiceRequest(request) ? (
                    <Button
                      title="Cancel Request"
                      variant="danger"
                      size="sm"
                      loading={String(cancellingRequestId) === String(request.id)}
                      disabled={Boolean(cancellingRequestId)}
                      onPress={() => handleCancelServiceRequest(request)}
                      leftIcon={<Ionicons name="close-circle-sharp" size={17} color={COLORS.surface} />}
                    />
                  ) : null}
                </View>
              );
            }) : (
              <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.sm }}>
                No service request has been submitted for this AC yet.
              </Text>
            )}
            <Button
              title={activeServiceRequest ? "An Open Request Already Exists" : "Book Service for This AC"}
              disabled={Boolean(activeServiceRequest)}
              onPress={() => router.push({ pathname: "/customer/services", params: { unitId: unit?.id || "", serviceType: recommendation?.recommendedService || "regular_cleaning" } })}
              leftIcon={<Ionicons name="calendar-sharp" size={18} color={COLORS.surface} />}
            />
          </Card>
          {unit?.serviceHistory?.length ? (
            <Card>
              <CustomerSectionHeader title="Service & Repair History" />
              {unit.serviceHistory.slice(0, 5).map((service) => (
                <DetailRow key={service.id || `${service.date}-${service.serviceType}`} label={`${service.serviceType || "Service"} · ${formatDate(service.date)}`} value={service.details || service.conditionRating || "Service completed"} multiline />
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

      {detailPage === 3 ? (
        <Card>
          <CustomerSectionHeader title="AEROPULSE AMP Reports" />
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 19 }}>
            The next maintenance plan estimates when service is due. The service history summary organizes your recorded installation and completed visits.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginTop: SPACING.xs }}>
            {[["predictive_maintenance", "Next maintenance plan"], ["maintenance_summary", "Service history summary"]].map(([type, label]) => (
              <Button key={type} title={label} size="sm" variant="secondary" onPress={() => handleAmpReport(type)} loading={ampReportLoading === type} disabled={Boolean(ampReportLoading)} style={{ marginTop: 0, flexGrow: 1 }} />
            ))}
          </View>
          {ampReport ? (
            <View style={{ marginTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md }}>
              <Text style={{ color: COLORS.text, fontWeight: FONT.black, fontSize: FONT.md }}>{ampReport.reportLabel}</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 3 }}>{ampReport.reportId}</Text>
              <DetailRow label="Prepared by" value={ampReport.preparedBy || ampReport.branch} />
              <DetailRow label="Suggested Servicing Date" value={formatDate(ampReport.maintenance?.bestServicedBy)} />
              <DetailRow label="Recommended Service" value={serviceName(ampReport.maintenance?.recommendedService)} />
              <DetailRow label="Historical basis" value={ampReport.maintenance?.recommendationBasis || "Limited history"} multiline />
              <DetailRow label="Report file" value={ampReport.fileName || "Available from the AEROPULSE web portal."} multiline />
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card style={{ paddingVertical: SPACING.sm }}>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button title="Previous" variant="secondary" size="sm" disabled={detailPage === 0} onPress={() => goToDetailPage(detailPage - 1)} style={{ flex: 1, marginTop: 0 }} leftIcon={<Ionicons name="chevron-back-sharp" size={17} color={detailPage === 0 ? COLORS.textMuted : COLORS.primary} />} />
          <Button title={detailPage === DETAIL_PAGES.length - 1 ? "Back to My Units" : "Next"} size="sm" onPress={() => detailPage === DETAIL_PAGES.length - 1 ? router.back() : goToDetailPage(detailPage + 1)} style={{ flex: 1, marginTop: 0 }} rightIcon={<Ionicons name={detailPage === DETAIL_PAGES.length - 1 ? "checkmark-sharp" : "chevron-forward-sharp"} size={17} color={COLORS.surface} />} />
        </View>
      </Card>
    </CustomerScreen>
  );
}
