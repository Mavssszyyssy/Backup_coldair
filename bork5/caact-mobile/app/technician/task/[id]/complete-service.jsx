import PagedItems from "../../../../components/ui/PagedItems";
import ServiceResourcesFields from "../../../../components/technician/ServiceResourcesFields";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { startLiveRefresh } from "../../../../services/liveRefresh";
import React, { useMemo, useRef, useState } from "react";
import { Alert, Image, Modal, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../components/technician/TechButton";
import ServiceReportQuickChoices from "../../../../components/technician/ServiceReportQuickChoices";
import ServicePaymentCard from "../../../../components/technician/ServicePaymentCard";
import Card from "../../../../components/ui/Card";
import InfoCard from "../../../../components/ui/InfoCard";
import KeyboardAwareScrollView from "../../../../components/ui/KeyboardAwareScrollView";
import PageHeader from "../../../../components/ui/PageHeader";
import TextField from "../../../../components/ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../constants/theme";
import { useUserContext } from "../../../../context/UserContext";
import { getDisplayName } from "../../../../services/profileService";
import { getTaskById, TASK_STATUS, updateTaskStatus } from "../../../../services/taskStorage";
import { getTaskSerialNumbers, isInstallationWorkOrder, suggestedServiceType } from "../../../../services/technicianTaskLogic";
import { serviceReportError } from "../../../../services/serviceReportValidation";

const MAX_PROOF_DATA_URI_LENGTH = 3_200_000;
const SERVICE_TYPES = [
  { id: "regular_cleaning", label: "Regular Cleaning" },
  { id: "deep_cleaning", label: "Deep Cleaning" },
  { id: "repair", label: "Repair" },
  { id: "inspection", label: "Inspection" },
];
const CONDITIONS = ["excellent", "good", "fair", "poor"];

function InstallationPhotoCapture({ photos, onChange, installation = true }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const openCamera = async () => {
    if (!permission?.granted) {
      const nextPermission = await requestPermission();
      if (!nextPermission?.granted) {
        Alert.alert("Camera access needed", "Allow camera access to capture the AC unit as proof.");
        return;
      }
    }
    setOpen(true);
  };

  const capture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const image = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.12 });
      const uri = image?.base64 ? `data:image/jpeg;base64,${image.base64}` : null;
      if (!uri) throw new Error("The photo could not be saved.");
      if (uri.startsWith("data:image/") && uri.length > MAX_PROOF_DATA_URI_LENGTH) {
        throw new Error("The photo is too large to upload. Move slightly farther from the unit and retake it.");
      }
      onChange([{ uri, label: installation ? "Installed AC unit" : "After service", capturedAt: new Date().toISOString() }]);
      setOpen(false);
    } catch (error) {
      Alert.alert("Photo not captured", error?.message || "Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}><Ionicons name="camera-sharp" size={21} color={COLORS.tech} /></View>
        <View style={{ flex: 1 }}><Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>{installation ? "Installed-unit photo" : "After-service photo"}</Text><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>Required proof. Keep the serviced AC unit clearly in frame.</Text></View>
      </View>
      {photos[0]?.uri ? <View style={{ marginTop: SPACING.md }}><Image source={{ uri: photos[0].uri }} style={{ width: "100%", height: 210, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt }} /><TouchableOpacity onPress={() => onChange([])} accessibilityLabel="Remove proof photo" style={{ alignItems: "center", marginTop: 7 }}><Text style={{ color: COLORS.danger, fontSize: FONT.sm, fontWeight: FONT.bold }}>Retake photo</Text></TouchableOpacity></View> : null}
      <TechButton title={photos[0]?.uri ? "Capture another photo" : installation ? "Capture installation photo" : "Capture after-service photo"} onPress={openCamera} variant={photos[0]?.uri ? "secondary" : "primary"} style={{ marginTop: SPACING.md }} leftIcon={<Ionicons name="camera-sharp" size={18} color={photos[0]?.uri ? COLORS.tech : COLORS.surface} />} />
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.md }}><View><Text style={{ color: COLORS.surface, fontWeight: FONT.black, fontSize: FONT.lg }}>{installation ? "Capture installation proof" : "Capture after-service proof"}</Text><Text style={{ color: "#cbd5e1", fontSize: FONT.sm, marginTop: 2 }}>Keep the serviced AC unit clearly in frame.</Text></View><TouchableOpacity onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel="Close camera"><Ionicons name="close-sharp" size={28} color={COLORS.surface} /></TouchableOpacity></View>
          <View style={{ flex: 1, margin: SPACING.md, borderRadius: RADIUS.xl, overflow: "hidden", backgroundColor: "#000" }}><CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" /></View>
          <View style={{ padding: SPACING.md }}><TechButton title={capturing ? "Capturing…" : "Use this photo"} onPress={capture} loading={capturing} leftIcon={<Ionicons name="camera-sharp" size={18} color={COLORS.surface} />} /></View>
        </SafeAreaView>
      </Modal>
    </Card>
  );
}

