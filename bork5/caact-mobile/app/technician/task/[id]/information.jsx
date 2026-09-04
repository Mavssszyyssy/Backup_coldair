import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../components/technician/TechButton";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import StatusChip from "../../../../components/ui/StatusChip";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../constants/theme";
import { getServiceRequestsByUser } from "../../../../services/serviceRequestStorage";
import { checkInTask, getTaskById, TASK_STATUS } from "../../../../services/taskStorage";
import { getCurrentLocationSnapshot } from "../../../../services/locationService";
import { getUnitByCode } from "../../../../services/unitStorage";
import { getServiceLogsByTask } from "../../../../services/unitServiceLogStorage";

function money(value) {
  return `PHP ${Number(value || 0).toFixed(2)}`;
}

const DETAIL_PAGES = [
  { label: "Overview", icon: "clipboard-sharp" },
  { label: "AC Unit", icon: "snow-sharp" },
  { label: "Service", icon: "construct-sharp" },
  { label: "Proof", icon: "camera-sharp" },
];

const STATUS_COLORS = {
  pending: COLORS.warning,
  accepted: COLORS.tech,
  "on-the-way": COLORS.tech,
  arrived: COLORS.success,
  installing: COLORS.tech,
  "in-progress": COLORS.tech,
  completed: COLORS.success,
  cancelled: COLORS.textMuted,
  failed: COLORS.danger,
};

function statusColor(status) {
  return STATUS_COLORS[String(status || "").trim().toLowerCase().replace(/[_\s]+/g, "-")] || COLORS.tech;
}

