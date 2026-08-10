import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../components/technician/TechButton";
import Card from "../../../../components/ui/Card";
import InfoCard from "../../../../components/ui/InfoCard";
import PageHeader from "../../../../components/ui/PageHeader";
import TextField from "../../../../components/ui/TextField";
import { COLORS, FONT, SPACING } from "../../../../constants/theme";
import { useUserContext } from "../../../../context/UserContext";
import { getDisplayName } from "../../../../services/profileService";
import { getTaskById, TASK_STATUS, updateTaskStatus } from "../../../../services/taskStorage";

const initialForm = {
  beforeCondition: "",
  findings: "",
  resolution: "",
  afterCondition: "",
  partsUsed: "",
  laborCost: "",
  partsCost: "",
  additionalCost: "",
  nextMaintenanceDate: "",
  customerAdvice: "",
  customerSignatureName: "",
  customerSignature: "",
  notes: "",
};

const taskSerials = (task = {}) => {
  const safeTask = task && typeof task === "object" ? task : {};
  return safeTask.registrationProgress?.requiredSerials || safeTask.serialNumbers || [];
};

export default function CompleteServiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { current } = useUserContext();
  const [task, setTask] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const progress = task?.registrationProgress;
  const registeredCount = progress?.totalRegistered || 0;
  const requiredCount = progress?.totalRequired || taskSerials(task).length;
  const canComplete = Boolean(progress?.isComplete ?? requiredCount === 0);
  const isAlreadyComplete = task?.status === TASK_STATUS.COMPLETED;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const nextTask = await getTaskById(id);
      if (!nextTask) {
        throw new Error("This work order is no longer available. Return to My Work Orders and refresh the list.");
      }
      setTask(nextTask);
      setForm((current) => ({
        ...current,
        beforeCondition: nextTask?.beforeCondition || current.beforeCondition,
        findings: nextTask?.findings || current.findings,
        resolution: nextTask?.resolution || current.resolution,
        afterCondition: nextTask?.afterCondition || current.afterCondition,
        partsUsed: nextTask?.partsUsed || current.partsUsed,
        laborCost: nextTask?.laborCost ? String(nextTask.laborCost) : current.laborCost,
        partsCost: nextTask?.partsCost ? String(nextTask.partsCost) : current.partsCost,
        additionalCost: nextTask?.additionalCost ? String(nextTask.additionalCost) : current.additionalCost,
        nextMaintenanceDate: nextTask?.nextMaintenanceDate || current.nextMaintenanceDate,
        customerAdvice: nextTask?.customerAdvice || current.customerAdvice,
        customerSignatureName: nextTask?.customerSignatureName || nextTask?.proof?.customerSignature?.name || current.customerSignatureName,
        customerSignature: nextTask?.customerSignature || nextTask?.proof?.customerSignature?.signature || current.customerSignature,
        notes: nextTask?.notes || nextTask?.proof?.notes || current.notes,
      }));
    } catch (error) {
      Alert.alert("Unable to load task", error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const formError = useMemo(() => {
    if (!canComplete) return "Register every assigned QR label before completing this installation.";
    if (!form.beforeCondition.trim() || !form.findings.trim() || !form.resolution.trim() || !form.afterCondition.trim()) {
      return "Complete the installation condition and resolution report.";
    }
    if (!form.customerSignatureName.trim()) return "Enter the customer or receiver name for sign-off.";
    return "";
  }, [canComplete, form]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    if (isAlreadyComplete) {
      router.replace("/technician/tasks");
      return;
    }
    if (formError) {
      Alert.alert("Cannot complete installation", formError);
      return;
    }

    const confirmed = await new Promise((resolve) => {
      Alert.alert(
        "Complete installation?",
        "This submits the technician report and completes the customer order.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Complete", onPress: () => resolve(true) },
        ],
      );
    });
    if (!confirmed) return;

    const submittedAt = new Date().toISOString();
    const technicianName = getDisplayName(current) || task?.assignedTechnicianName || "Technician";
    setSubmitting(true);
    try {
      const updated = await updateTaskStatus(id, TASK_STATUS.COMPLETED, technicianName, {
        ...form,
        laborCost: Number(form.laborCost || 0),
        partsCost: Number(form.partsCost || 0),
        additionalCost: Number(form.additionalCost || 0),
        proofSubmittedAt: submittedAt,
        proof: {
          beforePhotos: [],
          afterPhotos: [],
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
      Alert.alert("Installation completed", "The work report, customer sign-off, installed unit records, and order status have been updated.", [
        { text: "Back to work orders", onPress: () => router.replace("/technician/tasks") },
      ]);
    } catch (error) {
      Alert.alert("Unable to complete", error?.message || "Could not complete this installation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        <PageHeader title="Complete Installation" subtitle="Submit the service report and customer sign-off" color={COLORS.tech} onBack={() => router.back()} />

        <Card>
          <InfoCard label="Work order" value={task?.taskCode || task?.title || "Loading…"} />
          <InfoCard label="Customer" value={task?.customerName || task?.customer || "Not provided"} />
          <InfoCard label="AMP registration" value={loading ? "Loading…" : `${registeredCount} of ${requiredCount} assigned units registered`} />
          {!canComplete && !loading ? (
            <TechButton
              title="Register Assigned Units"
              onPress={() => router.push(`/technician/task/${id}/amp-registration`)}
              size="sm"
              variant="secondary"
              leftIcon={<Ionicons name="qr-code-sharp" size={16} color={COLORS.tech} />}
            />
          ) : null}
        </Card>

        {isAlreadyComplete ? (
          <Card>
            <Text style={{ color: COLORS.success, fontWeight: FONT.black, fontSize: FONT.lg }}>This installation is already complete.</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>The work order and linked customer order have been finalized.</Text>
            <TechButton title="Back to Work Orders" onPress={() => router.replace("/technician/tasks")} style={{ marginTop: SPACING.md }} />
          </Card>
        ) : (
          <Card>
            <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginBottom: SPACING.sm }}>Installation report</Text>
            <TextField label="Before Condition" value={form.beforeCondition} onChangeText={(value) => setField("beforeCondition", value)} multiline placeholder="Condition before installation or service" />
            <TextField label="Findings" value={form.findings} onChangeText={(value) => setField("findings", value)} multiline placeholder="Work completed and observations" />
            <TextField label="Resolution" value={form.resolution} onChangeText={(value) => setField("resolution", value)} multiline placeholder="How the installation or issue was resolved" />
            <TextField label="After Condition" value={form.afterCondition} onChangeText={(value) => setField("afterCondition", value)} multiline placeholder="Final operating condition" />
            <TextField label="Parts Used" value={form.partsUsed} onChangeText={(value) => setField("partsUsed", value)} placeholder="None, or list parts used" />

            <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginTop: SPACING.sm, marginBottom: SPACING.sm }}>Cost and aftercare</Text>
            <TextField label="Labor Cost (PHP)" value={form.laborCost} onChangeText={(value) => setField("laborCost", value)} keyboardType="decimal-pad" />
            <TextField label="Parts Cost (PHP)" value={form.partsCost} onChangeText={(value) => setField("partsCost", value)} keyboardType="decimal-pad" />
            <TextField label="Additional Cost (PHP)" value={form.additionalCost} onChangeText={(value) => setField("additionalCost", value)} keyboardType="decimal-pad" />
            <TextField label="Next Maintenance Date" value={form.nextMaintenanceDate} onChangeText={(value) => setField("nextMaintenanceDate", value)} placeholder="YYYY-MM-DD" />
            <TextField label="Customer Advice" value={form.customerAdvice} onChangeText={(value) => setField("customerAdvice", value)} multiline />

            <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginTop: SPACING.sm, marginBottom: SPACING.sm }}>Customer sign-off</Text>
            <TextField label="Customer or Receiver Name" value={form.customerSignatureName} onChangeText={(value) => setField("customerSignatureName", value)} placeholder="Name confirming completed installation" />
            <TextField label="Signature / Confirmation" value={form.customerSignature} onChangeText={(value) => setField("customerSignature", value)} placeholder="Typed signature or confirmation" />
            <TextField label="Technician Notes" value={form.notes} onChangeText={(value) => setField("notes", value)} multiline />

            {formError ? <Text style={{ color: COLORS.danger, marginBottom: SPACING.sm }}>{formError}</Text> : null}
            <TechButton title={submitting ? "Completing…" : "Complete Installation"} onPress={submit} loading={submitting} disabled={loading} leftIcon={<Ionicons name="checkmark-circle-sharp" size={18} color={COLORS.surface} />} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
