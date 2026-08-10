import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../components/technician/TechButton";
import Card from "../../../../components/ui/Card";
import InfoCard from "../../../../components/ui/InfoCard";
import PageHeader from "../../../../components/ui/PageHeader";
import TextField from "../../../../components/ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../constants/theme";
import { getTaskById, registerTaskAmpUnit } from "../../../../services/taskStorage";

const today = () => new Date().toISOString().slice(0, 10);

const defaultForm = () => ({
  installationDate: today(),
  lastServiceDate: today(),
  placementArea: "",
  usageHoursPerDay: "8",
  environmentDustLevel: "moderate",
  occupancyLoad: "normal",
  filterCondition: "normal",
  coilCondition: "normal",
  drainageCondition: "clear",
  voltageStability: "stable",
  conditionRating: "good",
  notes: "",
  defectReason: "",
});

const taskSerials = (task = {}) => {
  const safeTask = task && typeof task === "object" ? task : {};
  const progressSerials = safeTask.registrationProgress?.requiredSerials;
  const directSerials = Array.isArray(safeTask.serialNumbers) ? safeTask.serialNumbers : [];
  const itemSerials = (Array.isArray(safeTask.items) ? safeTask.items : [])
    .flatMap((item = {}) => [
      ...(item.serialNumbers || []),
      ...(item.serialUnits || []).map((unit) => unit?.serialNumber),
    ]);
  return Array.from(new Set([...(Array.isArray(progressSerials) ? progressSerials : []), ...directSerials, ...itemSerials]
    .map((serial) => String(serial || "").trim())
    .filter(Boolean)));
};

