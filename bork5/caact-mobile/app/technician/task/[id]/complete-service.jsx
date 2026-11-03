import PagedItems from "../../../../components/ui/PagedItems";
import ServiceResourcesFields from "../../../../components/technician/ServiceResourcesFields";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { startLiveRefresh } from "../../../../services/liveRefresh";
import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../components/technician/TechButton";
import ProofPhotoList from "../../../../components/technician/ProofPhotoList";
import ServiceReportQuickChoices from "../../../../components/technician/ServiceReportQuickChoices";
import ServicePaymentCard from "../../../../components/technician/ServicePaymentCard";
import TechnicianStatusSelector from "../../../../components/technician/TechnicianStatusSelector";
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
import { confirmAction } from "../../../../utils/confirmAction";
import { useInterfaceLanguage } from "../../../../hooks/useInterfaceLanguage";

const MAX_PROOF_DATA_URI_LENGTH = 3_200_000;
const SERVICE_TYPES = [
  { id: "regular_cleaning", label: "Regular Cleaning" },
  { id: "deep_cleaning", label: "Deep Cleaning" },
  { id: "repair", label: "Repair" },
  { id: "inspection", label: "Inspection" },
];
const CONDITIONS = ["excellent", "good", "fair", "poor"];

function InstallationPhotoCapture({ photos, onChange, installation = true }) {
  const { t } = useInterfaceLanguage();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const openCamera = async () => {
    if (!permission?.granted) {
      const nextPermission = await requestPermission();
      if (!nextPermission?.granted) {
        Alert.alert(t("Camera access needed"), t("Allow camera access to capture the AC unit as proof."));
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
      Alert.alert(t("Photo not captured"), t(error?.message || "Please try again."));
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}><Ionicons name="camera-sharp" size={21} color={COLORS.tech} /></View>
        <View style={{ flex: 1 }}><Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>{t(installation ? "Installed-unit photo" : "After-service photo")}</Text><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>{t("Required proof. Keep the serviced AC unit clearly in frame.")}</Text></View>
      </View>
      {photos[0]?.uri ? <View style={{ marginTop: SPACING.md }}><ProofPhotoList photos={photos} height={210} /><TouchableOpacity onPress={() => onChange([])} accessibilityLabel={t("Remove proof photo")} style={{ alignItems: "center", marginTop: 7 }}><Text style={{ color: COLORS.danger, fontSize: FONT.sm, fontWeight: FONT.bold }}>{t("Retake photo")}</Text></TouchableOpacity></View> : null}
      <TechButton title={t(photos[0]?.uri ? "Capture another photo" : installation ? "Capture installation photo" : "Capture after-service photo")} onPress={openCamera} variant={photos[0]?.uri ? "secondary" : "primary"} style={{ marginTop: SPACING.md }} leftIcon={<Ionicons name="camera-sharp" size={18} color={photos[0]?.uri ? COLORS.tech : COLORS.surface} />} />
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.md }}><View style={{ flex: 1 }}><Text style={{ color: COLORS.surface, fontWeight: FONT.black, fontSize: FONT.lg }}>{t(installation ? "Capture installation proof" : "Capture after-service proof")}</Text><Text style={{ color: "#cbd5e1", fontSize: FONT.sm, marginTop: 2 }}>{t("Keep the serviced AC unit clearly in frame.")}</Text></View><TouchableOpacity onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel={t("Close camera")}><Ionicons name="close-sharp" size={28} color={COLORS.surface} /></TouchableOpacity></View>
          <View style={{ flex: 1, margin: SPACING.md, borderRadius: RADIUS.xl, overflow: "hidden", backgroundColor: "#000" }}><CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" /></View>
          <View style={{ padding: SPACING.md }}><TechButton title={t(capturing ? "Capturing…" : "Use this photo")} onPress={capture} loading={capturing} leftIcon={<Ionicons name="camera-sharp" size={18} color={COLORS.surface} />} /></View>
        </SafeAreaView>
      </Modal>
    </Card>
  );
}

