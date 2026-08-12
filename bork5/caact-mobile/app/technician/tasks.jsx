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
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import {
  acceptTask,
  getTasksByTechnician,
  TASK_STATUS,
} from "../../services/taskStorage";
import { confirmAction } from "../../utils/confirmAction";

const STATUS_COLOR = {
  [TASK_STATUS.PENDING]: COLORS.warning,
  [TASK_STATUS.IN_PROGRESS]: COLORS.tech,
  [TASK_STATUS.ON_HOLD]: COLORS.warning,
  [TASK_STATUS.COMPLETED]: COLORS.success,
  [TASK_STATUS.CANCELLED]: COLORS.textMuted,
};

const WORK_FILTERS = [
  { key: "all", label: "All" },
  { key: "in-progress", label: "Active" },
  { key: "pending", label: "Ready" },
  { key: "on-hold", label: "On hold" },
  { key: "completed", label: "Completed" },
];

const taskStatusKey = (status = "") => String(status).trim().toLowerCase().replace(/[_\s]+/g, "-");
const taskUnitKey = (task = {}) => String(task.unitName || task.unitType || task.title || "Unassigned unit").trim();

function Badge({ label }) {
  const c = STATUS_COLOR[label] || COLORS.textSecondary;
  return <StatusChip label={label} color={c} />;
}

