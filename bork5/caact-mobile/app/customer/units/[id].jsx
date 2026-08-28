import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

const ACTIVE_REQUEST_STATUSES = new Set(["pending", "submitted", "reviewed", "assigned", "in progress"]);
const ACTIVE_CLAIM_STATUSES = new Set(["submitted", "under_review", "approved"]);
const DETAIL_PAGES = ["Overview", "Warranty", "Service Visits", "AMP Reports"];
const ROOM_SIZE_OPTIONS = [6, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 50].map((size) => ({
  id: String(size),
  value: size,
  label: `Approximately ${size} m²`,
}));

function checkInForTask(task = {}) {
  return task?.checkIn || task?.payload?.checkIn || null;
}

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
  const [detailPage, setDetailPage] = useState(0);

  const unitId = readParam(params.id);

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

          const relatedRequests = loadedHistory.requests.filter(
            (request) =>
              String(request.unitId || "") === String(loadedUnit.id) ||
              String(request.unitName || "").toLowerCase() ===
                String(loadedUnit.unitName || "").toLowerCase(),
          );
          const relatedRequestIds = new Set(
            relatedRequests.map((request) => String(request.id)),
          );
          const relatedTasks = loadedHistory.linkedTasks.filter(
            (task) =>
              String(task.unitId || "") === String(loadedUnit.id) ||
              (Array.isArray(task.serialNumbers) && task.serialNumbers.some(
                (serialNumber) => String(serialNumber || "").toLowerCase() === String(loadedUnit.serialNumber || "").toLowerCase(),
              )) ||
              String(task.unitName || "").toLowerCase() ===
                String(loadedUnit.unitName || "").toLowerCase() ||
              relatedRequestIds.has(String(task.requestId || "")),
          );

          setUnit(loadedUnit);
          setHistory({
            requests: relatedRequests,
            linkedTasks: relatedTasks,
            completedServices: relatedTasks.filter(
              (task) => String(task.status || "").toLowerCase() === "completed",
            ),
          });
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

  const activeServiceRequest = history.requests.find((request) =>
    ACTIVE_REQUEST_STATUSES.has(String(request?.status || "").toLowerCase()),
  );
  const activeWarrantyClaim = (unit?.warranty?.claims || []).find((claim) =>
    ACTIVE_CLAIM_STATUSES.has(String(claim?.status || "").toLowerCase()),
  );
  const warrantyStatus = String(unit?.warrantyStatus || unit?.warranty?.status || "pending_activation").toLowerCase();
  const canSubmitWarrantyClaim = warrantyStatus === "active" && !activeServiceRequest && !activeWarrantyClaim;
  const checkedInTask = history.linkedTasks.find((task) => checkInForTask(task)?.checkedInAt);
  const latestCheckIn = checkInForTask(checkedInTask);
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
            Warranty claim {activeWarrantyClaim.claimId} is {String(activeWarrantyClaim.status || "under review").replace(/_/g, " ")}. Once approved, its service request is created automatically.
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
            <CustomerSectionHeader title="Service Request Status" />
            <DetailRow label="Open Requests" value={String(history.requests.length)} />
            <DetailRow label="Assigned Work Orders" value={String(history.linkedTasks.length)} />
            <DetailRow label="Completed Services" value={String(history.completedServices.length)} />
            <Button title="Book Service for This AC" onPress={() => router.push({ pathname: "/customer/services", params: { unitId: unit?.id || "", serviceType: recommendation?.recommendedService || "regular_cleaning" } })} leftIcon={<Ionicons name="calendar-sharp" size={18} color={COLORS.surface} />} />
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
            Generate a maintenance plan or summary from your recorded installation and service history.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginTop: SPACING.xs }}>
            {[["predictive_maintenance", "Maintenance plan"], ["maintenance_summary", "Summary"]].map(([type, label]) => (
              <Button key={type} title={label} size="sm" variant="secondary" onPress={() => handleAmpReport(type)} loading={ampReportLoading === type} disabled={Boolean(ampReportLoading)} style={{ marginTop: 0, flexGrow: 1 }} />
            ))}
          </View>
          {ampReport ? (
            <View style={{ marginTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md }}>
              <Text style={{ color: COLORS.text, fontWeight: FONT.black, fontSize: FONT.md }}>{ampReport.reportLabel}</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 3 }}>{ampReport.reportId}</Text>
              <DetailRow label="Prepared by" value={ampReport.preparedBy || ampReport.branch} />
              <DetailRow label="Recommended Service Date" value={formatDate(ampReport.maintenance?.bestServicedBy)} />
              <DetailRow label="Recommended Service" value={String(ampReport.maintenance?.recommendedService || "regular cleaning").replace(/_/g, " ")} />
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
