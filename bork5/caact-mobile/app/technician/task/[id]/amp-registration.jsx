import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../components/technician/TechButton";
import Card from "../../../../components/ui/Card";
import TextField from "../../../../components/ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../constants/theme";
import { getTaskById, registerTaskAmpUnit } from "../../../../services/taskStorage";

const today = () => new Date().toISOString().slice(0, 10);
const defaultForm = () => ({
  installationDate: today(), lastServiceDate: today(), placementArea: "", usageHoursPerDay: "8",
  environmentDustLevel: "moderate", occupancyLoad: "normal", filterCondition: "normal",
  coilCondition: "normal", drainageCondition: "clear", voltageStability: "stable",
  conditionRating: "good", notes: "", defectReason: "",
});

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

function OptionGroup({ label, value, options, onChange }) {
  return (
    <View style={{ marginBottom: SPACING.md + 2 }}>
      <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold, marginBottom: SPACING.xs + 2 }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              activeOpacity={0.78}
              style={{ minHeight: 38, borderRadius: RADIUS.full, borderWidth: 1, borderColor: active ? COLORS.tech : COLORS.borderInput, backgroundColor: active ? COLORS.techLight : COLORS.surface, paddingHorizontal: SPACING.sm + 4, justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              {active ? <Ionicons name="checkmark-circle-sharp" size={15} color={COLORS.tech} /> : null}
              <Text style={{ color: active ? COLORS.tech : COLORS.textSecondary, fontWeight: active ? FONT.bold : "500" }}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SerialPicker({ serials, selected, registrations, onChange }) {
  return (
    <View style={{ gap: SPACING.xs }}>
      {serials.map((serial) => {
        const registration = registrations?.[serial];
        const isRegistered = registration?.status === "registered";
        const isHeld = registration?.status === "defective_hold";
        const active = selected === serial;
        const color = isHeld ? COLORS.danger : isRegistered ? COLORS.success : COLORS.tech;
        return (
          <TouchableOpacity
            key={serial}
            onPress={() => onChange(serial)}
            activeOpacity={0.78}
            style={{ minHeight: 64, borderWidth: 1, borderColor: active ? color : COLORS.border, backgroundColor: active ? `${color}14` : COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md - 2, flexDirection: "row", alignItems: "center" }}
          >
            <Ionicons name={isHeld ? "alert-circle-sharp" : isRegistered ? "checkmark-circle-sharp" : "qr-code-sharp"} size={21} color={color} />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>{serial}</Text>
              <Text style={{ color, fontSize: FONT.sm, marginTop: 1 }}>{isHeld ? "Defect hold" : isRegistered ? "AMP registered" : "Registration required"}</Text>
            </View>
            {active ? <Ionicons name="checkmark-circle-sharp" size={21} color={color} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FormSection({ icon, title, subtitle, children }) {
  return (
    <Card style={{ padding: SPACING.md, marginBottom: SPACING.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.md }}>
        <View style={{ width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
          <Ionicons name={icon} size={20} color={COLORS.tech} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>{title}</Text>
          {subtitle ? <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </Card>
  );
}

function RegistrationHero({ task, progress, serialCount, loading }) {
  const total = progress?.totalRequired || serialCount;
  const registered = progress?.totalRegistered || 0;
  const percentage = total ? Math.round((registered / total) * 100) : 0;
  return (
    <View style={{ backgroundColor: COLORS.tech, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md, overflow: "hidden" }}>
      <View style={{ position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.11)", right: -46, top: -58 }} />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 48, height: 48, borderRadius: RADIUS.lg, backgroundColor: "rgba(255,255,255,0.17)", alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
          <Ionicons name="qr-code-sharp" size={25} color={COLORS.surface} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#bae6fd", fontSize: FONT.sm, fontWeight: FONT.bold }}>AMP INSTALLATION SETUP</Text>
          <Text numberOfLines={1} style={{ color: COLORS.surface, fontSize: FONT.lg, fontWeight: FONT.black, marginTop: 2 }}>{task?.taskCode || task?.title || "Loading work order"}</Text>
          <Text numberOfLines={1} style={{ color: "#e0f2fe", fontSize: FONT.sm, marginTop: 2 }}>{task?.customerName || task?.customer || "Customer details loading"}</Text>
        </View>
      </View>
      <View style={{ marginTop: SPACING.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={{ color: "#e0f2fe", fontSize: FONT.sm }}>Registration progress</Text>
          <Text style={{ color: COLORS.surface, fontSize: FONT.sm, fontWeight: FONT.black }}>{loading ? "..." : `${registered}/${total || 0}`}</Text>
        </View>
        <View style={{ height: 8, borderRadius: RADIUS.full, backgroundColor: "rgba(255,255,255,0.24)", overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${percentage}%`, borderRadius: RADIUS.full, backgroundColor: COLORS.surface }} />
        </View>
      </View>
    </View>
  );
}

export default function AmpRegistrationScreen() {
  const router = useRouter();
  const { id, serial: serialParam } = useLocalSearchParams();
  const [task, setTask] = useState(null);
  const [selectedSerial, setSelectedSerial] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [holdMode, setHoldMode] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");

  const serials = useMemo(() => taskSerials(task), [task]);
  const registrations = task?.ampRegistrations || {};
  const progress = task?.registrationProgress;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const nextTask = await getTaskById(id);
      if (!nextTask) throw new Error("This work order is no longer available. Return to My Work Orders and refresh the list.");
      setTask(nextTask);
      const requestedSerial = Array.isArray(serialParam) ? serialParam[0] : serialParam;
      const availableSerials = taskSerials(nextTask);
      const nextSerial = availableSerials.includes(String(requestedSerial || ""))
        ? String(requestedSerial)
        : availableSerials.find((serial) => nextTask?.ampRegistrations?.[serial]?.status !== "registered") || availableSerials[0] || "";
      setSelectedSerial(nextSerial);
      const previous = nextTask?.ampRegistrations?.[nextSerial]?.ampParameters;
      setForm(previous ? { ...defaultForm(), ...previous } : defaultForm());
      setHoldMode(nextTask?.ampRegistrations?.[nextSerial]?.status === "defective_hold");
    } catch (error) {
      Alert.alert("Unable to load task", error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id, serialParam]);

  useFocusEffect(React.useCallback(() => { load(); }, [load]));
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const selectSerial = (serial) => {
    setSelectedSerial(serial);
    const previous = registrations?.[serial]?.ampParameters;
    setForm(previous ? { ...defaultForm(), ...previous } : defaultForm());
    setHoldMode(registrations?.[serial]?.status === "defective_hold");
  };

  const submit = async () => {
    if (!selectedSerial) return Alert.alert("Scan required", "No assigned serial number is available for this task.");
    if (!holdMode && !form.placementArea.trim()) return Alert.alert("Placement required", "Enter the unit placement area before registering it.");
    if (holdMode && !form.defectReason.trim()) return Alert.alert("Defect reason required", "Describe the issue before placing this unit on hold.");

    setSaving(true);
    setSubmissionMessage("");
    try {
      const result = await registerTaskAmpUnit(id, { ...form, serialNumber: selectedSerial, usageHoursPerDay: Number(form.usageHoursPerDay || 0), defectiveHold: holdMode });
      setTask(result.task);
      const nextProgress = result.registrationProgress || result.task?.registrationProgress;
      const done = nextProgress?.isComplete;
      setSubmissionMessage(holdMode
        ? "Unit placed on hold. Resolve the defect before completing this work order."
        : done
          ? "All assigned units are registered. You can now submit the installation report."
          : `Unit registered. ${nextProgress?.totalRegistered || 0} of ${nextProgress?.totalRequired || serials.length} units are complete.`);
      Alert.alert(
        holdMode ? "Unit on hold" : "Unit registered",
        holdMode ? "The task is on hold until the defect is resolved." : done ? "All assigned units are registered. You can now submit the installation report." : "Register the remaining assigned unit QR labels.",
        [{ text: "OK", onPress: () => done && router.replace(`/technician/task/${id}/complete-service`) }],
      );
    } catch (error) {
      Alert.alert("Unable to register unit", error?.message || "Please review the required fields and try again.");
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
          <Text style={{ color: COLORS.textPrimary, fontSize: FONT.xl, fontWeight: FONT.black }}>Register AC unit</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>Register the installed unit for AMP monitoring</Text>
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl + 48 }}>
        <RegistrationHero task={task} progress={progress} serialCount={serials.length} loading={loading} />

        {submissionMessage ? (
          <View style={{ backgroundColor: COLORS.successLight, borderColor: COLORS.success, borderWidth: 1, borderRadius: RADIUS.md, flexDirection: "row", marginBottom: SPACING.md, padding: SPACING.md }}>
            <Ionicons name="checkmark-circle-sharp" size={22} color={COLORS.success} />
            <Text style={{ color: COLORS.textPrimary, flex: 1, lineHeight: 20, marginLeft: SPACING.sm }}>{submissionMessage}</Text>
          </View>
        ) : null}

        {!loading && serials.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.danger, fontWeight: FONT.bold }}>No inventory serial is assigned to this installation task.</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>Ask an administrator to repair or update the linked task before continuing.</Text>
          </Card>
        ) : null}

        {serials.length > 0 ? <FormSection icon="qr-code-sharp" title="Choose assigned unit" subtitle="Select the serial label you are registering"><SerialPicker serials={serials} selected={selectedSerial} registrations={registrations} onChange={selectSerial} /></FormSection> : null}

        {selectedSerial ? (
          <>
            <FormSection icon="calendar-sharp" title="Installation details" subtitle="Record only the details needed to set up AMP monitoring">
              <TextField label="Installation Date" value={form.installationDate} onChangeText={(value) => setField("installationDate", value)} placeholder="YYYY-MM-DD" />
              <TextField label="Placement Area" value={form.placementArea} onChangeText={(value) => setField("placementArea", value)} placeholder="Living room, bedroom, office..." />
              <TextField label="Daily Usage Hours" value={String(form.usageHoursPerDay)} onChangeText={(value) => setField("usageHoursPerDay", value)} keyboardType="decimal-pad" />
            </FormSection>
            <FormSection icon="snow-sharp" title="Unit condition" subtitle="These checks define the initial AMP health record">
              <OptionGroup label="Filter Condition" value={form.filterCondition} onChange={(value) => setField("filterCondition", value)} options={[{ value: "clean", label: "Clean" }, { value: "normal", label: "Normal" }, { value: "dusty", label: "Dusty" }, { value: "clogged", label: "Clogged" }]} />
              <OptionGroup label="Coil Condition" value={form.coilCondition} onChange={(value) => setField("coilCondition", value)} options={[{ value: "clean", label: "Clean" }, { value: "normal", label: "Normal" }, { value: "dusty", label: "Dusty" }, { value: "iced", label: "Iced" }]} />
              <OptionGroup label="Drainage" value={form.drainageCondition} onChange={(value) => setField("drainageCondition", value)} options={[{ value: "clear", label: "Clear" }, { value: "slow", label: "Slow" }, { value: "blocked", label: "Blocked" }]} />
              <OptionGroup label="Overall Condition" value={form.conditionRating} onChange={(value) => setField("conditionRating", value)} options={[{ value: "excellent", label: "Excellent" }, { value: "good", label: "Good" }, { value: "fair", label: "Fair" }, { value: "poor", label: "Poor" }]} />
            </FormSection>
            <FormSection icon="document-text-sharp" title="Notes and exceptions" subtitle="Record important installation notes or place a defective unit on hold">
              <TextField label="Installation Notes (optional)" value={form.notes} onChangeText={(value) => setField("notes", value)} multiline placeholder="Anything that should be included in the installation proof" />
              <TouchableOpacity onPress={() => setHoldMode((value) => !value)} activeOpacity={0.78} style={{ minHeight: 50, flexDirection: "row", alignItems: "center", borderRadius: RADIUS.md, borderWidth: 1, borderColor: holdMode ? COLORS.danger : COLORS.border, backgroundColor: holdMode ? COLORS.dangerLight : COLORS.surfaceAlt, paddingHorizontal: SPACING.sm + 2, marginBottom: SPACING.sm }}>
                <Ionicons name={holdMode ? "alert-circle-sharp" : "alert-circle-outline"} size={22} color={holdMode ? COLORS.danger : COLORS.textSecondary} />
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Text style={{ color: holdMode ? COLORS.danger : COLORS.textPrimary, fontWeight: FONT.bold }}>Place this unit on hold</Text>
                  <Text style={{ color: holdMode ? COLORS.danger : COLORS.textSecondary, fontSize: FONT.sm, marginTop: 1 }}>Use only when the unit has a defect requiring follow-up.</Text>
                </View>
                <Ionicons name={holdMode ? "checkmark-circle-sharp" : "chevron-forward-sharp"} size={20} color={holdMode ? COLORS.danger : COLORS.textMuted} />
              </TouchableOpacity>
              {holdMode ? <TextField label="Defect Reason" value={form.defectReason} onChangeText={(value) => setField("defectReason", value)} multiline placeholder="Describe the defect and needed follow-up" /> : null}
            </FormSection>
            <TechButton title={saving ? "Saving..." : holdMode ? "Place Unit on Hold" : "Register selected unit"} onPress={submit} loading={saving} variant={holdMode ? "secondary" : "primary"} leftIcon={<Ionicons name={holdMode ? "alert-circle-sharp" : "checkmark-circle-sharp"} size={18} color={holdMode ? COLORS.tech : COLORS.surface} />} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