export default function CompleteServiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { current } = useUserContext();
  const [task, setTask] = useState(null);
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [serviceType, setServiceType] = useState("regular_cleaning");
  const [conditionRating, setConditionRating] = useState("good");
  const [findings, setFindings] = useState("");
  const [resolution, setResolution] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [choiceError, setChoiceError] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [partsError, setPartsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const progress = task?.registrationProgress;
  const requiredCount = progress?.totalRequired || getTaskSerialNumbers(task).length;
  const canComplete = Boolean(progress?.isComplete ?? requiredCount === 0);
  const isAlreadyComplete = task?.status === TASK_STATUS.COMPLETED;
  const installationTask = isInstallationWorkOrder(task);
  const ampRecords = useMemo(() => Object.values(task?.ampRegistrations || {}).filter((record) => record?.status === "registered"), [task]);
  const serviceTypeOptions = useMemo(() => {
    const suggested = suggestedServiceType(task);
    if (suggested === "repair" || suggested === "inspection") return SERVICE_TYPES.filter((option) => option.id === suggested);
    return SERVICE_TYPES.filter((option) => ["regular_cleaning", "deep_cleaning"].includes(option.id));
  }, [task]);

  const load = React.useCallback(async ({ background = false, isCurrent = () => true } = {}) => {
    if (!background) setLoading(true);
    try {
      const nextTask = await getTaskById(id);
      if (!nextTask) throw new Error("This work order is no longer available. Return to Work Orders and refresh the list.");
      if (!isCurrent()) return;
      setTask(nextTask);
      // Refresh quote/payment/progress, never the technician's unsaved report or photo.
      if (background) return;
      setAfterPhotos((nextTask?.proof?.afterPhotos || []).filter((photo) => photo?.uri).slice(0, 1));
      const suggested = suggestedServiceType(nextTask);
      const allowed = ["repair", "inspection"].includes(suggested) ? [suggested] : ["regular_cleaning", "deep_cleaning"];
      setServiceType(allowed.includes(nextTask.serviceType) ? nextTask.serviceType : suggested);
      setConditionRating(CONDITIONS.includes(String(nextTask.conditionRating || "").toLowerCase()) ? String(nextTask.conditionRating).toLowerCase() : "good");
      setFindings(nextTask.findings || "");
      setResolution(nextTask.resolution || "");
      setAdditionalNotes(nextTask.notes && nextTask.notes !== nextTask.findings ? nextTask.notes : "");
      setPartsUsed(Array.isArray(nextTask.partsUsed) ? nextTask.partsUsed.join(", ") : nextTask.partsUsed || "");
    } catch (error) {
      if (!background && isCurrent()) Alert.alert("Unable to load work order", error?.message || "Please try again.");
    } finally { if (isCurrent()) setLoading(false); }
  }, [id]);

  useFocusEffect(React.useCallback(() => startLiveRefresh(load), [load]));
  const formError = installationTask
    ? !canComplete
      ? "Scan and verify every assigned AC unit before completing this installation."
      : !afterPhotos.some((photo) => photo?.uri)
        ? "Capture the installed AC unit as proof."
        : ""
    : partsError || choiceError || serviceReportError(findings, resolution) || (!afterPhotos.some(photo => photo?.uri) ? "Capture an after-service photo before completing this visit." : "") || (task?.servicePayment?.status === "quote_required" ? "Ask Admin to set the service quote first." : task?.servicePayment?.status === "due" ? "Confirm service cash collection before completion." : "");

  const changeServiceType = (nextType) => {
    if (nextType === serviceType) return;
    const change = () => { setServiceType(nextType); setFindings(""); setResolution(""); setChoiceError(""); };
    if (findings.trim() || resolution.trim()) {
      Alert.alert("Change service method?", "This clears the current findings and work selections so you can record the correct method. Your photo and additional notes will stay.", [{ text: "Keep current", style: "cancel" }, { text: "Change method", onPress: change }]);
    } else change();
  };

  const submit = async () => {
    if (isAlreadyComplete) return router.replace("/technician/tasks");
    if (formError) return Alert.alert(installationTask ? "Cannot complete installation" : "Service report incomplete", formError);
    const confirmed = await new Promise((resolve) => Alert.alert(installationTask ? "Complete installation?" : "Complete service visit?", installationTask ? "This sends the verified QR record and installed-unit photo to the customer order." : "This saves the report to the AC service history and closes the maintenance work order.", [{ text: "Cancel", style: "cancel", onPress: () => resolve(false) }, { text: "Complete", onPress: () => resolve(true) }]));
    if (!confirmed) return;
    const submittedAt = new Date().toISOString();
    const technicianName = getDisplayName(current) || task?.assignedTechnicianName || "Technician";
    setSubmitting(true);
    try {
      const existingLogs = Array.isArray(task?.serviceLogs) ? task.serviceLogs : [];
      const completionLog = {
        id: `unit_log_${Date.now()}`,
        taskId: String(id),
        requestId: task?.requestId || "",
        unitId: task?.unitId || "",
        unitName: task?.unitName || task?.unit?.unitName || "AC unit",
        technicianId: current?.id || "",
        technicianName,
        logType: serviceType,
        label: SERVICE_TYPES.find((option) => option.id === serviceType)?.label || "Service",
        condition: conditionRating.replace(/^./, (letter) => letter.toUpperCase()),
        findings: findings.trim(),
        resolution: resolution.trim(),
        partsUsed: partsUsed.trim(),
        notes: additionalNotes.trim(),
        createdAt: submittedAt,
        updatedAt: submittedAt,
      };
      const hasMatchingLog = existingLogs.some((log) => log.findings === completionLog.findings && log.resolution === completionLog.resolution && (log.notes || "") === completionLog.notes);
      const serviceLogs = installationTask || hasMatchingLog ? existingLogs : [completionLog, ...existingLogs];
      const updated = await updateTaskStatus(id, TASK_STATUS.COMPLETED, technicianName, installationTask ? {
        proofSubmittedAt: submittedAt,
        proof: { beforePhotos: [], afterPhotos, customer: { name: task?.customerName || task?.customer || "Customer", source: "assigned_order" }, technicianName, submittedAt, notes: "" },
      } : {
        serviceType,
        serviceDate: submittedAt,
        conditionRating,
        afterCondition: conditionRating.replace(/^./, (letter) => letter.toUpperCase()),
        findings: findings.trim(),
        resolution: resolution.trim(),
        serviceActions: resolution.split(/\n+/).map((action) => action.trim()).filter(Boolean),
        partsUsed: partsUsed.trim(),
        serviceLogs,
        notes: additionalNotes.trim(),
        proofSubmittedAt: submittedAt,
        proof: { ...(task?.proof || {}), afterPhotos, technicianName, submittedAt, notes: findings.trim() },
      });
      setTask(updated);
      Alert.alert(installationTask ? "Installation completed" : "Service visit completed", installationTask ? "The verified AC unit, photo proof, customer order, warranty, and AMP record are now synchronized." : "The service report, AC history, warranty record, customer request, and next AMP servicing recommendation are now synchronized.", [{ text: "Back to Work Orders", onPress: () => router.replace("/technician/tasks") }]);
    } catch (error) { Alert.alert("Unable to complete", error?.message || (installationTask ? "Could not submit the installation proof." : "Could not save the service report.")); }
    finally { setSubmitting(false); }
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}><KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }} keyboardShouldPersistTaps="handled"><PageHeader title={installationTask ? "Complete installation" : "Complete service visit"} subtitle={installationTask ? "Verified QR + one installed-unit photo" : "Written report + one after-service photo"} color={COLORS.tech} onBack={() => router.back()} />
    {!installationTask ? <ServicePaymentCard task={task} onUpdated={setTask} /> : null}
    {!installationTask && !isAlreadyComplete && !loading ? <InstallationPhotoCapture photos={afterPhotos} onChange={setAfterPhotos} installation={false} /> : null}
    <Card><InfoCard label="Work order" value={task?.taskCode || task?.title || "Loading…"} /><InfoCard label="Customer" value={task?.customerName || task?.customer || "Not provided"} />{installationTask ? <><InfoCard label="AMP registration" value={loading ? "Loading…" : `${progress?.totalRegistered || 0} of ${requiredCount} assigned units verified`} />{!canComplete && !loading ? <TechButton title="Scan assigned AC unit" onPress={() => router.replace(`/technician/task/${id}/amp-registration`)} size="sm" variant="secondary" leftIcon={<Ionicons name="qr-code-sharp" size={16} color={COLORS.tech} />} /> : null}</> : <InfoCard label="AC unit" value={task?.unit?.unitName || task?.unitName || "Linked customer unit"} />}</Card>
    {installationTask && ampRecords.length ? <Card><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg }}>Verified AC unit</Text><PagedItems label="Verified AC units" items={ampRecords} renderItem={(record) => <View key={record.serialNumber} style={{ marginTop: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt }}><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>{record.serialNumber}</Text><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>Verified from the assigned QR label</Text></View>} /></Card> : null}
    {isAlreadyComplete ? <Card><Text style={{ color: COLORS.success, fontWeight: FONT.black, fontSize: FONT.lg }}>This {installationTask ? "installation" : "service visit"} is already complete.</Text><TechButton title="Back to Work Orders" onPress={() => router.replace("/technician/tasks")} style={{ marginTop: SPACING.md }} /></Card> : installationTask ? <><InstallationPhotoCapture photos={afterPhotos} onChange={setAfterPhotos} /><Card><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginBottom: SPACING.sm }}>Customer details are automatically taken from the assigned order. No customer name or signature is required.</Text>{formError ? <Text style={{ color: COLORS.danger, marginBottom: SPACING.sm }}>{formError}</Text> : null}<TechButton title={submitting ? "Completing…" : "Complete installation"} onPress={submit} loading={submitting} disabled={loading} leftIcon={<Ionicons name="checkmark-circle-sharp" size={18} color={COLORS.surface} />} /></Card></> : <><Card><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: SPACING.sm }}>Service performed</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>{serviceTypeOptions.map((option) => <TouchableOpacity key={option.id} onPress={() => changeServiceType(option.id)} style={{ paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: serviceType === option.id ? COLORS.tech : COLORS.surfaceAlt }}><Text style={{ color: serviceType === option.id ? COLORS.surface : COLORS.textPrimary, fontWeight: FONT.bold, fontSize: FONT.sm }}>{option.label}</Text></TouchableOpacity>)}</View><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold, marginTop: SPACING.md, marginBottom: SPACING.xs }}>Condition after service</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>{CONDITIONS.map((option) => <TouchableOpacity key={option} onPress={() => setConditionRating(option)} style={{ paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: conditionRating === option ? COLORS.tech : COLORS.surfaceAlt }}><Text style={{ color: conditionRating === option ? COLORS.surface : COLORS.textPrimary, fontWeight: FONT.bold, fontSize: FONT.sm }}>{option.replace(/^./, (letter) => letter.toUpperCase())}</Text></TouchableOpacity>)}</View></Card><Card><ServiceReportQuickChoices key={serviceType} serviceType={serviceType} findings={findings} resolution={resolution} onFindingsChange={setFindings} onResolutionChange={setResolution} onValidationChange={setChoiceError} /><TextField label="Additional Notes (Optional)" value={additionalNotes} onChangeText={setAdditionalNotes} placeholder="Customer advice or follow-up details" multiline numberOfLines={3} /><ServiceResourcesFields partsUsed={partsUsed} onPartsChange={setPartsUsed} onValidationChange={setPartsError} /></Card><Card>{formError ? <Text style={{ color: COLORS.danger, marginBottom: SPACING.sm }}>{formError}</Text> : <Text style={{ color: COLORS.success, fontWeight: FONT.bold, marginBottom: SPACING.sm }}>Report ready to submit</Text>}<TechButton title={submitting ? "Completing…" : "Complete service visit"} onPress={submit} loading={submitting} disabled={loading} leftIcon={<Ionicons name="checkmark-circle-sharp" size={18} color={COLORS.surface} />} /></Card></>}
  </KeyboardAwareScrollView></SafeAreaView>;
}
