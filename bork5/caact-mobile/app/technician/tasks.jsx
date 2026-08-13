// app/(technician)/tasks.jsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
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
  { key: "cancelled", label: "Cancelled" },
];

const taskStatusKey = (status = "") => String(status).trim().toLowerCase().replace(/[_\s]+/g, "-");
const taskPriorityKey = (priority = "") => String(priority || "Normal").trim().toLowerCase();
const PRIORITY_FILTERS = [
  { key: "all", label: "Any priority" },
  { key: "urgent", label: "Urgent" },
  { key: "high", label: "High" },
  { key: "normal", label: "Normal" },
  { key: "low", label: "Low" },
];
const PAGE_SIZE = 8;

const taskMatchesQuery = (task = {}, query = "") => {
  const term = String(query || "").trim().toLowerCase();
  if (!term) return true;
  const searchable = [
    task.title,
    task.issueType,
    task.taskCode,
    task.orderCode,
    task.customerName,
    task.address,
    task.unitName,
    task.unitType,
    ...getTaskSerials(task),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return searchable.includes(term);
};

function Badge({ label }) {
  const c = STATUS_COLOR[label] || COLORS.textSecondary;
  return <StatusChip label={label} color={c} />;
}

function getTaskSerials(task = {}) {
  const safeTask = task && typeof task === "object" ? task : {};
  const progressSerials = Array.isArray(safeTask.registrationProgress?.requiredSerials)
    ? safeTask.registrationProgress.requiredSerials
    : [];
  const directSerials = Array.isArray(safeTask.serialNumbers) ? safeTask.serialNumbers : [];
  const itemSerials = (Array.isArray(safeTask.items) ? safeTask.items : [])
    .flatMap((item = {}) => [
      ...(Array.isArray(item.serialNumbers) ? item.serialNumbers : []),
      ...(Array.isArray(item.serialUnits)
        ? item.serialUnits.map((unit) => unit?.serialNumber)
        : []),
    ]);
  return Array.from(new Set([...progressSerials, ...directSerials, ...itemSerials]
    .map((serial) => String(serial || "").trim())
    .filter(Boolean)));
}

function FilterSheet({
  visible,
  onClose,
  statusFilter,
  priorityFilter,
  searchQuery,
  onStatusChange,
  onPriorityChange,
  onSearchChange,
  tasks,
}) {
  const clearFilters = () => {
    onStatusChange("all");
    onPriorityChange("all");
    onSearchChange("");
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
              <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>Find work by status, priority, customer, or reference</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close filters">
              <Ionicons name="close-sharp" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", minHeight: 46, borderWidth: 1, borderColor: COLORS.borderInput, borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, backgroundColor: COLORS.surface, marginBottom: SPACING.md }}>
            <Ionicons name="search-sharp" size={19} color={COLORS.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Search customer, task, order, or serial"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ flex: 1, color: COLORS.textPrimary, marginLeft: SPACING.xs, paddingVertical: SPACING.xs, fontSize: FONT.md }}
              accessibilityLabel="Search work orders"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => onSearchChange("")} hitSlop={10} accessibilityLabel="Clear work order search">
                <Ionicons name="close-circle-sharp" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : null}
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

          <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, marginBottom: SPACING.xs }}>Priority</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginBottom: SPACING.md }}>
            {PRIORITY_FILTERS.map((priority) => {
              const active = priorityFilter === priority.key;
              return (
                <TouchableOpacity
                  key={priority.key}
                  onPress={() => onPriorityChange(priority.key)}
                  activeOpacity={0.78}
                  style={{ minHeight: 38, justifyContent: "center", borderRadius: RADIUS.full, borderWidth: 1, borderColor: active ? COLORS.tech : COLORS.border, backgroundColor: active ? COLORS.techLight : COLORS.surface, paddingHorizontal: SPACING.sm + 4 }}
                >
                  <Text style={{ color: active ? COLORS.tech : COLORS.textSecondary, fontWeight: active ? FONT.bold : "500" }}>{priority.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [busy, setBusy] = useState(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [page, setPage] = useState(1);

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

  const filteredTasks = useMemo(
    () => tasks.filter((task) => {
      const statusMatch = statusFilter === "all" || taskStatusKey(task.status) === statusFilter;
      const priorityMatch = priorityFilter === "all" || taskPriorityKey(task.priority) === priorityFilter;
      return statusMatch && priorityMatch && taskMatchesQuery(task, searchQuery);
    }),
    [tasks, statusFilter, priorityFilter, searchQuery],
  );
  const activeFilterCount = Number(statusFilter !== "all") + Number(priorityFilter !== "all") + Number(Boolean(searchQuery.trim()));
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const visibleTasks = useMemo(
    () => filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredTasks, page],
  );

  React.useEffect(() => setPage(1), [statusFilter, priorityFilter, searchQuery]);
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
          title="Open Work Order"
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
        data={visibleTasks}
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
              subtitle={activeFilterCount ? `${filteredTasks.length} matching work order${filteredTasks.length === 1 ? "" : "s"}. ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} applied.` : "Prioritize active work, open AC unit records, and submit service reports."}
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
                    {activeFilterCount === 0 ? `${tasks.length} assigned work order${tasks.length === 1 ? "" : "s"}` : `${filteredTasks.length} matching - ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} applied`}
                  </Text>
                </View>
                <View style={{ minWidth: 30, height: 26, borderRadius: RADIUS.full, backgroundColor: activeFilterCount ? COLORS.tech : COLORS.surfaceAlt, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, marginRight: SPACING.xs }}>
                  <Text style={{ color: activeFilterCount ? COLORS.surface : COLORS.textSecondary, fontSize: FONT.sm, fontWeight: FONT.black }}>{filteredTasks.length}</Text>
                </View>
                <Ionicons name="chevron-forward-sharp" size={20} color={COLORS.textMuted} />
              </View>
            </Card>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={tasks.length ? "No matching work orders" : "No work orders assigned"}
            message={tasks.length ? "Try clearing or changing the current filters." : "Assigned service work will appear here."}
            icon="clipboard-sharp"
            iconColor={COLORS.tech}
            action={tasks.length ? (
              <TechButton
                title="Clear Filters"
                onPress={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setSearchQuery("");
                }}
              />
            ) : null}
          />
        }
        ListFooterComponent={filteredTasks.length > PAGE_SIZE ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm, paddingTop: SPACING.sm }}>
            <TechButton title="Previous" size="sm" variant="secondary" disabled={page === 1} onPress={() => setPage((currentPage) => Math.max(1, currentPage - 1))} style={{ flex: 1 }} />
            <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: FONT.bold }}>{`Page ${page} of ${totalPages}`}</Text>
            <TechButton title="Next" size="sm" disabled={page === totalPages} onPress={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))} style={{ flex: 1 }} />
          </View>
        ) : null}
      />
      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        searchQuery={searchQuery}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onSearchChange={setSearchQuery}
        tasks={tasks}
      />
    </TechnicianScreen>
  );
}
