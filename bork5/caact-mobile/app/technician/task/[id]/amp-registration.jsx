import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../components/technician/TechButton";
import QrCameraScanner from "../../../../components/technician/QrCameraScanner";
import UnitHistoryPanel from "../../../../components/technician/UnitHistoryPanel";
import Card from "../../../../components/ui/Card";
import InfoCard from "../../../../components/ui/InfoCard";
import { getTodayDateKey } from "../../../../components/ui/CalendarDatePicker";
import BottomSheetSelect from "../../../../components/ui/BottomSheetSelect";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../constants/theme";
import { fetchTechnicianUnitHistory, getStoredToken } from "../../../../services/api";
import { getTaskById, registerTaskAmpUnit } from "../../../../services/taskStorage";
import { resolveInventoryQrSerial } from "../../../../services/qrLookupService";
import { isInstallationWorkOrder, ROOM_SIZE_OPTIONS } from "../../../../services/technicianTaskLogic";
import { subscribeBackendRecovery } from "../../../../services/backendConnectionState";

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

const automaticAmpPayload = (serialNumber, roomDetails, registrationSource) => {
  const now = new Date();
  const manuallyEntered = registrationSource === "manual_serial";
  return {
    serialNumber,
    registrationSource: manuallyEntered ? "manual_serial" : "qr_scan",
    installationDate: getTodayDateKey(),
    installationTime: now.toTimeString().slice(0, 5),
    roomSizeSqm: Number(roomDetails.roomSizeSqm),
    conditionRating: "good",
    notes: manuallyEntered
      ? "Initial registration completed with the assigned serial number entered manually."
      : "Initial registration completed by assigned QR scan.",
  };
};

