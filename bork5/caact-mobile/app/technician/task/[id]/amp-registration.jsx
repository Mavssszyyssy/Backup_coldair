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
import { getTodayDateKey } from "../../../../components/ui/CalendarDatePicker";
import TextField from "../../../../components/ui/TextField";
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

const defaultRoomDetails = {
  roomSizeSqm: "",
};

const automaticAmpPayload = (serialNumber, roomDetails) => {
  const now = new Date();
  return {
    serialNumber,
    registrationSource: "qr_scan",
    installationDate: getTodayDateKey(),
    installationTime: now.toTimeString().slice(0, 5),
    roomSizeSqm: Number(roomDetails.roomSizeSqm),
    conditionRating: "good",
    notes: "Initial registration completed by assigned QR scan.",
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
  const [pendingSerial, setPendingSerial] = useState("");
  const [roomDetails, setRoomDetails] = useState(defaultRoomDetails);

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

    setScannerActive(false);
    setPendingSerial(assignedSerial);
    setRoomDetails(defaultRoomDetails);
  };

  const submitRoomCapacity = async () => {
    if (!pendingSerial || saving) return;
    const roomSizeSqm = Number(roomDetails.roomSizeSqm);
    if (!Number.isFinite(roomSizeSqm) || roomSizeSqm <= 0 || roomSizeSqm > 10000) {
      Alert.alert("Check room size", "Enter a valid room size from 1 to 10,000 m² so the AC horsepower can be checked.");
      return;
    }
    setSaving(true);
    try {
      const result = await registerTaskAmpUnit(id, automaticAmpPayload(pendingSerial, roomDetails));
      const updatedTask = result.task;
      setTask(updatedTask);
      const history = await loadUnitHistory(pendingSerial);
      const updatedProgress = result.registrationProgress || updatedTask?.registrationProgress;
      const complete = Boolean(updatedProgress?.isComplete);
      const text = complete
        ? history?.unit
          ? "QR verified. Review this unit's service history, then capture the installed AC unit photo to complete the work order."
          : "QR verified. Now capture the installed AC unit photo to complete the work order."
        : `QR verified. ${updatedProgress?.totalRegistered || 0} of ${updatedProgress?.totalRequired || totalRequired} assigned units are registered. Scan the next assigned AC unit.`;
      setMessage(text);
      setPendingSerial("");
      setScannerActive(!complete);
      Alert.alert("AC unit verified", text, [{ text: "Review work order" }]);
    } catch (error) {
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
                <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>Scan the inventory label, then record the room size used for the horsepower suitability check.</Text>
              </View>
            </View>
            {pendingSerial ? <InfoCard label="QR captured" value={pendingSerial} /> : scannerActive ? <QrCameraScanner active={scannerActive} onScanned={handleScanned} /> : <TechButton title={saving ? "Verifying…" : "Open QR scanner"} onPress={() => setScannerActive(true)} loading={saving} variant="secondary" leftIcon={<Ionicons name="camera-sharp" size={18} color={COLORS.tech} />} />}
          </Card>
        ) : null}

        {pendingSerial ? (
          <Card>
            <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg }}>Room capacity check</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.md }}>S/N {pendingSerial}. Room size is compared with the AC horsepower. It does not change the history-based servicing interval.</Text>
            <TextField label="Room size (m²)" value={roomDetails.roomSizeSqm} onChangeText={(value) => setRoomDetails({ roomSizeSqm: value })} keyboardType="decimal-pad" inputMode="decimal" returnKeyType="done" showKeyboardDone placeholder="Required for horsepower suitability" />
            <TechButton title="Save room size and verify unit" onPress={submitRoomCapacity} loading={saving} leftIcon={<Ionicons name="checkmark-circle-sharp" size={18} color={COLORS.surface} />} />
            <TechButton title="Cancel and scan again" variant="secondary" onPress={() => { setPendingSerial(""); setScannerActive(true); }} disabled={saving} style={{ marginTop: SPACING.sm }} />
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
