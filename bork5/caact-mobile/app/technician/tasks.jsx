// app/(technician)/tasks.jsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TechnicianScreen, {
  TechHero,
} from "../../components/technician/TechnicianScreen";
import TechButton from "../../components/technician/TechButton";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import IconRow from "../../components/ui/IconRow";
import StatusChip from "../../components/ui/StatusChip";
import TextField from "../../components/ui/TextField";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import { getDisplayName } from "../../services/profileService";
import {
  acceptTask,
  getTasksByTechnician,
  TASK_STATUS,
  updateTaskStatus,
} from "../../services/taskStorage";
import { confirmAction } from "../../utils/confirmAction";

const STATUS_COLOR = {
  [TASK_STATUS.PENDING]: COLORS.warning,
  [TASK_STATUS.IN_PROGRESS]: COLORS.tech,
  [TASK_STATUS.ON_HOLD]: COLORS.warning,
  [TASK_STATUS.COMPLETED]: COLORS.success,
  [TASK_STATUS.CANCELLED]: COLORS.textMuted,
};
const EMPTY_FORM = {
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

function Badge({ label }) {
  const c = STATUS_COLOR[label] || COLORS.textSecondary;
  return <StatusChip label={label} color={c} />;
}

function getTaskSerials(task = {}) {
  if (Array.isArray(task.serialNumbers) && task.serialNumbers.length > 0) {
    return task.serialNumbers.filter(Boolean);
  }
  return (task.items || [])
    .flatMap((item) => [
      ...(Array.isArray(item.serialNumbers) ? item.serialNumbers : []),
      ...(Array.isArray(item.serialUnits)
        ? item.serialUnits.map((unit) => unit?.serialNumber)
        : []),
    ])
    .map((serial) => String(serial || "").trim())
    .filter(Boolean);
}

function CompletionForm({ form, onChange, onSubmit, submitting }) {
  const f = (k) => (v) => onChange(k, v);
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: COLORS.border,
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
      }}
    >
      <Text
        style={{
          fontWeight: FONT.black,
          color: COLORS.textPrimary,
          marginBottom: SPACING.sm,
        }}
      >
        Complete Work Order
      </Text>
      <TextField
        label="Before Condition"
        value={form.beforeCondition}
        onChangeText={f("beforeCondition")}
        multiline
      />
      <TextField
        label="Findings"
        value={form.findings}
        onChangeText={f("findings")}
        multiline
      />
      <TextField
        label="Resolution"
        value={form.resolution}
        onChangeText={f("resolution")}
        multiline
      />
      <TextField
        label="After Condition"
        value={form.afterCondition}
        onChangeText={f("afterCondition")}
        multiline
      />
      <TextField
        label="Parts Used"
        value={form.partsUsed}
        onChangeText={f("partsUsed")}
      />
      <TextField
        label="Labor Cost (₱)"
        value={form.laborCost}
        onChangeText={f("laborCost")}
        keyboardType="decimal-pad"
      />
      <TextField
        label="Parts Cost (₱)"
        value={form.partsCost}
        onChangeText={f("partsCost")}
        keyboardType="decimal-pad"
      />
      <TextField
        label="Additional Cost (₱)"
        value={form.additionalCost}
        onChangeText={f("additionalCost")}
        keyboardType="decimal-pad"
      />
      <TextField
        label="Next Maintenance Date"
        value={form.nextMaintenanceDate}
        onChangeText={f("nextMaintenanceDate")}
        placeholder="YYYY-MM-DD"
      />
      <TextField
        label="Customer Advice"
        value={form.customerAdvice}
        onChangeText={f("customerAdvice")}
        multiline
      />
      <TextField
        label="Customer Name"
        value={form.customerSignatureName}
        onChangeText={f("customerSignatureName")}
        placeholder="Name of customer or receiver"
      />
      <TextField
        label="Customer Signature"
        value={form.customerSignature}
        onChangeText={f("customerSignature")}
        placeholder="Typed signature"
      />
      <TextField
        label="Notes"
        value={form.notes}
        onChangeText={f("notes")}
        multiline
      />
      <TechButton
        title={submitting ? "Submitting..." : "Submit Work Report"}
        onPress={onSubmit}
        loading={submitting}
        style={{ marginTop: SPACING.sm }}
      />
    </View>
  );
}

