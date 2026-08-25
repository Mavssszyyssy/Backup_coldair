import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../components/technician/TechButton";
import QrCameraScanner from "../../../../components/technician/QrCameraScanner";
import UnitHistoryPanel from "../../../../components/technician/UnitHistoryPanel";
import Card from "../../../../components/ui/Card";
import InfoCard from "../../../../components/ui/InfoCard";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../constants/theme";
import { fetchTechnicianUnitHistory, getStoredToken } from "../../../../services/api";
import { getTaskById, registerTaskAmpUnit } from "../../../../services/taskStorage";
import { parseLookupTarget } from "../../../../services/qrLookupService";

const taskSerials = (task = {}) => {
  const progressSerials = task?.registrationProgress?.requiredSerials;
  const directSerials = Array.isArray(task?.serialNumbers) ? task.serialNumbers : [];
  const itemSerials = (Array.isArray(task?.items) ? task.items : []).flatMap((item = {}) => [
    ...(item.serialNumbers || []),
    ...(item.serialUnits || []).map((unit) => unit?.serialNumber),
  ]);
  return Array.from(new Set([...(Array.isArray(progressSerials) ? progressSerials : []), ...directSerials, ...itemSerials]
    .map((serial) => String(serial || "").trim()).filter(Boolean)));
};

const automaticAmpPayload = (serialNumber) => {
  const now = new Date();
  return {
    serialNumber,
    registrationSource: "qr_scan",
    installationDate: now.toISOString().slice(0, 10),
    installationTime: now.toTimeString().slice(0, 5),
    lastServiceDate: now.toISOString(),
    placementArea: "Recorded from installation proof",
    usageHoursPerDay: 8,
    filterCondition: "normal",
    coilCondition: "normal",
    drainageCondition: "clear",
    voltageStability: "stable",
    conditionRating: "good",
    notes: "Initial AMP registration completed by QR scan.",
  };
};

export default function AmpRegistrationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [message, setMessage] = useState("");
  const [unitHistory, setUnitHistory] = useState(null);

  const serials = useMemo(() => taskSerials(task), [task]);
  const progress = task?.registrationProgress;
  const totalRequired = progress?.totalRequired || serials.length;
  const totalRegistered = progress?.totalRegistered || 0;
  const isComplete = Boolean(progress?.isComplete ?? totalRequired === 0);

  const loadUnitHistory = React.useCallback(async (serialNumber) => {
    if (!serialNumber) return null;
    const token = await getStoredToken();
    if (!token) return null;
    const result = await fetchTechnicianUnitHistory(token, serialNumber, id);
    if (!result.success) return null;
    setUnitHistory(result);
    return result;
  }, [id]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const nextTask = await getTaskById(id);
      if (!nextTask) throw new Error("This work order is no longer available. Return to Work Orders and refresh the list.");
      setTask(nextTask);
      if (nextTask?.registrationProgress?.isComplete) setScannerActive(false);
      const registeredSerial = taskSerials(nextTask).find((serial) => nextTask?.ampRegistrations?.[serial]?.status === "registered");
      if (registeredSerial) await loadUnitHistory(registeredSerial);
    } catch (error) {
      Alert.alert("Unable to load work order", error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id, loadUnitHistory]);

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const handleScanned = async (rawValue) => {
    if (saving || !task) return;
    const parsed = parseLookupTarget(rawValue);
    const scannedSerial = String(parsed.serialNumber || parsed.lookupValue || "").trim();
    if (!scannedSerial) {
      Alert.alert("QR not recognized", "This QR code does not contain an AC unit serial number.");
      return;
    }
    const assignedSerial = serials.find((serial) => serial.toLowerCase() === scannedSerial.toLowerCase());
    if (!assignedSerial) {
      Alert.alert("Wrong AC unit", "This QR label is not assigned to the selected work order. Scan the AC unit assigned by Admin.");
      return;
    }
    if (task?.ampRegistrations?.[assignedSerial]?.status === "registered") {
      Alert.alert("Already registered", "This assigned AC unit was already verified for this work order.");
      return;
    }

    setSaving(true);
    setScannerActive(false);
    try {
      const result = await registerTaskAmpUnit(id, automaticAmpPayload(assignedSerial));
      const updatedTask = result.task;
      setTask(updatedTask);
      const history = await loadUnitHistory(assignedSerial);
      const updatedProgress = result.registrationProgress || updatedTask?.registrationProgress;
      const complete = Boolean(updatedProgress?.isComplete);
      const text = complete
        ? history?.unit
          ? "QR verified. Review this unit's service history, then capture the installed AC unit photo to complete the work order."
          : "QR verified. Now capture the installed AC unit photo to complete the work order."
        : `QR verified. ${updatedProgress?.totalRegistered || 0} of ${updatedProgress?.totalRequired || totalRequired} assigned units are registered. Scan the next assigned AC unit.`;
      setMessage(text);
      Alert.alert("AC unit verified", text, [{ text: "Review work order" }]);
    } catch (error) {
      setScannerActive(true);
      Alert.alert("Unable to verify AC unit", error?.message || "Please scan the assigned QR label again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.md, paddingTop: SPACING.xs, paddingBottom: SPACING.sm }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back to work order" style={{ width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-back-sharp" size={20} color={COLORS.tech} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: FONT.xl, fontWeight: FONT.black }}>Verify AC unit</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>Scan only the QR label assigned to this work order.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl + 48 }}>
        <Card>
          <InfoCard label="Work order" value={task?.taskCode || task?.title || "Loading…"} />
          <InfoCard label="Customer" value={task?.customerName || task?.customer || "Loading…"} />
          <InfoCard label="QR progress" value={loading ? "Loading…" : `${totalRegistered} of ${totalRequired} assigned units verified`} />
        </Card>

        {message ? <Card><Text style={{ color: COLORS.success, fontWeight: FONT.bold }}>{message}</Text></Card> : null}

        <UnitHistoryPanel history={unitHistory} />

        {!loading && serials.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.danger, fontWeight: FONT.bold }}>No inventory serial is assigned to this installation task.</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>Ask an administrator to assign the AC unit before continuing.</Text>
          </Card>
        ) : null}

        {isComplete ? (
          <Card>
            <Text style={{ color: COLORS.success, fontWeight: FONT.black, fontSize: FONT.lg }}>Assigned QR verified</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>The only remaining step is an installed-unit photo.</Text>
            <TechButton title="Capture installation photo" onPress={() => router.replace(`/technician/task/${id}/complete-service`)} style={{ marginTop: SPACING.md }} leftIcon={<Ionicons name="camera-sharp" size={18} color={COLORS.surface} />} />
          </Card>
        ) : serials.length > 0 ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm }}>
              <View style={{ width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
                <Ionicons name="qr-code-sharp" size={23} color={COLORS.tech} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg }}>Scan assigned QR</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>The scan automatically verifies the exact inventory unit. No form is needed.</Text>
              </View>
            </View>
            {scannerActive ? <QrCameraScanner active={scannerActive} onScanned={handleScanned} /> : <TechButton title={saving ? "Verifying…" : "Open QR scanner"} onPress={() => setScannerActive(true)} loading={saving} variant="secondary" leftIcon={<Ionicons name="camera-sharp" size={18} color={COLORS.tech} />} />}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