function getTaskSerials(task = {}) {
  const safeTask = task && typeof task === "object" ? task : {};
  const directSerials = Array.isArray(safeTask.serialNumbers) ? safeTask.serialNumbers : [];
  const itemSerials = (Array.isArray(safeTask.items) ? safeTask.items : [])
    .flatMap((item = {}) => [
      ...(Array.isArray(item.serialNumbers) ? item.serialNumbers : []),
      ...(Array.isArray(item.serialUnits)
        ? item.serialUnits.map((unit) => unit?.serialNumber)
        : []),
    ]);
  return Array.from(new Set([...directSerials, ...itemSerials]
    .map((serial) => String(serial || "").trim())
    .filter(Boolean)));
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

function FilterSheet({
  visible,
  onClose,
  statusFilter,
  unitFilter,
  onStatusChange,
  onUnitChange,
  unitNames,
  tasks,
}) {
  const clearFilters = () => {
    onStatusChange("all");
    onUnitChange("all");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.44)" }}
      >
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: COLORS.bg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.md }}
        >
          <View style={{ width: 42, height: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.borderInput, alignSelf: "center", marginBottom: SPACING.sm }} />
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.md }}>
            <View style={{ width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
              <Ionicons name="options-sharp" size={21} color={COLORS.tech} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>Filter work orders</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>Choose a status or an assigned AC unit</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close filters">
              <Ionicons name="close-sharp" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, marginBottom: SPACING.xs }}>Work status</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginBottom: SPACING.md }}>
            {WORK_FILTERS.map((status) => {
              const active = statusFilter === status.key;
              const count = status.key === "all" ? tasks.length : tasks.filter((task) => taskStatusKey(task.status) === status.key).length;
              return (
                <TouchableOpacity
                  key={status.key}
                  onPress={() => onStatusChange(status.key)}
                  activeOpacity={0.78}
                  style={{ minHeight: 38, flexDirection: "row", alignItems: "center", borderRadius: RADIUS.full, borderWidth: 1, borderColor: active ? COLORS.tech : COLORS.border, backgroundColor: active ? COLORS.tech : COLORS.surface, paddingHorizontal: SPACING.sm + 2, gap: 6 }}
                >
                  <Text style={{ color: active ? COLORS.surface : COLORS.textPrimary, fontWeight: FONT.bold }}>{status.label}</Text>
                  <View style={{ minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: active ? "rgba(255,255,255,0.2)" : COLORS.surfaceAlt }}>
                    <Text style={{ color: active ? COLORS.surface : COLORS.textSecondary, fontSize: 11, fontWeight: FONT.bold }}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {unitNames.length > 1 ? (
            <>
              <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, marginBottom: SPACING.xs }}>Assigned AC unit</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginBottom: SPACING.md }}>
                {unitNames.map((name) => {
                  const active = unitFilter === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      onPress={() => onUnitChange(name)}
                      activeOpacity={0.78}
                      style={{ minHeight: 38, justifyContent: "center", borderRadius: RADIUS.full, borderWidth: 1, borderColor: active ? COLORS.tech : COLORS.border, backgroundColor: active ? COLORS.techLight : COLORS.surface, paddingHorizontal: SPACING.sm + 4 }}
                    >
                      <Text numberOfLines={1} style={{ maxWidth: 220, color: active ? COLORS.tech : COLORS.textSecondary, fontWeight: active ? FONT.bold : "500" }}>{name === "all" ? "All AC units" : name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <TechButton title="Clear" onPress={clearFilters} variant="secondary" style={{ flex: 1 }} />
            <TechButton title="Show results" onPress={onClose} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [busy, setBusy] = useState(null);
  const [actionTask, setActionTask] = useState(null);
  const [filterVisible, setFilterVisible] = useState(false);

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
      .map((t) => taskUnitKey(t))
      .filter(Boolean);
    return ["all", ...Array.from(new Set(names))];
  }, [tasks]);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => {
      const statusMatch = statusFilter === "all" || taskStatusKey(task.status) === statusFilter;
      const unitMatch = unitFilter === "all" || taskUnitKey(task) === unitFilter;
      return statusMatch && unitMatch;
    }),
    [tasks, statusFilter, unitFilter],
  );
  const activeFilterCount = Number(statusFilter !== "all") + Number(unitFilter !== "all");

  const handleStart = (task) =>
    confirmAction({
      title: "Start Work Order",
      message: `Start working on "${task.title || task.issueType}"?`,
      confirmText: "Start",
      onConfirm: async () => {
        setBusy(task.id);
        try {
          await acceptTask(task.id);
          refresh();
        } catch (error) {
          Alert.alert(
            "Unable to start",
            error?.message || "Could not start this work order.",
          );
        } finally {
          setBusy(null);
        }
      },
    });

  const renderItem = ({ item }) => (
    <Card
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
        <TechButton
          title="View Work Details"
          onPress={() => router.push(`/technician/task/${item.id}/information`)}
          size="sm"
          variant="secondary"
          leftIcon={<Ionicons name="information-circle-sharp" size={16} color={COLORS.tech} />}
        />
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
          getTaskSerials(item).length > 0 && !item.registrationProgress?.isComplete ? (
            <TechButton
              title="Continue Installation"
              onPress={() => router.push(`/technician/task/${item.id}/amp-registration`)}
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
              title="Complete Installation"
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
        style={{ flex: 1 }}
        data={filteredTasks}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: SPACING.lg,
        }}
        ListHeaderComponent={
          <View>
            <TechHero
              eyebrow="Work Order Board"
              title={`${filteredTasks.length} work order${filteredTasks.length === 1 ? "" : "s"} to view`}
              subtitle="Prioritize active work, open AC unit records, and submit service reports."
              icon="map-sharp"
            />
            <Card
              onPress={() => setFilterVisible(true)}
              accessibilityLabel="Open work order filters"
              style={{ marginBottom: SPACING.md, padding: SPACING.sm + 4 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
                  <Ionicons name="options-sharp" size={20} color={COLORS.tech} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>Filter work orders</Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>
                    {activeFilterCount === 0 ? "All statuses and AC units" : `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} applied`}
                  </Text>
                </View>
                <View style={{ minWidth: 26, height: 26, borderRadius: RADIUS.full, backgroundColor: activeFilterCount ? COLORS.tech : COLORS.surfaceAlt, alignItems: "center", justifyContent: "center", marginRight: SPACING.xs }}>
                  <Text style={{ color: activeFilterCount ? COLORS.surface : COLORS.textSecondary, fontSize: FONT.sm, fontWeight: FONT.black }}>{activeFilterCount}</Text>
                </View>
                <Ionicons name="chevron-forward-sharp" size={20} color={COLORS.textMuted} />
              </View>
            </Card>
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
      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        statusFilter={statusFilter}
        unitFilter={unitFilter}
        onStatusChange={setStatusFilter}
        onUnitChange={setUnitFilter}
        unitNames={unitNames}
        tasks={tasks}
      />
    </TechnicianScreen>
  );
}
