import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../components/technician/TechButton";
import Card from "../../../../components/ui/Card";
import InfoCard from "../../../../components/ui/InfoCard";
import PageHeader from "../../../../components/ui/PageHeader";
import TextField from "../../../../components/ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../constants/theme";
import { useUserContext } from "../../../../context/UserContext";
import { getDisplayName } from "../../../../services/profileService";
import { getTaskById, TASK_STATUS, updateTaskStatus } from "../../../../services/taskStorage";

const initialForm = {
  findings: "",
  afterCondition: "",
  customerSignatureName: "",
  customerSignature: "",
  notes: "",
};

const taskSerials = (task = {}) => task?.registrationProgress?.requiredSerials || task?.serialNumbers || [];

function InstallationPhotoCapture({ photos, onChange }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const openCamera = async () => {
    if (!permission?.granted) {
      const nextPermission = await requestPermission();
      if (!nextPermission?.granted) {
        Alert.alert("Camera access needed", "Allow camera access to capture the installed AC unit as proof.");
        return;
      }
    }
    setOpen(true);
  };

  const capture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const image = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.2 });
      const uri = image?.base64 ? `data:image/jpeg;base64,${image.base64}` : image?.uri;
      if (!uri) throw new Error("The photo could not be saved.");
      onChange([
        ...photos,
        {
          uri,
          label: `Installed AC unit ${photos.length + 1}`,
          capturedAt: new Date().toISOString(),
        },
      ].slice(-2));
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
        <View style={{ width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
          <Ionicons name="camera-sharp" size={21} color={COLORS.tech} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>Installed-unit photo</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>Required proof. Capture the AC unit after installation.</Text>
        </View>
      </View>
      {photos.length ? (
        <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
          {photos.map((photo, index) => (
            <View key={`${photo.uri}-${index}`} style={{ width: 104 }}>
              <Image source={{ uri: photo.uri }} style={{ width: 104, height: 88, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt }} />
              <TouchableOpacity onPress={() => onChange(photos.filter((_, itemIndex) => itemIndex !== index))} accessibilityLabel="Remove installation photo" style={{ alignItems: "center", marginTop: 5 }}>
                <Text style={{ color: COLORS.danger, fontSize: FONT.sm, fontWeight: FONT.bold }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
      <TechButton title={photos.length ? "Add another photo" : "Capture installation photo"} onPress={openCamera} variant={photos.length ? "secondary" : "primary"} style={{ marginTop: SPACING.md }} leftIcon={<Ionicons name="camera-sharp" size={18} color={photos.length ? COLORS.tech : COLORS.surface} />} />

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.md }}>
            <View>
              <Text style={{ color: COLORS.surface, fontWeight: FONT.black, fontSize: FONT.lg }}>Capture installation proof</Text>
              <Text style={{ color: "#cbd5e1", fontSize: FONT.sm, marginTop: 2 }}>Keep the installed AC unit clearly in frame.</Text>
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel="Close camera">
              <Ionicons name="close-sharp" size={28} color={COLORS.surface} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, margin: SPACING.md, borderRadius: RADIUS.xl, overflow: "hidden", backgroundColor: "#000" }}>
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          </View>
          <View style={{ padding: SPACING.md }}>
            <TechButton title={capturing ? "Capturing…" : "Use this photo"} onPress={capture} loading={capturing} leftIcon={<Ionicons name="camera-sharp" size={18} color={COLORS.surface} />} />
          </View>
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
  const [form, setForm] = useState(initialForm);
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const progress = task?.registrationProgress;
  const registeredCount = progress?.totalRegistered || 0;
  const requiredCount = progress?.totalRequired || taskSerials(task).length;
  const canComplete = Boolean(progress?.isComplete ?? requiredCount === 0);
  const isAlreadyComplete = task?.status === TASK_STATUS.COMPLETED;
  const ampRecords = useMemo(() => Object.values(task?.ampRegistrations || {}).filter((record) => record?.status === "registered"), [task]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const nextTask = await getTaskById(id);
      if (!nextTask) throw new Error("This work order is no longer available. Return to My Work Orders and refresh the list.");
      setTask(nextTask);
      setAfterPhotos((nextTask?.proof?.afterPhotos || []).filter((photo) => photo?.uri));
      setForm((currentForm) => ({
        ...currentForm,
        findings: nextTask?.findings || nextTask?.resolution || currentForm.findings,
        afterCondition: nextTask?.afterCondition || currentForm.afterCondition,
        customerSignatureName: nextTask?.customerSignatureName || nextTask?.proof?.customerSignature?.name || currentForm.customerSignatureName,
        customerSignature: nextTask?.customerSignature || nextTask?.proof?.customerSignature?.signature || currentForm.customerSignature,
        notes: nextTask?.notes || nextTask?.proof?.notes || currentForm.notes,
      }));
    } catch (error) {
      Alert.alert("Unable to load work order", error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const formError = useMemo(() => {
    if (!canComplete) return "Register every assigned unit in AMP before completing this installation.";
    if (!form.findings.trim()) return "Describe the installation work you completed.";
    if (!form.afterCondition.trim()) return "Record the final operating condition.";
    if (!afterPhotos.some((photo) => photo?.uri)) return "Capture at least one installed-unit photo as proof.";
    if (!form.customerSignatureName.trim()) return "Enter the customer or receiver name for sign-off.";
    return "";
  }, [afterPhotos, canComplete, form]);

  const setField = (field, value) => setForm((currentForm) => ({ ...currentForm, [field]: value }));

  const submit = async () => {
    if (isAlreadyComplete) return router.replace("/technician/tasks");
    if (formError) return Alert.alert("Cannot complete installation", formError);

    const confirmed = await new Promise((resolve) => {
      Alert.alert("Submit proof of installation?", "This submits the AMP installation record, photo proof, and customer sign-off before closing the order.", [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Submit and close", onPress: () => resolve(true) },
      ]);
    });
    if (!confirmed) return;

    const submittedAt = new Date().toISOString();
    const technicianName = getDisplayName(current) || task?.assignedTechnicianName || "Technician";
    setSubmitting(true);
    try {
      const updated = await updateTaskStatus(id, TASK_STATUS.COMPLETED, technicianName, {
        findings: form.findings.trim(),
        resolution: form.findings.trim(),
        afterCondition: form.afterCondition.trim(),
        notes: form.notes.trim(),
        proofSubmittedAt: submittedAt,
        proof: {
          beforePhotos: [],
          afterPhotos,
          customerSignature: {
            name: form.customerSignatureName.trim(),
            signature: form.customerSignature.trim() || form.customerSignatureName.trim(),
            signedAt: submittedAt,
          },
          technicianName,
          submittedAt,
          notes: form.notes.trim(),
        },
      });
      setTask(updated);
      Alert.alert("Installation completed", "The customer order now includes the AMP registration, technician report, photo proof, and receiver sign-off.", [
        { text: "Back to work orders", onPress: () => router.replace("/technician/tasks") },
      ]);
    } catch (error) {
      Alert.alert("Unable to complete", error?.message || "Could not submit the proof of installation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }} keyboardShouldPersistTaps="handled">
        <PageHeader title="Proof of Installation" subtitle="AMP registration, field proof, and receiver sign-off" color={COLORS.tech} onBack={() => router.back()} />

        <Card>
          <InfoCard label="Work order" value={task?.taskCode || task?.title || "Loading…"} />
          <InfoCard label="Customer" value={task?.customerName || task?.customer || "Not provided"} />
          <InfoCard label="AMP registration" value={loading ? "Loading…" : `${registeredCount} of ${requiredCount} assigned units registered`} />
          {!canComplete && !loading ? <TechButton title="Finish AMP registration" onPress={() => router.push(`/technician/task/${id}/amp-registration`)} size="sm" variant="secondary" leftIcon={<Ionicons name="qr-code-sharp" size={16} color={COLORS.tech} />} /> : null}
        </Card>

        {ampRecords.length ? (
          <Card>
            <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.lg }}>AMP installation record</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 3 }}>These entries are included with this proof of installation.</Text>
            {ampRecords.map((record) => (
              <View key={record.serialNumber} style={{ marginTop: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt }}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>{record.serialNumber}</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>{record.ampParameters?.placementArea || "Placement not recorded"} · Filter: {record.ampParameters?.filterCondition || "normal"} · Final condition: {record.ampParameters?.conditionRating || "good"}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {isAlreadyComplete ? (
          <Card>
            <Text style={{ color: COLORS.success, fontWeight: FONT.black, fontSize: FONT.lg }}>This installation is already complete.</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>The order includes the submitted AMP record and proof of installation.</Text>
            <TechButton title="Back to Work Orders" onPress={() => router.replace("/technician/tasks")} style={{ marginTop: SPACING.md }} />
          </Card>
        ) : (
          <>
            <Card>
              <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginBottom: SPACING.sm }}>Technician handover</Text>
              <TextField label="Work completed" value={form.findings} onChangeText={(value) => setField("findings", value)} multiline placeholder="What did you install, test, or adjust?" />
              <TextField label="Final operating condition" value={form.afterCondition} onChangeText={(value) => setField("afterCondition", value)} multiline placeholder="Example: Unit powered on, cooled correctly, and customer briefed." />
              <TextField label="Additional handover notes (optional)" value={form.notes} onChangeText={(value) => setField("notes", value)} multiline placeholder="Important care or follow-up notes" />
            </Card>

            <InstallationPhotoCapture photos={afterPhotos} onChange={setAfterPhotos} />

            <Card>
              <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginBottom: SPACING.sm }}>Receiver sign-off</Text>
              <TextField label="Customer or receiver name" value={form.customerSignatureName} onChangeText={(value) => setField("customerSignatureName", value)} placeholder="Name confirming the completed installation" />
              <TextField label="Signature / confirmation (optional)" value={form.customerSignature} onChangeText={(value) => setField("customerSignature", value)} placeholder="Typed confirmation" />
              {formError ? <Text style={{ color: COLORS.danger, marginBottom: SPACING.sm }}>{formError}</Text> : null}
              <TechButton title={submitting ? "Submitting…" : "Submit proof and close order"} onPress={submit} loading={submitting} disabled={loading} leftIcon={<Ionicons name="checkmark-circle-sharp" size={18} color={COLORS.surface} />} />
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
