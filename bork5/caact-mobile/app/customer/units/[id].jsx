import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";

import {
  CustomerHealthPanel,
  CustomerMaintenancePanel,
} from "../../../components/customer/CustomerHealthPanels";
import CustomerScreen from "../../../components/customer/CustomerScreen";
import CustomerSectionHeader from "../../../components/customer/CustomerSectionHeader";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import DetailRow from "../../../components/ui/DetailRow";
import EmptyState from "../../../components/ui/EmptyState";
import { COLORS, FONT, RADIUS, SPACING } from "../../../constants/theme";
import { useUserContext } from "../../../context/UserContext";
import {
  buildNextRecommendedMaintenance,
  calculateUnitHealthScore,
} from "../../../services/acHealthScoreService";
import { getCustomerServiceHistory } from "../../../services/customerHistoryService";
import {
  ensureSeededCustomerUnit,
  getUnitByCode,
} from "../../../services/unitStorage";
import { createWarrantyClaim, generateAmpReport, getStoredToken } from "../../../services/api";

function readParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value = "") {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

export default function CustomerUnitDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { current } = useUserContext();
  const [unit, setUnit] = useState(null);
  const [health, setHealth] = useState(null);
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
      const nextHealth = calculateUnitHealthScore({
        unit: nextUnit,
        requests: history.requests,
        tasks: history.linkedTasks,
      });
      setHealth(nextHealth);
      setMaintenance(buildNextRecommendedMaintenance(nextHealth));
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
        ensureSeededCustomerUnit(current).then(() => getUnitByCode(unitId)),
        getCustomerServiceHistory(current?.id),
      ])
        .then(([loadedUnit, loadedHistory]) => {
          if (!active) return;

          const ownsUnit =
            loadedUnit &&
            String(loadedUnit.userId || "") === String(current?.id || "");

          if (!ownsUnit) {
            setUnit(null);
            setHealth(null);
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
          const nextHealth = calculateUnitHealthScore({
            unit: loadedUnit,
            requests: relatedRequests,
            tasks: relatedTasks,
          });
          setHealth(nextHealth);
          setMaintenance(buildNextRecommendedMaintenance(nextHealth));
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [current, unitId]),
  );

  if (!loading && !unit) {
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
          <View style={{ width: 52, height: 52, borderRadius: RADIUS.lg, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
            <Ionicons name="snow-sharp" size={28} color={COLORS.surface} />
          </View>
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
        </View>
      </Card>

      <CustomerHealthPanel health={health} />

      <CustomerMaintenancePanel maintenance={maintenance} />

      <Card>
        <CustomerSectionHeader title="AEROPULSE AMP Reports" />
        <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, lineHeight: 19 }}>
          Generate a current AC health, maintenance, root-cause, or summary report from your recorded installation and service history.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginTop: SPACING.xs }}>
          {[
            ["ac_health_analysis", "Health analysis"],
            ["predictive_maintenance", "Maintenance plan"],
            ["root_cause_analysis", "Root cause"],
            ["summary_report", "Summary"],
          ].map(([type, label]) => (
            <Button
              key={type}
              title={label}
              size="sm"
              variant="secondary"
              onPress={() => handleAmpReport(type)}
              loading={ampReportLoading === type}
              disabled={Boolean(ampReportLoading)}
              style={{ marginTop: 0, flexGrow: 1 }}
            />
          ))}
        </View>
        {ampReport ? (
          <View style={{ marginTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md }}>
            <Text style={{ color: COLORS.text, fontWeight: FONT.black, fontSize: FONT.md }}>{ampReport.reportLabel}</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 3 }}>{ampReport.reportId}</Text>
            <DetailRow label="Prepared by" value={ampReport.preparedBy || ampReport.branch} />
            <DetailRow label="Health status" value={`${ampReport.health?.label || "Assessment"} · ${ampReport.health?.score ?? "-"}/100`} />
            <DetailRow label="Summary" value={ampReport.executiveSummary} multiline />
            <DetailRow label="Recommendation" value={ampReport.recommendations?.[0] || "No recommendation available."} multiline />
            <DetailRow label="Report file" value={ampReport.fileName || "Available from the AEROPULSE web portal."} multiline />
          </View>
        ) : null}
      </Card>

      <Card>
        <CustomerSectionHeader title="Your AC at a glance" />
        <DetailRow label="Serial Number" value={unit?.serialNumber} />
        <DetailRow label="Last Maintenance" value={unit?.lastMaintenanceDate || "Not recorded"} />
        <DetailRow label="Placement" value={unit?.placementArea || "Not set"} />
        <DetailRow
          label="Environment"
          value={unit?.installationEnvironment || "Not set"}
        />
        <DetailRow label="Usage Level" value={unit?.usageLevel || "Normal"} />
        <DetailRow
          label="Ventilation"
          value={unit?.ventilationQuality || "Good"}
        />
        <DetailRow label="Inventory QR" value={unit?.qrCode} multiline />
      </Card>

      <Card>
        <CustomerSectionHeader title="Warranty" />
        <DetailRow label="Status" value={String(unit?.warrantyStatus || unit?.warranty?.status || "pending activation").replace(/_/g, " ")} />
        <DetailRow label="Warranty Type" value={unit?.warranty?.warrantyType || "Standard manufacturer warranty"} />
        <DetailRow label="Coverage Start" value={formatDate(unit?.warranty?.startDate)} />
        <DetailRow label="Expires" value={formatDate(unit?.warrantyExpirationDate || unit?.warranty?.expirationDate)} />
        <DetailRow label="Covered Components" value={unit?.warranty?.coveredComponents?.join(", ") || "Coverage details pending"} multiline />
        <DetailRow label="Limitations" value={unit?.warranty?.coverageLimitations?.join(" ") || "See warranty terms"} multiline />
        <DetailRow label="Warranty Claims" value={String(unit?.warranty?.claims?.length || 0)} />
        {(unit?.warranty?.claims || []).map((claim) => (
          <DetailRow
            key={claim.claimId}
            label={`${claim.claimId} · ${String(claim.status || "submitted").replace(/_/g, " ")}`}
            value={claim.issue || "Warranty claim"}
            multiline
          />
        ))}
        {(unit?.warranty?.serviceRecords || []).slice(0, 5).map((record, index) => (
          <DetailRow
            key={`${record.serviceDate}-${index}`}
            label={`Warranty service · ${formatDate(record.serviceDate)}`}
            value={record.summary || record.visitType || "Service record"}
            multiline
          />
        ))}
        {unit?.warrantyRecommendation ? <DetailRow label="AMP Recommendation" value={unit.warrantyRecommendation} multiline /> : null}
        {!["expired", "void", "under_review", "approved"].includes(String(unit?.warrantyStatus || unit?.warranty?.status || "").toLowerCase()) ? (
          <>
            <Text style={{ color: COLORS.text, fontWeight: FONT.bold, marginTop: SPACING.sm }}>Request warranty support</Text>
            <TextInput
              value={claimIssue}
              onChangeText={setClaimIssue}
              placeholder="Describe the issue with your AC unit"
              placeholderTextColor={COLORS.textMuted}
              multiline
              style={{ minHeight: 88, marginTop: SPACING.xs, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.sm, color: COLORS.text, textAlignVertical: "top" }}
            />
            <Button title="Submit Warranty Claim" onPress={handleWarrantyClaim} loading={claimSubmitting} disabled={claimSubmitting} />
          </>
        ) : null}
      </Card>

      {health?.aiPrediction ? (
        <Card>
          <CustomerSectionHeader title="Maintenance Forecast" />
          <DetailRow
            label="Forecast"
            value={health.aiPrediction.predictionSummary}
            multiline
          />
          <DetailRow
            label="Next Recommended Maintenance"
            value={health.aiPrediction.nextMaintenanceDate}
          />
          <DetailRow
            label="Estimated Remaining Life"
            value={`${health.aiPrediction.estimatedRemainingYears} years`}
          />
        </Card>
      ) : null}

      <Card>
          <CustomerSectionHeader title="Service Request Status" />
        <DetailRow label="Open Requests" value={String(history.requests.length)} />
        <DetailRow
          label="Assigned Work Orders"
          value={String(history.linkedTasks.length)}
        />
        <DetailRow
          label="Completed Services"
          value={String(history.completedServices.length)}
        />
        <Button
          title="Book Service for This AC"
          onPress={() => router.push("/customer/services")}
          leftIcon={
            <Ionicons
              name="calendar-sharp"
              size={18}
              color={COLORS.surface}
            />
          }
        />
      </Card>

      {unit?.serviceHistory?.length ? (
        <Card>
          <CustomerSectionHeader title="Service & Repair History" />
          {unit.serviceHistory.slice(0, 5).map((service) => (
            <DetailRow
              key={service.id || `${service.date}-${service.serviceType}`}
              label={`${service.serviceType || "Service"} · ${formatDate(service.date)}`}
              value={service.details || service.conditionRating || "Service completed"}
              multiline
            />
          ))}
        </Card>
      ) : null}
    </CustomerScreen>
  );
}
