import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

import QrCameraScanner from "../../components/technician/QrCameraScanner";
import TechnicianScreen, { TechHero } from "../../components/technician/TechnicianScreen";
import TechButton from "../../components/technician/TechButton";
import Card from "../../components/ui/Card";
import IconRow from "../../components/ui/IconRow";
import StatusChip from "../../components/ui/StatusChip";
import TextField from "../../components/ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { lookupUnitContext, parseLookupTarget } from "../../services/qrLookupService";
import { TASK_STATUS } from "../../services/taskStorage";
import {
  ensureSeededScannerUnit,
  SEEDED_SCANNER_UNIT_QR,
} from "../../services/unitStorage";

const TASK_STATUS_COLOR = {
  [TASK_STATUS.PENDING]: COLORS.warning,
  [TASK_STATUS.IN_PROGRESS]: COLORS.tech,
  [TASK_STATUS.COMPLETED]: COLORS.success,
  [TASK_STATUS.CANCELLED]: COLORS.textMuted,
};

function DetailPair({ label, value }) {
  if (!value) return null;
  return (
    <View
      style={{
        flexBasis: "48%",
        flexGrow: 1,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        marginBottom: SPACING.sm,
      }}
    >
      <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>{label}</Text>
      <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({ icon, title, count }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: SPACING.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons name={icon} size={20} color={COLORS.tech} />
        <Text
          style={{
            fontWeight: FONT.black,
            color: COLORS.textPrimary,
            fontSize: FONT.lg,
            marginLeft: SPACING.xs,
          }}
        >
          {title}
        </Text>
      </View>
      {count !== undefined ? <StatusChip label={String(count)} color={COLORS.tech} /> : null}
    </View>
  );
}

function HistoryTable({ columns, rows, getValues }) {
  if (!rows?.length) {
    return <Text style={{ color: COLORS.textSecondary }}>No records found.</Text>;
  }
  return (
    <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, overflow: "hidden" }}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ minWidth: columns.length * 132 }}>
          <View style={{ flexDirection: "row", backgroundColor: COLORS.surfaceAlt, padding: SPACING.xs }}>
            {columns.map((column) => <Text key={column} style={{ width: 132, color: COLORS.textSecondary, fontWeight: FONT.black, fontSize: 11 }}>{column}</Text>)}
          </View>
          {rows.map((row, index) => (
            <View key={row.id || `${row.date}-${index}`} style={{ flexDirection: "row", padding: SPACING.xs, borderTopWidth: index ? 1 : 0, borderColor: COLORS.border }}>
              {getValues(row).map((value, valueIndex) => <Text key={`${row.id || index}-${valueIndex}`} numberOfLines={3} style={{ width: 132, color: COLORS.textPrimary, fontSize: 11, paddingRight: 8 }}>{value || "—"}</Text>)}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default function ScanScreen() {
  const router = useRouter();
  const { serial } = useLocalSearchParams();
  const [code, setCode] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const inFlightRef = useRef(false);
  const lastNoticeRef = useRef({ value: "", time: 0 });

  useEffect(() => {
    ensureSeededScannerUnit().catch(() => {});
  }, []);

  useEffect(() => {
    const serialValue = Array.isArray(serial) ? serial[0] : serial;
    if (!serialValue) return;
    setScannerActive(false);
    setCode(String(serialValue));
    lookup(String(serialValue));
  }, [serial]);

  const lookup = async (rawValue, options = {}) => {
    const value = String(rawValue || "").trim();
    if (!value) {
      Alert.alert("Missing Input", "Enter or scan a serial number or AC unit code.");
      return;
    }
    if (inFlightRef.current) return;

    const target = parseLookupTarget(value);

    inFlightRef.current = true;
    setLoading(true);
    try {
      const data = await lookupUnitContext(value);
      setResult(data);
      setCode(target.serialNumber || target.lookupValue || value);
      if (options.fromCamera) {
        setLastScannedCode(value);
        setScannerActive(false);
      }
      if (!data.unit) {
        const now = Date.now();
        const noticeKey = target.serialNumber || target.lookupValue || value;
        const shouldShowNotice =
          lastNoticeRef.current.value !== noticeKey ||
          now - lastNoticeRef.current.time > 2500;
        if (shouldShowNotice) {
          lastNoticeRef.current = { value: noticeKey, time: now };
          Alert.alert(
            data.lookupError ? "QR lookup failed" : "Not Found",
            data.lookupError ||
              `No AC unit matched serial ${target.serialNumber || target.lookupValue || value}.`,
          );
        }
      }
    } catch {
      Alert.alert("Error", "AC unit search failed.");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleScanned = (value) => {
    lookup(value, { fromCamera: true });
  };

  const handleClear = () => {
    setCode("");
    setResult(null);
    setLastScannedCode("");
    setScannerActive(true);
  };

  return (
    <TechnicianScreen
      title="Scan AC Unit"
      subtitle="Scan a QR code or search by unit code"
      icon="qr-code-sharp"
    >
      <TechHero
        title="AC unit lookup"
        subtitle="Scan with the camera or enter the AC unit code below."
        icon="scan-sharp"
      >
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <TechButton
            title="Camera"
            onPress={() => setScannerActive(true)}
            variant={scannerActive ? "secondary" : "ghost"}
            style={{ flex: 1 }}
            leftIcon={<Ionicons name="camera-sharp" size={18} color={COLORS.tech} />}
          />
          <TechButton
            title="Manual"
            onPress={() => setScannerActive(false)}
            variant={!scannerActive ? "secondary" : "ghost"}
            style={{ flex: 1 }}
            leftIcon={<Ionicons name="keypad-sharp" size={18} color={COLORS.tech} />}
          />
        </View>
      </TechHero>

      {scannerActive ? (
        <QrCameraScanner active={scannerActive && !loading} onScanned={handleScanned} />
      ) : null}

      {lastScannedCode ? (
        <Card
          style={{
            backgroundColor: COLORS.techLight,
            borderColor: COLORS.tech,
          }}
        >
          <IconRow
            icon="checkmark-circle-sharp"
            title="QR captured"
            subtitle={lastScannedCode}
            color={COLORS.success}
            right={
              <TouchableOpacity
                onPress={() => {
                  setLastScannedCode("");
                  setScannerActive(true);
                }}
                hitSlop={10}
              >
                <Text style={{ color: COLORS.tech, fontWeight: FONT.black }}>Scan again</Text>
              </TouchableOpacity>
            }
          />
        </Card>
      ) : null}

      <Card>
        <SectionTitle
          icon="keypad-sharp"
          title={scannerActive ? "Manual Search" : "Manual AC Unit Search"}
        />
        <TextField
          label="Serial Number or AC Unit Code"
          value={code}
          onChangeText={setCode}
          placeholder={SEEDED_SCANNER_UNIT_QR}
          autoCapitalize="none"
        />
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <TechButton
            title={loading ? "Searching..." : "Search"}
            onPress={() => lookup(code)}
            loading={loading}
            leftIcon={<Ionicons name="search-sharp" size={18} color={COLORS.surface} />}
            style={{ flex: 1 }}
          />
          <TechButton
            title="Clear"
            onPress={handleClear}
            variant="secondary"
            leftIcon={<Ionicons name="close-circle-sharp" size={18} color={COLORS.tech} />}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      {result?.unit ? (
        <>
          <Card>
            <SectionTitle icon="snow-sharp" title={result.unit.unitName || "AC Unit Details"} />
            <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>
              {`${result.unit.brand || "Brand not set"} ${result.unit.model || ""}`.trim()}
            </Text>
            {result.health ? (
              <View
                style={{
                  backgroundColor: `${result.health.color}14`,
                  borderRadius: RADIUS.lg,
                  padding: SPACING.md,
                  marginBottom: SPACING.sm,
                  borderWidth: 1,
                  borderColor: `${result.health.color}33`,
                }}
              >
                <Text
                  style={{
                    color: result.health.color,
                    fontSize: 30,
                    fontWeight: FONT.black,
                  }}
                >
                  {result.health.score}
                </Text>
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>
                  {result.health.label}
                </Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 }}>
                  {result.health.recommendation}
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
              <DetailPair label="Serial" value={result.unit.serialNumber || "Not provided"} />
              <DetailPair label="QR Unit ID" value={result.unit.qrUnitId || result.unit.id || result.unit.qrCode || "Not provided"} />
              <DetailPair label="Branch" value={result.unit.branch || "Not provided"} />
              <DetailPair label="Current Owner" value={result.unit.currentOwner || "Not assigned"} />
              <DetailPair label="Warranty" value={String(result.unit.warrantyStatus || "Not recorded").replace(/_/g, " ")} />
              <DetailPair
                label="Order Status"
                value={result.unit.orderFulfillmentLabel}
              />
              <DetailPair
                label="Order Code"
                value={result.unit.orderFulfillment?.order?.orderCode}
              />
              <DetailPair label="Installed" value={result.unit.installationDate} />
              <DetailPair label="Placement" value={result.unit.placementArea || "Not provided"} />
              <DetailPair
                label="Next Maintenance"
                value={result.health?.aiPrediction?.nextMaintenanceDate}
              />
            </View>
          </Card>

          <Card>
            <SectionTitle icon="build-sharp" title="Maintenance History" count={result.maintenanceHistory?.length || 0} />
            <HistoryTable
              columns={["Date", "Service", "Technician", "Findings", "Action", "Status"]}
              rows={result.maintenanceHistory || []}
              getValues={(item) => [String(item.date || "").slice(0, 10), item.serviceType, item.technician, item.findings, item.actionTaken, item.status]}
            />
          </Card>

          <Card>
            <SectionTitle icon="medkit-sharp" title="Repair History" count={result.repairHistory?.length || 0} />
            <HistoryTable
              columns={["Date", "Issue", "Diagnosis", "Parts", "Technician", "Status"]}
              rows={result.repairHistory || []}
              getValues={(item) => [String(item.date || "").slice(0, 10), item.issue, item.diagnosis, item.partsUsed, item.technician, item.status]}
            />
          </Card>

          <Card>
            <SectionTitle icon="pulse-sharp" title="AMP Assessment" count={result.ampHistory?.length || 0} />
            <HistoryTable
              columns={["Date / Period", "Usage", "Health", "Risk", "Recommendation"]}
              rows={result.ampHistory || []}
              getValues={(item) => [`${String(item.date || "").slice(0, 10)} ${item.period || ""}`.trim(), item.usageData, String(item.healthScore ?? ""), item.riskLevel, item.recommendation]}
            />
          </Card>

          {result.requests.length > 0 ? (
            <Card>
              <SectionTitle
                icon="document-text-sharp"
                title="Service Requests"
                count={result.requests.length}
              />
              {result.requests.map((request) => (
                <View key={request.id} style={{ paddingVertical: SPACING.xs }}>
                  <IconRow
                    icon="construct-sharp"
                    title={request.issueType || request.serviceType || "Service Request"}
                    subtitle={`Status: ${request.status || "Unknown"} • ${request.preferredDate || "No date"}`}
                    color={COLORS.tech}
                  />
                </View>
              ))}
            </Card>
          ) : null}

          {result.tasks.length > 0 ? (
            <Card>
              <SectionTitle icon="clipboard-sharp" title="Related Work Orders" count={result.tasks.length} />
              {result.tasks.map((task) => (
                <View key={task.id} style={{ paddingVertical: SPACING.xs }}>
                  <IconRow
                    icon="briefcase-sharp"
                    title={task.title || "Work Order"}
                    subtitle={`${task.assignedTechnicianName || "Unassigned"} • ${task.scheduledDate || "Unscheduled"}`}
                    color={TASK_STATUS_COLOR[task.status] || COLORS.textSecondary}
                    right={
                      <StatusChip
                        label={task.status}
                        color={TASK_STATUS_COLOR[task.status] || COLORS.textSecondary}
                      />
                    }
                  />
                  {result.unit?.serialNumber ? (
                    <TechButton
                      title="Register This Unit"
                      onPress={() =>
                        router.push(
                          `/technician/task/${task.id}/amp-registration?serial=${encodeURIComponent(result.unit.serialNumber)}`,
                        )
                      }
                      size="sm"
                      leftIcon={<Ionicons name="construct-sharp" size={16} color={COLORS.surface} />}
                    />
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
    </TechnicianScreen>
  );
}