function SectionHeading({ icon, title, subtitle }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.md }}>
      <View style={{ width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
        <Ionicons name={icon} size={22} color={COLORS.tech} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: FONT.black }}>{title}</Text>
        {!!subtitle && <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function DetailItem({ icon, label, value, accent = COLORS.tech }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.sm + 4, marginBottom: SPACING.sm }}>
      <View style={{ width: 34, height: 34, borderRadius: RADIUS.sm, backgroundColor: `${accent}14`, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>{label}</Text>
        <Text style={{ color: COLORS.textPrimary, fontSize: FONT.md, fontWeight: FONT.bold, marginTop: 3, lineHeight: 21 }}>{String(value ?? "Not provided")}</Text>
      </View>
    </View>
  );
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

function ProofPhotoList({ photos = [] }) {
  const visiblePhotos = photos.filter((photo) => photo?.uri);
  if (visiblePhotos.length === 0) {
    return <Text style={{ color: COLORS.textSecondary }}>No photo submitted</Text>;
  }

  return (
    <View style={{ gap: SPACING.sm }}>
      {visiblePhotos.map((photo, index) => (
        <View key={`${photo.uri}-${index}`}>
          <Image
            source={{ uri: photo.uri }}
            style={{ width: "100%", height: 170, borderRadius: 12, backgroundColor: COLORS.border }}
            resizeMode="cover"
          />
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 4 }}>
            {photo.label || `Photo ${index + 1}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function TaskInformationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const scrollRef = React.useRef(null);
  const [task, setTask] = useState(null);
  const [unit, setUnit] = useState(null);
  const [requests, setRequests] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [detailPage, setDetailPage] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        setLoadError("");
        try {
          const loadedTask = await getTaskById(id);
          if (!loadedTask) {
            throw new Error("This work order is no longer available. Return to My Work Orders and refresh the list.");
          }
          const loadedUnit = loadedTask.unitId
            ? await getUnitByCode(loadedTask.unitId)
            : null;
          const loadedRequests = loadedTask.customerId
            ? await getServiceRequestsByUser(loadedTask.customerId)
            : [];
          const loadedLogs = loadedTask?.id ? await getServiceLogsByTask(loadedTask.id) : [];
          if (active) {
            setTask(loadedTask);
            setUnit(loadedUnit);
            setRequests(loadedRequests);
            setLogs(loadedLogs);
          }
        } catch (error) {
          if (active) setLoadError(error?.message || "Unable to load this work order.");
        } finally {
          if (active) setLoading(false);
        }
      }
      load();
      return () => {
        active = false;
      };
    }, [id]),
  );

  const assignedSerials = getTaskSerials(task);
  const proof = task?.proof || {};
  const registrationProgress = task?.registrationProgress;
  const registrationComplete =
    registrationProgress?.isComplete ?? assignedSerials.length === 0;
  const hasCheckedIn = Boolean(task?.checkIn?.checkedInAt);
  const nextAction = task?.status === TASK_STATUS.PENDING
    ? { title: "Awaiting Admin activation", subtitle: "Admin dispatches this work order when it is ready for your field work.", icon: "time-sharp", disabled: true }
    : task?.status === TASK_STATUS.IN_PROGRESS
      ? !hasCheckedIn
        ? { title: "Check in at installation", subtitle: "Record your GPS arrival before verifying the assigned AC unit.", icon: "location-sharp", action: "check-in" }
        : registrationComplete
        ? { title: "Capture photo and complete", subtitle: "The assigned QR is verified. Capture one installed-unit photo to close this work order.", href: `/technician/task/${id}/complete-service`, icon: "checkmark-circle-sharp" }
        : { title: "Verify assigned AC unit", subtitle: "Scan and register the assigned QR serial before submitting proof.", href: `/technician/task/${id}/amp-registration`, icon: "qr-code-sharp" }
      : null;

  const runWorkOrderAction = async () => {
    if (actionBusy || !task || nextAction?.action !== "check-in") return;
    setActionBusy(true);
    try {
      const location = await getCurrentLocationSnapshot();
      const updated = await checkInTask(id, location);
      setTask(updated);
      Alert.alert("Arrival recorded", "Your GPS check-in was recorded. You can now verify the assigned AC unit.");
    } catch (error) {
      Alert.alert("Unable to check in", error?.message || "Please check location permissions and try again.");
    } finally {
      setActionBusy(false);
    }
  };

  const changePage = (nextPage) => {
    const safePage = Math.max(0, Math.min(DETAIL_PAGES.length - 1, nextPage));
    setDetailPage(safePage);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          padding: SPACING.md,
          paddingBottom: 96,
        }}
      >
        <PageHeader
          title="Work Order Details"
          subtitle={task?.title || task?.issueType || `Work Order #${String(id).slice(0, 8)}`}
          color={COLORS.tech}
          onBack={() => router.back()}
        />

        {loading && !task ? (
          <Card>
            <Text style={{ color: COLORS.textSecondary }}>Loading work order details…</Text>
          </Card>
        ) : null}

        {loadError ? (
          <Card>
            <Text style={{ color: COLORS.danger, fontWeight: FONT.bold }}>{loadError}</Text>
            <TechButton
              title="Back to Work Orders"
              onPress={() => router.replace("/technician/tasks")}
              style={{ marginTop: SPACING.md }}
            />
          </Card>
        ) : null}

        {!task || loadError ? null : <>
          <View style={{ backgroundColor: COLORS.tech, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md, overflow: "hidden" }}>
            <View style={{ position: "absolute", width: 132, height: 132, borderRadius: 66, right: -34, top: -54, backgroundColor: "rgba(255,255,255,0.12)" }} />
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ width: 50, height: 50, borderRadius: RADIUS.lg, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
                <Ionicons name="document-text-sharp" size={27} color={COLORS.surface} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#BAE6FD", fontSize: FONT.sm, fontWeight: FONT.bold }}>WORK ORDER</Text>
                <Text style={{ color: COLORS.surface, fontSize: FONT.xl, fontWeight: FONT.black, marginTop: 2 }}>{task?.taskCode || task?.orderCode || `#${String(id).slice(0, 8)}`}</Text>
                <Text style={{ color: "#E0F2FE", marginTop: 4, lineHeight: 20 }}>{task?.title || task?.issueType || "Assigned field service"}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: SPACING.md }}>
              <StatusChip label={String(task?.status || "Unknown").replace(/[-_]/g, " ")} color={statusColor(task?.status)} tone="solid" />
              <Text style={{ color: "#E0F2FE", fontSize: FONT.sm }}>{detailPage + 1} of {DETAIL_PAGES.length}</Text>
            </View>
          </View>

          <Card style={{ padding: SPACING.xs, marginBottom: SPACING.md }}>
            <View style={{ flexDirection: "row" }}>
              {DETAIL_PAGES.map((page, index) => {
                const selected = detailPage === index;
                return (
                  <TouchableOpacity
                    key={page.label}
                    onPress={() => changePage(index)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={{ flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", borderRadius: RADIUS.md, backgroundColor: selected ? COLORS.tech : "transparent", paddingHorizontal: 2 }}
                  >
                    <Ionicons name={page.icon} size={19} color={selected ? COLORS.surface : COLORS.textMuted} />
                    <Text numberOfLines={1} style={{ color: selected ? COLORS.surface : COLORS.textSecondary, fontSize: 11, fontWeight: selected ? FONT.black : FONT.bold, marginTop: 4 }}>{page.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {detailPage === 0 ? <>
            <Card>
              <SectionHeading icon="person-sharp" title="Customer & Schedule" subtitle="Essential visit details" />
              <DetailItem icon="person-circle-sharp" label="Customer" value={task?.customerName || "Unknown"} />
              <DetailItem icon="location-sharp" label="Delivery / Service Address" value={task?.address || "Not provided"} />
              <DetailItem icon="calendar-sharp" label="Schedule" value={task?.scheduledDate || "Unscheduled"} accent={COLORS.warning} />
              <DetailItem icon="chatbox-ellipses-sharp" label="Service Concern" value={task?.description || task?.concern || "None"} />
            </Card>

            {nextAction ? (
              <Card style={{ borderColor: nextAction.disabled ? COLORS.warning : COLORS.tech, backgroundColor: nextAction.disabled ? COLORS.warningLight : COLORS.techLight }}>
                <SectionHeading icon={nextAction.icon} title="Next Action" subtitle="Continue this work order" />
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.md }}>{nextAction.title}</Text>
                <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: 4 }}>{nextAction.subtitle}</Text>
                {!nextAction.disabled ? <TechButton title={actionBusy ? "Recording arrival..." : nextAction.title} loading={actionBusy} onPress={() => nextAction.href ? router.push(nextAction.href) : runWorkOrderAction()} style={{ marginTop: SPACING.md }} leftIcon={<Ionicons name={nextAction.icon} size={17} color={COLORS.surface} />} /> : null}
              </Card>
            ) : null}

            {assignedSerials.length > 0 ? (
              <Card>
                <SectionHeading icon="analytics-sharp" title="Installation Progress" subtitle="Assigned QR verification" />
                <DetailItem icon="checkmark-done-sharp" label="Registered Units" value={`${registrationProgress?.totalRegistered || 0} of ${registrationProgress?.totalRequired || assignedSerials.length}`} accent={registrationComplete ? COLORS.success : COLORS.warning} />
                <DetailItem icon="qr-code-sharp" label="Serial Numbers" value={assignedSerials.join(", ")} />
                <DetailItem icon="navigate-sharp" label="Next Step" value={registrationComplete ? "Capture one installed-unit photo to complete the work order." : "Scan each assigned AC unit QR before completing the installation."} />
              </Card>
            ) : null}
          </> : null}

          {detailPage === 1 ? (
            <Card>
              <SectionHeading icon="snow-sharp" title="AC Unit Details" subtitle="Equipment assigned to this work order" />
              <DetailItem icon="cube-sharp" label="AC Unit" value={unit?.unitName || task?.unitName || "Unassigned"} />
              <DetailItem icon="pricetag-sharp" label="Brand / Model" value={[unit?.brand, unit?.model].filter(Boolean).join(" / ") || "Not provided"} />
              <DetailItem icon="barcode-sharp" label="Serial" value={unit?.serialNumber || assignedSerials.join(", ") || "Not provided"} />
              <DetailItem icon="shield-checkmark-sharp" label="Warranty Status" value={unit?.installationDate ? "Check purchase date and warranty terms" : "Unknown"} accent={COLORS.success} />
              {unit?.bestServicedBy ? <DetailItem icon="calendar-number-sharp" label="Suggested Servicing Date" value={`${new Date(unit.bestServicedBy).toLocaleDateString()} · ${String(unit.recommendedService || "regular_cleaning").replace(/_/g, " ")}`} accent={COLORS.warning} /> : null}
            </Card>
          ) : null}

          {detailPage === 2 ? <>
            <Card>
              <SectionHeading icon="document-text-sharp" title="Service Report" subtitle="Recorded findings and resolution" />
              <DetailItem icon="eye-sharp" label="Before" value={task?.beforeCondition || "No report yet"} />
              <DetailItem icon="search-sharp" label="Findings" value={task?.findings || "No findings yet"} accent={COLORS.warning} />
              <DetailItem icon="checkmark-circle-sharp" label="Resolution" value={task?.resolution || "No resolution yet"} accent={COLORS.success} />
              <DetailItem icon="cash-sharp" label="Total Cost" value={money(task?.totalServiceCost)} accent={COLORS.success} />
            </Card>
            <Card>
              <SectionHeading icon="time-sharp" title="Service History" subtitle={`${logs.length} service note(s) · ${requests.length} related request(s)`} />
              {!task?.unitId ? <Text style={{ color: COLORS.textSecondary }}>No linked AC unit is available for service notes.</Text> : null}
              <View style={{ gap: SPACING.sm }}>
                {!!task?.unitId ? <TechButton title="View Service Notes" onPress={() => router.push(`/technician/task/${task.id}/unit/log/select`)} size="sm" leftIcon={<Ionicons name="reader-sharp" size={17} color={COLORS.surface} />} /> : null}
                {[TASK_STATUS.INSTALLING, TASK_STATUS.IN_PROGRESS].includes(task?.status) && !!task?.unitId ? <TechButton title="Add Service Note" onPress={() => router.push(`/technician/task/${task.id}/unit/log/insert`)} size="sm" variant="secondary" leftIcon={<Ionicons name="add-circle-sharp" size={17} color={COLORS.tech} />} /> : null}
              </View>
            </Card>
          </> : null}

          {detailPage === 3 ? (
            <Card>
              <SectionHeading icon="camera-sharp" title="Service Proof" subtitle="Submitted work confirmation" />
              <DetailItem icon="person-sharp" label="Order Customer" value={proof.customer?.name || task?.customerName || task?.customer || "Not provided"} />
              <DetailItem icon="construct-sharp" label="Submitted By" value={proof.technicianName || task?.assignedTechnicianName || "Technician"} />
              <DetailItem icon="time-sharp" label="Submitted At" value={proof.submittedAt || task?.proofSubmittedAt || "Not submitted"} />
              <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, marginTop: SPACING.sm, marginBottom: SPACING.xs }}>Before Photo</Text>
              <ProofPhotoList photos={proof.beforePhotos || []} />
              <View style={{ height: SPACING.md }} />
              <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, marginBottom: SPACING.xs }}>After Photo</Text>
              <ProofPhotoList photos={proof.afterPhotos || []} />
            </Card>
          ) : null}

          <Card style={{ padding: SPACING.sm + 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
              <TouchableOpacity disabled={detailPage === 0} onPress={() => changePage(detailPage - 1)} style={{ flex: 1, minHeight: 44, borderRadius: RADIUS.md, borderWidth: 1, borderColor: detailPage === 0 ? COLORS.border : COLORS.tech, alignItems: "center", justifyContent: "center", opacity: detailPage === 0 ? 0.45 : 1 }}>
                <Text style={{ color: detailPage === 0 ? COLORS.textMuted : COLORS.tech, fontWeight: FONT.black }}>Previous</Text>
              </TouchableOpacity>
              <View style={{ alignItems: "center", minWidth: 64 }}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black }}>{detailPage + 1} / {DETAIL_PAGES.length}</Text>
                <View style={{ flexDirection: "row", gap: 4, marginTop: 5 }}>
                  {DETAIL_PAGES.map((page, index) => <View key={page.label} style={{ width: index === detailPage ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: index === detailPage ? COLORS.tech : COLORS.borderInput }} />)}
                </View>
              </View>
              <TouchableOpacity disabled={detailPage === DETAIL_PAGES.length - 1} onPress={() => changePage(detailPage + 1)} style={{ flex: 1, minHeight: 44, borderRadius: RADIUS.md, backgroundColor: detailPage === DETAIL_PAGES.length - 1 ? COLORS.border : COLORS.tech, alignItems: "center", justifyContent: "center", opacity: detailPage === DETAIL_PAGES.length - 1 ? 0.55 : 1 }}>
                <Text style={{ color: detailPage === DETAIL_PAGES.length - 1 ? COLORS.textMuted : COLORS.surface, fontWeight: FONT.black }}>Next</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