export default function AmpRegistrationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvingQr, setResolvingQr] = useState(false);
  const scanInFlight = React.useRef(false);
  const manualVerificationInFlight = React.useRef(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [verificationMode, setVerificationMode] = useState("scan");
  const [manualSerial, setManualSerial] = useState("");
  const [message, setMessage] = useState("");
  const [unitHistory, setUnitHistory] = useState(null);
  const [pendingSerial, setPendingSerial] = useState("");
  const [pendingSource, setPendingSource] = useState("qr_scan");
  const [roomDetails, setRoomDetails] = useState(defaultRoomDetails);

  const serials = useMemo(() => taskSerials(task), [task]);
  const progress = task?.registrationProgress;
  const totalRequired = progress?.totalRequired || serials.length;
  const totalRegistered = progress?.totalRegistered || 0;
  const isComplete = Boolean(progress?.isComplete ?? totalRequired === 0);
  const installationTask = isInstallationWorkOrder(task);
  const selectedRoomSize = ROOM_SIZE_OPTIONS.find((option) => String(option.value) === String(roomDetails.roomSizeSqm));

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

  useFocusEffect(React.useCallback(() => {
    void load();
    return subscribeBackendRecovery(() => { void load(); });
  }, [load]));

  const verifyAssignedUnit = async (rawValue, registrationSource = "qr_scan") => {
    const manuallyEntered = registrationSource === "manual_serial";
    const requestInFlight = manuallyEntered ? manualVerificationInFlight : scanInFlight;
    if (saving || requestInFlight.current || !task) return;
    const submittedValue = String(rawValue || "").trim();
    if (!submittedValue) {
      Alert.alert("Enter the serial number", "Type the serial number printed on the assigned AC unit.");
      return;
    }
    requestInFlight.current = true;
    setResolvingQr(true);
    try {
      // Refresh authorization/assignment first; cached work cannot verify a scan.
      const latestTask = await getTaskById(id, { requireOnline: true });
      if (!latestTask) throw new Error("This work order is no longer available. Return to Work Orders and refresh the list.");
      setTask(latestTask);
      const verifiedSerial = await resolveInventoryQrSerial(submittedValue);
      const assignedSerial = taskSerials(latestTask).find((serial) => serial.toLowerCase() === verifiedSerial.toLowerCase());
      if (!assignedSerial) {
        Alert.alert("Wrong AC unit", manuallyEntered
          ? "This serial number is not assigned to the selected work order. Enter the serial assigned by Admin."
          : "This QR label is not assigned to the selected work order. Scan the AC unit assigned by Admin.");
        return;
      }
      if (latestTask?.ampRegistrations?.[assignedSerial]?.status === "registered") {
        Alert.alert("Already registered", "This assigned AC unit was already verified for this work order.");
        return;
      }
      setScannerActive(false);
      setPendingSerial(assignedSerial);
      setPendingSource(manuallyEntered ? "manual_serial" : "qr_scan");
      if (manuallyEntered) setManualSerial("");
      setRoomDetails(defaultRoomDetails);
    } catch (error) {
      Alert.alert(manuallyEntered ? "Unable to verify serial number" : "Unable to verify QR", error?.message || (manuallyEntered
        ? "Check the serial number and your connection, then try again."
        : "Check your connection and scan again."));
    } finally {
      requestInFlight.current = false;
      setResolvingQr(false);
    }
  };

  const handleScanned = (rawValue) => verifyAssignedUnit(rawValue, "qr_scan");

  const submitRoomCapacity = async () => {
    if (!pendingSerial || saving) return;
    const roomSizeSqm = Number(roomDetails.roomSizeSqm);
    if (!Number.isFinite(roomSizeSqm) || roomSizeSqm <= 0 || roomSizeSqm > 10000) {
      Alert.alert("Choose a room size", "Select the closest room size so the AC horsepower can be checked.");
      return;
    }
    setSaving(true);
    try {
      const result = await registerTaskAmpUnit(id, automaticAmpPayload(pendingSerial, roomDetails, pendingSource));
      const updatedTask = result.task;
      setTask(updatedTask);
      const history = await loadUnitHistory(pendingSerial);
      const updatedProgress = result.registrationProgress || updatedTask?.registrationProgress;
      const complete = Boolean(updatedProgress?.isComplete);
      const text = complete
        ? history?.unit
          ? "AC unit verified. Review this unit's service history, then capture the installed AC unit photo to complete the work order."
          : "AC unit verified. Now capture the installed AC unit photo to complete the work order."
        : `AC unit verified. ${updatedProgress?.totalRegistered || 0} of ${updatedProgress?.totalRequired || totalRequired} assigned units are registered. Scan the next QR label or enter its serial number.`;
      setMessage(text);
      setPendingSerial("");
      setScannerActive(!complete);
      Alert.alert("AC unit verified", text, [{ text: "Review work order" }]);
    } catch (error) {
      Alert.alert("Unable to verify AC unit", error?.message || "Scan the assigned QR label or enter its serial number again.");
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
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>Scan the assigned QR label or enter its serial number.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl + 48 }}>
        <Card>
          <InfoCard label="Work order" value={task?.taskCode || task?.title || "Loading…"} />
          <InfoCard label="Customer" value={task?.customerName || task?.customer || "Loading…"} />
          {installationTask ? <InfoCard label="Unit progress" value={loading ? "Loading…" : `${totalRegistered} of ${totalRequired} assigned units verified`} /> : null}
        </Card>

        {!loading && !installationTask ? (
          <Card>
            <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg }}>No installation QR required</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>This is a maintenance or service visit for an already-installed AC unit. Record the service report instead of registering the unit again.</Text>
            <TechButton title="Open service report" onPress={() => router.replace(`/technician/task/${id}/complete-service`)} style={{ marginTop: SPACING.md }} />
          </Card>
        ) : null}

        {message ? <Card><Text style={{ color: COLORS.success, fontWeight: FONT.bold }}>{message}</Text></Card> : null}

        <UnitHistoryPanel history={unitHistory} />
        {resolvingQr ? <Text accessibilityRole="alert" style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>Checking the AC unit against the current work order…</Text> : null}

        {!loading && installationTask && serials.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.danger, fontWeight: FONT.bold }}>No inventory serial is assigned to this installation task.</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>Ask an administrator to assign the AC unit before continuing.</Text>
          </Card>
        ) : null}

        {installationTask && isComplete ? (
          <Card>
            <Text style={{ color: COLORS.success, fontWeight: FONT.black, fontSize: FONT.lg }}>Assigned AC unit verified</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>The only remaining step is an installed-unit photo.</Text>
            <TechButton title="Capture installation photo" onPress={() => router.replace(`/technician/task/${id}/complete-service`)} style={{ marginTop: SPACING.md }} leftIcon={<Ionicons name="camera-sharp" size={18} color={COLORS.surface} />} />
          </Card>
        ) : installationTask && serials.length > 0 ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm }}>
              <View style={{ width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
                <Ionicons name="qr-code-sharp" size={23} color={COLORS.tech} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg }}>Verify assigned AC unit</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>Scan its inventory QR or enter the printed serial number, then record the room size.</Text>
              </View>
            </View>
            {!pendingSerial ? <View style={{ flexDirection: "row", gap: SPACING.xs, marginBottom: SPACING.md }}>
              <TechButton title="Scan QR" onPress={() => { setVerificationMode("scan"); setScannerActive(true); }} disabled={resolvingQr || saving} variant={verificationMode === "scan" ? "primary" : "secondary"} style={{ flex: 1 }} leftIcon={<Ionicons name="qr-code-sharp" size={18} color={verificationMode === "scan" ? COLORS.surface : COLORS.tech} />} />
              <TechButton title="Enter serial" onPress={() => { setVerificationMode("manual"); setScannerActive(false); }} disabled={resolvingQr || saving} variant={verificationMode === "manual" ? "primary" : "secondary"} style={{ flex: 1 }} leftIcon={<Ionicons name="keypad-sharp" size={18} color={verificationMode === "manual" ? COLORS.surface : COLORS.tech} />} />
            </View> : null}
            {pendingSerial ? <InfoCard label={pendingSource === "manual_serial" ? "Serial confirmed" : "QR captured"} value={pendingSerial} /> : verificationMode === "manual" ? <View>
              <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold, marginBottom: SPACING.xs }}>Serial number</Text>
              <TextInput
                value={manualSerial}
                onChangeText={setManualSerial}
                placeholder="Enter the assigned serial number"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Assigned AC serial number"
                style={{ minHeight: 48, borderWidth: 1, borderColor: COLORS.borderInput, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, color: COLORS.textPrimary, paddingHorizontal: SPACING.sm, marginBottom: SPACING.sm }}
              />
              <TechButton title={resolvingQr ? "Verifying…" : "Verify serial number"} onPress={() => verifyAssignedUnit(manualSerial, "manual_serial")} loading={resolvingQr} disabled={saving} leftIcon={<Ionicons name="checkmark-circle-sharp" size={18} color={COLORS.surface} />} />
            </View> : scannerActive ? <QrCameraScanner active={scannerActive} onScanned={handleScanned} /> : <TechButton title={saving ? "Verifying…" : "Open QR scanner"} onPress={() => setScannerActive(true)} loading={saving} variant="secondary" leftIcon={<Ionicons name="camera-sharp" size={18} color={COLORS.tech} />} />}
          </Card>
        ) : null}

        {installationTask && pendingSerial ? (
          <Card>
            <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg }}>Room capacity check</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.md }}>S/N {pendingSerial}. Room size is compared with the AC horsepower. It does not change the history-based servicing interval.</Text>
            <BottomSheetSelect
              label="Room size"
              value={selectedRoomSize?.label || ""}
              placeholder="Choose the closest room size"
              items={ROOM_SIZE_OPTIONS}
              itemIcon="resize-sharp"
              searchPlaceholder="Search room sizes"
              getKey={(option) => option.id}
              getLabel={(option) => option.label}
              onSelect={(option) => setRoomDetails({ roomSizeSqm: String(option.value) })}
            />
            <TechButton title="Save room size and verify unit" onPress={submitRoomCapacity} loading={saving} leftIcon={<Ionicons name="checkmark-circle-sharp" size={18} color={COLORS.surface} />} />
            <TechButton title="Cancel verification" variant="secondary" onPress={() => { setPendingSerial(""); setPendingSource("qr_scan"); setScannerActive(verificationMode === "scan"); }} disabled={saving} style={{ marginTop: SPACING.sm }} />
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