function TaskActionSheet({ task, visible, onClose, onInformation, onLogs }) {
  if (!task) return null;

  const actions = [
    {
      label: "Work Order Details",
      subtitle: "Customer, service request, AC unit, costs, and maintenance details",
      icon: "information-circle-sharp",
      onPress: onInformation,
    },
    task.unitId
      ? {
          label: "Service Notes",
          subtitle: "View or add service notes for this AC unit",
          icon: "document-text-sharp",
          onPress: onLogs,
        }
      : null,
  ].filter(Boolean);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.42)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          style={{
            backgroundColor: COLORS.bg,
            borderTopLeftRadius: RADIUS.xl,
            borderTopRightRadius: RADIUS.xl,
            padding: SPACING.md,
          }}
        >
          <View
            style={{
              width: 44,
              height: 5,
              borderRadius: RADIUS.full,
              backgroundColor: COLORS.borderInput,
              alignSelf: "center",
              marginBottom: SPACING.md,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: SPACING.md,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: RADIUS.md,
                backgroundColor: COLORS.techLight,
                alignItems: "center",
                justifyContent: "center",
                marginRight: SPACING.sm,
              }}
            >
              <Ionicons name="briefcase-sharp" size={22} color={COLORS.tech} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontWeight: FONT.black,
                  fontSize: FONT.lg,
                }}
              >
                {task.title || task.issueType || "Work Order Actions"}
              </Text>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: FONT.sm,
                  marginTop: 2,
                }}
              >
                Choose the next action for this work order
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons
                name="close-sharp"
                size={24}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              onPress={() => {
                onClose();
                action.onPress();
              }}
              activeOpacity={0.78}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: RADIUS.lg,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: SPACING.md,
                marginBottom: SPACING.sm,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: RADIUS.md,
                  backgroundColor: COLORS.techLight,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: SPACING.sm,
                }}
              >
                <Ionicons name={action.icon} size={21} color={COLORS.tech} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}
                >
                  {action.label}
                </Text>
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: FONT.sm,
                    marginTop: 2,
                  }}
                >
                  {action.subtitle}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward-sharp"
                size={18}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [unitFilter, setUnitFilter] = useState("All");
  const [completing, setCompleting] = useState(null);
  const [completionForms, setCompletionForms] = useState({});
  const [busy, setBusy] = useState(null);
  const [actionTask, setActionTask] = useState(null);

  const refresh = () => {
    if (!current?.id) return;
    getTasksByTechnician(current.id)
      .then((all) => {
        const sorted = [...all].sort((a, b) => {
          const order = {
            [TASK_STATUS.IN_PROGRESS]: 0,
            [TASK_STATUS.PENDING]: 1,
            [TASK_STATUS.ON_HOLD]: 2,
            [TASK_STATUS.COMPLETED]: 3,
          };
          return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });
        setTasks(sorted);
      })
      .catch(() => {});
  };
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [current]),
  );

  const unitNames = useMemo(() => {
    const names = tasks
      .map((t) => t.unitName || t.title || null)
      .filter(Boolean);
    return ["All", ...Array.from(new Set(names))];
  }, [tasks]);

  const handleStart = (task) =>
    confirmAction({
      title: "Start Work Order",
      message: `Start working on "${task.title || task.issueType}"?`,
      confirmText: "Start",
      onConfirm: async () => {
        setBusy(task.id);
        await acceptTask(task.id);
        refresh();
        setBusy(null);
      },
    });

  const handleComplete = async (task) => {
    const form = completionForms[task.id] || EMPTY_FORM;
    const proofSubmittedAt = new Date().toISOString();
    const technicianName = getDisplayName(current);
    setBusy(task.id);
    try {
      await updateTaskStatus(
        task.id,
        TASK_STATUS.COMPLETED,
        technicianName,
        {
          ...form,
          laborCost: Number(form.laborCost || 0),
          partsCost: Number(form.partsCost || 0),
          additionalCost: Number(form.additionalCost || 0),
          proofSubmittedAt,
          proof: {
            beforePhotos: [],
            afterPhotos: [],
            customerSignature: {
              name: form.customerSignatureName.trim(),
              signature: form.customerSignature.trim() || form.customerSignatureName.trim(),
              signedAt: proofSubmittedAt,
            },
            technicianName,
            submittedAt: proofSubmittedAt,
            notes: form.notes.trim(),
          },
        },
      );
      setCompleting(null);
      refresh();
    } catch (error) {
      Alert.alert(
        "Unable to complete",
        error?.message || "Could not complete this work order.",
      );
    } finally {
      setBusy(null);
    }
  };

  const setField = (taskId, key, value) =>
    setCompletionForms((p) => ({
      ...p,
      [taskId]: { ...(p[taskId] || EMPTY_FORM), [key]: value },
    }));

  const renderItem = ({ item }) => (
    <Card
      pressed
      style={{
        marginBottom: SPACING.sm,
        borderLeftWidth: 4,
        borderLeftColor: STATUS_COLOR[item.status] || COLORS.tech,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: SPACING.xs,
        }}
      >
        <Text
          style={{
            fontWeight: FONT.black,
            color: COLORS.textPrimary,
            flex: 1,
            paddingRight: SPACING.sm,
          }}
        >
          {item.title || item.issueType || "Work Order"}
        </Text>
        <Badge label={item.status} />
      </View>
      {!!item.customerName && (
        <IconRow
          icon="person-sharp"
          title={item.customerName}
          subtitle={item.address || "No address"}
          color={COLORS.tech}
          style={{ paddingVertical: SPACING.xs }}
        />
      )}
      {!!item.scheduledDate && (
        <IconRow
          icon="calendar-sharp"
          title="Scheduled"
          subtitle={item.scheduledDate}
          color={COLORS.warning}
          style={{ paddingVertical: SPACING.xs }}
        />
      )}
      {getTaskSerials(item).length > 0 && (
        <IconRow
          icon="qr-code-sharp"
          title={`${getTaskSerials(item).length} assigned unit${getTaskSerials(item).length === 1 ? "" : "s"}`}
          subtitle={getTaskSerials(item).join(", ")}
          color={COLORS.success}
          style={{ paddingVertical: SPACING.xs }}
        />
      )}
      <View style={{ marginTop: SPACING.sm }}>
        {item.status === TASK_STATUS.PENDING && (
          <TechButton
            title="Start Work Order"
            onPress={() => handleStart(item)}
            loading={busy === item.id}
            variant="primary"
            leftIcon={
              <Ionicons name="play-sharp" size={16} color={COLORS.surface} />
            }
          />
        )}
        {item.status === TASK_STATUS.IN_PROGRESS && (
          getTaskSerials(item).length > 0 ? (
            <TechButton
              title="Register Assigned Unit"
              onPress={() => router.push(`/technician/task/${item.id}/amp-registration?serial=${encodeURIComponent(getTaskSerials(item)[0])}`)}
              size="sm"
              leftIcon={
                <Ionicons
                  name="qr-code-sharp"
                  size={16}
                  color={COLORS.surface}
                />
              }
            />
          ) : (
            <TechButton
              title="Complete Service"
              onPress={() => router.push(`/technician/task/${item.id}/complete-service`)}
              size="sm"
              leftIcon={
                <Ionicons
                  name="checkmark-sharp"
                  size={16}
                  color={COLORS.surface}
                />
              }
            />
          )
        )}
        <TechButton
          title="More Options"
          onPress={() => setActionTask(item)}
          variant="secondary"
          leftIcon={
            <Ionicons
              name="ellipsis-horizontal-sharp"
              size={16}
              color={COLORS.tech}
            />
          }
          style={{ marginTop: SPACING.sm }}
        />
      </View>
      {completing === item.id && item.status === TASK_STATUS.IN_PROGRESS && (
        <CompletionForm
          form={completionForms[item.id] || EMPTY_FORM}
          onChange={(k, v) => setField(item.id, k, v)}
          onSubmit={() => handleComplete(item)}
          submitting={busy === item.id}
        />
      )}
    </Card>
  );

  return (
    <TechnicianScreen
      title="My Work Orders"
      subtitle="Filter, start, and complete assigned service work"
      icon="clipboard-sharp"
      scroll={false}
    >
      <FlatList
        data={tasks.filter((task) => {
          const statusMatch =
            statusFilter === "All" || task.status === statusFilter;
          const unitMatch =
            unitFilter === "All" ||
            (task.unitName || task.title || "") === unitFilter;
          return statusMatch && unitMatch;
        })}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: SPACING.lg,
        }}
        ListHeaderComponent={
          <View>
            <TechHero
              eyebrow="Work Order Board"
              title={`${tasks.length} assigned work order${tasks.length === 1 ? "" : "s"}`}
              subtitle="Prioritize active work, open AC unit records, and submit service reports."
              icon="map-sharp"
            />
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: SPACING.sm,
                marginBottom: SPACING.md,
              }}
            >
              {["All", ...Object.values(TASK_STATUS)].map((status) => (
                <TechButton
                  key={status}
                  title={status}
                  onPress={() => setStatusFilter(status)}
                  size="sm"
                  variant={statusFilter === status ? "primary" : "secondary"}
                />
              ))}
            </View>
            {unitNames.length > 1 && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: SPACING.sm,
                  marginBottom: SPACING.md,
                }}
              >
                {unitNames.map((name) => (
                  <TechButton
                    key={name}
                    title={name === "All" ? "All AC Units" : name}
                    onPress={() => setUnitFilter(name)}
                    size="sm"
                    variant={unitFilter === name ? "secondary" : "ghost"}
                  />
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No work orders assigned"
            message="Assigned service work will appear here."
            icon="clipboard-sharp"
            iconColor={COLORS.tech}
          />
        }
      />
      <TaskActionSheet
        task={actionTask}
        visible={!!actionTask}
        onClose={() => setActionTask(null)}
        onInformation={() =>
          router.push(`/technician/task/${actionTask?.id}/information`)
        }
        onLogs={() =>
          router.push(`/technician/task/${actionTask?.id}/unit/log/select`)
        }
      />
    </TechnicianScreen>
  );
}