export default function CompleteServiceScreen() {
  const router = useRouter();
  const { language, t } = useInterfaceLanguage();
  const { id } = useLocalSearchParams();
  const { current } = useUserContext();
  const [task, setTask] = useState(null);
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [serviceType, setServiceType] = useState("regular_cleaning");
  const [conditionRating, setConditionRating] = useState("good");
  const [technicianStatus, setTechnicianStatus] = useState("");
  const [findings, setFindings] = useState("");
  const [resolution, setResolution] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [choiceError, setChoiceError] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [partsError, setPartsError] = useState("");
  const [hoursSpent, setHoursSpent] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [reportSaved, setReportSaved] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const completionInFlight = useRef(false);
  const progress = task?.registrationProgress;
  const requiredCount = progress?.totalRequired || getTaskSerialNumbers(task).length;
  const canComplete = Boolean(progress?.isComplete ?? requiredCount === 0);
  const isAlreadyComplete = task?.status === TASK_STATUS.COMPLETED
    && task?.completionSynchronized !== false;
  const completionNeedsSync = task?.status === TASK_STATUS.COMPLETED
    && task?.completionSynchronized === false;
  const installationTask = isInstallationWorkOrder(task);
  const ampRecords = useMemo(() => Object.values(task?.ampRegistrations || {}).filter((record) => record?.status === "registered"), [task]);
  const serviceTypeOptions = useMemo(() => {
    const suggested = suggestedServiceType(task);
    if (suggested === "repair" || suggested === "inspection") return SERVICE_TYPES.filter((option) => option.id === suggested);
    return SERVICE_TYPES.filter((option) => ["regular_cleaning", "deep_cleaning"].includes(option.id));
  }, [task]);

  const load = React.useCallback(async ({ background = false, isCurrent = () => true } = {}) => {
    // Completion is authoritative and may trigger notifications immediately.
    // Do not let a concurrent live refresh replace the active task while its
    // proof upload and linked-record synchronization are still returning.
    if (completionInFlight.current) return;
    if (!background) {
      setLoading(true);
      setLoadError("");
    }
    try {
      const nextTask = await getTaskById(id, { requireOnline: true });
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
      const latestLog = Array.isArray(nextTask.serviceLogs) ? nextTask.serviceLogs[0] : null;
      setTechnicianStatus(nextTask.technicianStatus || latestLog?.technicianStatus || "");
      setHoursSpent(latestLog?.hoursSpent == null ? "" : String(latestLog.hoursSpent));
      setLaborCost(latestLog?.laborCost == null ? "" : String(latestLog.laborCost));
      setPartsCost(latestLog?.partsCost == null ? "" : String(latestLog.partsCost));
      setReportSaved(Boolean(latestLog));
    } catch (error) {
      if (!background && isCurrent()) {
        const message = error?.message || "Please try again.";
        setLoadError(message);
        Alert.alert(t("Unable to load work order"), t(message));
      }
    } finally { if (isCurrent()) setLoading(false); }
  }, [id, t]);

  useFocusEffect(React.useCallback(() => startLiveRefresh(load), [load]));

  // The proof route is shared by installations and service visits. Until the
  // authoritative task arrives, its workflow type is unknown. Rendering the
  // service form for a null task caused it to flash before installation proof.
  if (loading || !task) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }} keyboardShouldPersistTaps="handled">
          <PageHeader title={t("Complete work order")} subtitle={t("Preparing the correct completion steps")} color={COLORS.tech} onBack={() => router.back()} />
          <Card>
            {loading ? (
              <View style={{ minHeight: 180, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color={COLORS.tech} size="large" />
                <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.md, textAlign: "center" }}>{t("Loading the current work order…")}</Text>
              </View>
            ) : (
              <View>
                <Text style={{ color: COLORS.danger, fontWeight: FONT.black, fontSize: FONT.lg }}>{t("Work order could not be loaded")}</Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>{t(loadError || "Return to Work Orders and try again.")}</Text>
                <TechButton title={t("Retry")} onPress={() => void load()} style={{ marginTop: SPACING.md }} />
                <TechButton title={t("Back to Work Orders")} onPress={() => router.replace("/technician/tasks")} variant="secondary" style={{ marginTop: SPACING.sm }} />
              </View>
            )}
          </Card>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  const formError = installationTask
    ? !canComplete
      ? "Scan each assigned QR or enter its serial number before completing this installation."
      : !afterPhotos.some((photo) => photo?.uri)
        ? "Capture the installed AC unit as proof."
        : ""
    : (!technicianStatus ? "Choose the technician status for this visit." : "") || partsError || choiceError || serviceReportError(findings, resolution) || (!afterPhotos.some(photo => photo?.uri) ? "Capture an after-service photo before completing this visit." : "") || (task?.servicePayment?.status === "quote_required" ? "Ask Admin to set the service quote first." : task?.servicePayment?.status === "due" ? "Confirm service cash collection before completion." : "");

  const changeServiceType = (nextType) => {
    if (nextType === serviceType) return;
    const change = () => { setServiceType(nextType); setFindings(""); setResolution(""); setChoiceError(""); setReportSaved(false); };
    if (findings.trim() || resolution.trim()) {
      confirmAction({
        title: t("Change service method?"),
        message: t("This clears the current findings and work selections so you can record the correct method. Your photo and additional notes will stay."),
        cancelText: t("Keep current"),
        confirmText: t("Change method"),
        destructive: true,
        onConfirm: change,
      });
    } else change();
  };

  const editReportField = (setter) => (value) => {
    setter(value);
    setReportSaved(false);
  };

  const saveServiceReport = async () => {
    if (!technicianStatus) return Alert.alert(t("Technician status required"), t("Choose For Repair, For Further Inspection, or Completed for this visit."));
    const reportError = partsError || choiceError || serviceReportError(findings, resolution);
    if (reportError) return Alert.alert(t("Service report incomplete"), t(reportError));
    if (!task?.checkIn?.checkedInAt) return Alert.alert(t("Check-in required"), t("Record your GPS arrival before saving the service report."));
    const technicianName = getDisplayName(current) || task?.assignedTechnicianName || "Technician";
    const latestLog = Array.isArray(task?.serviceLogs) ? task.serviceLogs[0] : null;
    setSavingReport(true);
    try {
      const { upsertServiceLog } = await import("../../../../services/unitServiceLogStorage");
      await upsertServiceLog({
        id: latestLog?.id,
        taskId: String(id),
        requestId: task?.requestId || "",
        unitId: task?.unitId || "",
        unitName: task?.unitName || task?.unit?.unitName || "AC unit",
        technicianId: current?.id || "",
        technicianName,
        logType: serviceType,
        label: SERVICE_TYPES.find((option) => option.id === serviceType)?.label || "Service",
        condition: conditionRating.replace(/^./, (letter) => letter.toUpperCase()),
        technicianStatus,
        findings: findings.trim(),
        resolution: resolution.trim(),
        partsUsed: partsUsed.trim(),
        notes: additionalNotes.trim(),
        hoursSpent: hoursSpent === "" ? null : Number(hoursSpent),
        laborCost: laborCost === "" ? null : Number(laborCost),
        partsCost: partsCost === "" ? null : Number(partsCost),
      });
      const updated = await getTaskById(id, { requireOnline: true });
      setTask(updated);
      setReportSaved(true);
      Alert.alert(t("Service report saved"), t("The payment total now includes the saved labor and parts costs. Collect and confirm the exact cash amount before completing the visit."));
    } catch (error) {
      Alert.alert(t("Service report not saved"), t(error?.message || "Please try again. Your entries are still here."));
    } finally {
      setSavingReport(false);
    }
  };

  const submit = async () => {
    if (isAlreadyComplete) return router.replace("/technician/tasks");
    if (formError) return Alert.alert(t(installationTask ? "Cannot complete installation" : "Service report incomplete"), t(formError));
    const confirmed = await confirmAction({
      title: t(installationTask ? "Complete Installation?" : "Complete Service Visit?"),
      message: t(installationTask
        ? "This sends the verified QR record and installed-unit photo to the customer order."
        : "This saves the report to the AC service history and closes the maintenance work order."),
      confirmText: t("Complete"),
    });
    if (!confirmed) return;
    const submittedAt = new Date().toISOString();
    const technicianName = getDisplayName(current) || task?.assignedTechnicianName || "Technician";
    setSubmitting(true);
    completionInFlight.current = true;
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
        technicianStatus,
        findings: findings.trim(),
        resolution: resolution.trim(),
        partsUsed: partsUsed.trim(),
        notes: additionalNotes.trim(),
        createdAt: submittedAt,
        updatedAt: submittedAt,
      };
      const hasMatchingLog = existingLogs.some((log) => log.findings === completionLog.findings && log.resolution === completionLog.resolution && (log.notes || "") === completionLog.notes && (log.technicianStatus || "") === completionLog.technicianStatus);
      const serviceLogs = installationTask || hasMatchingLog ? existingLogs : [completionLog, ...existingLogs];
      const updated = await updateTaskStatus(id, TASK_STATUS.COMPLETED, technicianName, installationTask ? {
        proofSubmittedAt: submittedAt,
        proof: { beforePhotos: [], afterPhotos, customer: { name: task?.customerName || task?.customer || "Customer", source: "assigned_order" }, technicianName, submittedAt, notes: "" },
      } : {
        serviceType,
        serviceDate: submittedAt,
        conditionRating,
        technicianStatus,
        afterCondition: conditionRating.replace(/^./, (letter) => letter.toUpperCase()),
        findings: findings.trim(),
        resolution: resolution.trim(),
        serviceActions: resolution.split(/\n+/).map((action) => action.trim()).filter(Boolean),
        partsUsed: partsUsed.trim(),
        serviceLogs,
        notes: additionalNotes.trim(),
        proofSubmittedAt: submittedAt,
        proof: { ...(task?.proof || {}), afterPhotos, technicianName, submittedAt, notes: findings.trim() },
      }, { currentTask: task });
      if (!updated?.id) throw new Error("The completed work order was not returned. The app will verify it before allowing another submission.");
      // The completion response is authoritative. Re-reading the task here
      // held the completed screen open behind another network request.
      setTask(updated);
      Alert.alert(t(installationTask ? "Installation completed" : "Service visit completed"), t(installationTask ? "The verified AC unit, photo proof, customer order, warranty, and AMP record are now synchronized." : "The service report, AC history, warranty record, customer request, and next AMP servicing recommendation are now synchronized."), [{ text: t("Back to Work Orders"), onPress: () => router.replace("/technician/tasks") }]);
    } catch (error) {
      // The response can be interrupted after the server commits the visit.
      // Verify the authoritative task before asking the technician to submit
      // the same proof a second time.
      try {
        const recovered = await getTaskById(id, { requireOnline: true });
        const proofSaved = (recovered?.proof?.afterPhotos || []).some((photo) => photo?.uri);
        if (recovered?.status === TASK_STATUS.COMPLETED && recovered?.completionSynchronized !== false && proofSaved) {
          setTask(recovered);
          Alert.alert(t(installationTask ? "Installation completed" : "Service visit completed"), t("The completion was saved and verified. You do not need to submit the proof again."), [{ text: t("Back to Work Orders"), onPress: () => router.replace("/technician/tasks") }]);
          return;
        }
      } catch {}
      Alert.alert(t("Unable to complete"), t(error?.message || (installationTask ? "Could not submit the installation proof." : "Could not save the service report.")));
    }
    finally {
      completionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}><KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }} keyboardShouldPersistTaps="handled"><PageHeader title={t(installationTask ? "Complete installation" : "Complete service visit")} subtitle={t(installationTask ? "Verified AC unit + one installed-unit photo" : "Written report + one after-service photo")} color={COLORS.tech} onBack={() => router.back()} />
    {!installationTask && !isAlreadyComplete && !loading ? <InstallationPhotoCapture photos={afterPhotos} onChange={setAfterPhotos} installation={false} /> : null}
    <Card><InfoCard label={t("Work order")} value={task?.taskCode || task?.title || t("Loading…")} /><InfoCard label={t("Customer")} value={task?.customerName || task?.customer || t("Not provided")} />{installationTask ? <><InfoCard label={t("AMP registration")} value={loading ? t("Loading…") : language === "Filipino" ? `${progress?.totalRegistered || 0} sa ${requiredCount} na nakatalagang unit ang na-verify` : `${progress?.totalRegistered || 0} of ${requiredCount} assigned units verified`} />{!canComplete && !loading ? <TechButton title={t("Verify assigned AC unit")} onPress={() => router.replace(`/technician/task/${id}/amp-registration`)} size="sm" variant="secondary" leftIcon={<Ionicons name="qr-code-sharp" size={16} color={COLORS.tech} />} /> : null}</> : <InfoCard label={t("AC unit")} value={task?.unit?.unitName || task?.unitName || t("Linked customer unit")} />}</Card>
    {installationTask && ampRecords.length ? <Card><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg }}>{t("Verified AC unit")}</Text><PagedItems label={t("Verified AC units")} items={ampRecords} renderItem={(record) => <View key={record.serialNumber} style={{ marginTop: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt }}><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>{record.serialNumber}</Text><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>{t(record.registrationSource === "manual_serial" ? "Verified by manual serial entry" : "Verified from the assigned QR label")}</Text></View>} /></Card> : null}
    {completionNeedsSync ? <Card style={{ borderColor: COLORS.warning, backgroundColor: COLORS.warningLight }}><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg }}>{t("Finish synchronizing this visit")}</Text><Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACING.xs }}>{t("The proof was saved, but the linked Admin record still needs to be synchronized. Tap complete once to safely resume; the saved proof will be reused.")}</Text></Card> : null}
    {isAlreadyComplete ? <Card><Text style={{ color: COLORS.success, fontWeight: FONT.black, fontSize: FONT.lg }}>{t(installationTask ? "This installation is already complete." : "This service visit is already complete.")}</Text><TechButton title={t("Back to Work Orders")} onPress={() => router.replace("/technician/tasks")} style={{ marginTop: SPACING.md }} /></Card> : installationTask ? <><InstallationPhotoCapture photos={afterPhotos} onChange={setAfterPhotos} /><Card><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginBottom: SPACING.sm }}>{t("Customer details are automatically taken from the assigned order. No customer name or signature is required.")}</Text>{formError ? <Text style={{ color: COLORS.danger, marginBottom: SPACING.sm }}>{t(formError)}</Text> : null}<TechButton title={t(submitting ? "Completing…" : completionNeedsSync ? "Finish synchronization" : "Complete installation")} onPress={submit} loading={submitting} disabled={loading} leftIcon={<Ionicons name="checkmark-circle-sharp" size={18} color={COLORS.surface} />} /></Card></> : <>
      <Card><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: SPACING.sm }}>{t("1. Record the completed service")}</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>{serviceTypeOptions.map((option) => <TouchableOpacity key={option.id} onPress={() => changeServiceType(option.id)} style={{ paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: serviceType === option.id ? COLORS.tech : COLORS.surfaceAlt }}><Text style={{ color: serviceType === option.id ? COLORS.surface : COLORS.textPrimary, fontWeight: FONT.bold, fontSize: FONT.sm }}>{t(option.label)}</Text></TouchableOpacity>)}</View><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold, marginTop: SPACING.md, marginBottom: SPACING.xs }}>{t("Condition after service")}</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>{CONDITIONS.map((option) => <TouchableOpacity key={option} onPress={() => { setConditionRating(option); setReportSaved(false); }} style={{ paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: conditionRating === option ? COLORS.tech : COLORS.surfaceAlt }}><Text style={{ color: conditionRating === option ? COLORS.surface : COLORS.textPrimary, fontWeight: FONT.bold, fontSize: FONT.sm }}>{t(option.replace(/^./, (letter) => letter.toUpperCase()))}</Text></TouchableOpacity>)}</View><View style={{ marginTop: SPACING.md }}><TechnicianStatusSelector value={technicianStatus} onChange={(value) => { setTechnicianStatus(value); setReportSaved(false); }} /></View></Card>
      <Card><ServiceReportQuickChoices key={serviceType} serviceType={serviceType} findings={findings} resolution={resolution} onFindingsChange={editReportField(setFindings)} onResolutionChange={editReportField(setResolution)} onValidationChange={setChoiceError} /><TextField label={t("Additional Notes (Optional)")} value={additionalNotes} onChangeText={editReportField(setAdditionalNotes)} placeholder={t("Customer advice or follow-up details")} multiline numberOfLines={3} /><ServiceResourcesFields hoursSpent={hoursSpent} onHoursChange={editReportField(setHoursSpent)} partsUsed={partsUsed} onPartsChange={editReportField(setPartsUsed)} laborCost={laborCost} onLaborChange={editReportField(setLaborCost)} partsCost={partsCost} onPartsCostChange={editReportField(setPartsCost)} onValidationChange={setPartsError} /><TechButton title={t(savingReport ? "Saving report…" : reportSaved ? "Service report saved" : "Save report and update payment total")} onPress={saveServiceReport} loading={savingReport} disabled={loading || savingReport || reportSaved} style={{ marginTop: SPACING.md }} leftIcon={<Ionicons name={reportSaved ? "checkmark-circle-sharp" : "save-sharp"} size={18} color={COLORS.surface} />} /></Card>
      <View><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: SPACING.sm }}>{t("2. Confirm the customer payment")}</Text><ServicePaymentCard task={task} onUpdated={setTask} /></View>
      <Card><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg, marginBottom: SPACING.sm }}>{t("3. Complete the visit")}</Text>{formError ? <Text style={{ color: COLORS.danger, marginBottom: SPACING.sm }}>{t(formError)}</Text> : <Text style={{ color: COLORS.success, fontWeight: FONT.bold, marginBottom: SPACING.sm }}>{t(completionNeedsSync ? "Saved visit ready to synchronize" : "Report ready to submit")}</Text>}<TechButton title={t(submitting ? "Completing…" : completionNeedsSync ? "Finish synchronization" : "Complete service visit")} onPress={submit} loading={submitting} disabled={loading} leftIcon={<Ionicons name="checkmark-circle-sharp" size={18} color={COLORS.surface} />} /></Card>
    </>}
  </KeyboardAwareScrollView></SafeAreaView>;
}