function OptionGroup({ label, value, options, onChange }) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold, marginBottom: SPACING.xs }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              style={{
                borderRadius: RADIUS.full,
                borderWidth: 1,
                borderColor: active ? COLORS.tech : COLORS.borderInput,
                backgroundColor: active ? COLORS.techLight : COLORS.surface,
                paddingHorizontal: SPACING.sm + 2,
                paddingVertical: SPACING.xs + 3,
              }}
            >
              <Text style={{ color: active ? COLORS.tech : COLORS.textSecondary, fontWeight: active ? FONT.bold : "500" }}>
                {option.label}
              </Text>
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
            style={{
              borderWidth: 1,
              borderColor: active ? color : COLORS.border,
              backgroundColor: active ? `${color}14` : COLORS.surface,
              borderRadius: RADIUS.md,
              padding: SPACING.sm + 2,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name={isHeld ? "alert-circle-sharp" : isRegistered ? "checkmark-circle-sharp" : "qr-code-sharp"}
              size={20}
              color={color}
            />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>{serial}</Text>
              <Text style={{ color, fontSize: FONT.sm }}>
                {isHeld ? "Defect hold" : isRegistered ? "AMP registered" : "Registration required"}
              </Text>
            </View>
            {active ? <Ionicons name="checkmark-sharp" size={20} color={color} /> : null}
          </TouchableOpacity>
        );
      })}
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

  const serials = useMemo(() => taskSerials(task), [task]);
  const registrations = task?.ampRegistrations || {};
  const progress = task?.registrationProgress;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const nextTask = await getTaskById(id);
      if (!nextTask) {
        throw new Error("This work order is no longer available. Return to My Work Orders and refresh the list.");
      }
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
    if (!selectedSerial) {
      Alert.alert("Scan required", "No assigned serial number is available for this task.");
      return;
    }
    if (!holdMode && !form.placementArea.trim()) {
      Alert.alert("Placement required", "Enter the unit placement area before registering it.");
      return;
    }
    if (holdMode && !form.defectReason.trim()) {
      Alert.alert("Defect reason required", "Describe the issue before placing this unit on hold.");
      return;
    }

    setSaving(true);
    try {
      const result = await registerTaskAmpUnit(id, {
        ...form,
        serialNumber: selectedSerial,
        usageHoursPerDay: Number(form.usageHoursPerDay || 0),
        defectiveHold: holdMode,
      });
      setTask(result.task);
      const nextProgress = result.registrationProgress || result.task?.registrationProgress;
      const done = nextProgress?.isComplete;
      Alert.alert(
        holdMode ? "Unit on hold" : "Unit registered",
        holdMode
          ? "The task is on hold until the defect is resolved."
          : done
            ? "All assigned units are registered. You can now submit the installation report."
            : "Register the remaining assigned unit QR labels.",
        [{ text: "OK", onPress: () => done && router.replace(`/technician/task/${id}/complete-service`) }],
      );
    } catch (error) {
      Alert.alert("Unable to register unit", error?.message || "Please review the required fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        <PageHeader
          title="AMP Unit Registration"
          subtitle="Record installation conditions for every assigned unit"
          color={COLORS.tech}
          onBack={() => router.back()}
        />

        <Card>
          <InfoCard label="Work order" value={task?.taskCode || task?.title || "Loading…"} />
          <InfoCard label="Customer" value={task?.customerName || task?.customer || "Not provided"} />
          <InfoCard
            label="Registration progress"
            value={loading ? "Loading…" : `${progress?.totalRegistered || 0} of ${progress?.totalRequired || serials.length} registered`}
          />
        </Card>

        {!loading && serials.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.danger, fontWeight: FONT.bold }}>No inventory serial is assigned to this installation task.</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>Ask an administrator to repair or update the linked task before continuing.</Text>
          </Card>
        ) : null}

        {serials.length > 0 ? (
          <Card>
            <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginBottom: SPACING.sm }}>Assigned QR labels</Text>
            <SerialPicker serials={serials} selected={selectedSerial} registrations={registrations} onChange={selectSerial} />
          </Card>
        ) : null}

        {selectedSerial ? (
          <Card>
            <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black, marginBottom: SPACING.sm }}>Installation parameters</Text>
            <TextField label="Installation Date" value={form.installationDate} onChangeText={(value) => setField("installationDate", value)} placeholder="YYYY-MM-DD" />
            <TextField label="Last Service Date" value={form.lastServiceDate} onChangeText={(value) => setField("lastServiceDate", value)} placeholder="YYYY-MM-DD" />
            <TextField label="Placement Area" value={form.placementArea} onChangeText={(value) => setField("placementArea", value)} placeholder="Living room, bedroom, office…" />
            <TextField label="Daily Usage Hours" value={String(form.usageHoursPerDay)} onChangeText={(value) => setField("usageHoursPerDay", value)} keyboardType="decimal-pad" />

            <OptionGroup label="Dust Exposure" value={form.environmentDustLevel} onChange={(value) => setField("environmentDustLevel", value)} options={[{ value: "low", label: "Low" }, { value: "moderate", label: "Moderate" }, { value: "high", label: "High" }, { value: "severe", label: "Severe" }]} />
            <OptionGroup label="Occupancy Load" value={form.occupancyLoad} onChange={(value) => setField("occupancyLoad", value)} options={[{ value: "light", label: "Light" }, { value: "normal", label: "Normal" }, { value: "heavy", label: "Heavy" }]} />
            <OptionGroup label="Filter Condition" value={form.filterCondition} onChange={(value) => setField("filterCondition", value)} options={[{ value: "clean", label: "Clean" }, { value: "normal", label: "Normal" }, { value: "dusty", label: "Dusty" }, { value: "clogged", label: "Clogged" }]} />
            <OptionGroup label="Coil Condition" value={form.coilCondition} onChange={(value) => setField("coilCondition", value)} options={[{ value: "clean", label: "Clean" }, { value: "normal", label: "Normal" }, { value: "dusty", label: "Dusty" }, { value: "iced", label: "Iced" }]} />
            <OptionGroup label="Drainage" value={form.drainageCondition} onChange={(value) => setField("drainageCondition", value)} options={[{ value: "clear", label: "Clear" }, { value: "slow", label: "Slow" }, { value: "blocked", label: "Blocked" }]} />
            <OptionGroup label="Voltage Stability" value={form.voltageStability} onChange={(value) => setField("voltageStability", value)} options={[{ value: "stable", label: "Stable" }, { value: "fluctuating", label: "Fluctuating" }, { value: "unstable", label: "Unstable" }]} />
            <OptionGroup label="Overall Condition" value={form.conditionRating} onChange={(value) => setField("conditionRating", value)} options={[{ value: "excellent", label: "Excellent" }, { value: "good", label: "Good" }, { value: "fair", label: "Fair" }, { value: "poor", label: "Poor" }]} />
            <TextField label="Installation Notes" value={form.notes} onChangeText={(value) => setField("notes", value)} multiline />

            <TouchableOpacity onPress={() => setHoldMode((value) => !value)} style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm }}>
              <Ionicons name={holdMode ? "checkbox-sharp" : "square-outline"} size={22} color={holdMode ? COLORS.danger : COLORS.textSecondary} />
              <Text style={{ color: holdMode ? COLORS.danger : COLORS.textPrimary, marginLeft: SPACING.xs, fontWeight: FONT.bold }}>Mark this unit defective and hold the task</Text>
            </TouchableOpacity>
            {holdMode ? <TextField label="Defect Reason" value={form.defectReason} onChangeText={(value) => setField("defectReason", value)} multiline placeholder="Describe the defect and needed follow-up" /> : null}

            <TechButton title={saving ? "Saving…" : holdMode ? "Place Unit on Hold" : "Register Unit"} onPress={submit} loading={saving} variant={holdMode ? "secondary" : "primary"} />
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
