import Ionicons from "@expo/vector-icons/Ionicons";
import ServicePaymentCard from "../../../../components/technician/ServicePaymentCard";
import ServiceCostSummary from "../../../../components/technician/ServiceCostSummary";
import MaintenanceDecisionCard from "../../../../components/technician/MaintenanceDecisionCard";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { startLiveRefresh } from "../../../../services/liveRefresh";
import React, { useState } from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { scrollToAssessmentPager } from "../../../../services/technicianAssessmentScroll";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../components/technician/TechButton";
import ProofPhotoList from "../../../../components/technician/ProofPhotoList";
import WorkOrderPager from "../../../../components/technician/WorkOrderPager";
import Card from "../../../../components/ui/Card";
import PageHeader from "../../../../components/ui/PageHeader";
import StatusChip from "../../../../components/ui/StatusChip";
import { COLORS, FONT, RADIUS, SPACING } from "../../../../constants/theme";
import { checkInTask, confirmCodCollection, confirmInstallationArrival, getTaskById, getVisitAttempt, TASK_STATUS } from "../../../../services/taskStorage";
import { getCurrentLocationSnapshot } from "../../../../services/locationService";
import { getServiceLogsByTask } from "../../../../services/unitServiceLogStorage";
import { formatWarrantyStatus, getInstallationWorkflowState, isInstallationWorkOrder } from "../../../../services/technicianTaskLogic";
import { confirmAction } from "../../../../utils/confirmAction";
import { useInterfaceLanguage } from "../../../../hooks/useInterfaceLanguage";
import { workOrderStatusPresentation } from "../../../../services/technicianWorkOrderPresentation";

function money(value) {
  return `PHP ${Number(value || 0).toFixed(2)}`;
}

function checkInMapUrl(checkIn = {}) {
  const latitude = Number(checkIn?.latitude);
  const longitude = Number(checkIn?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

const WORK_ORDER_PAGES = {
  installation: [
    { key: "overview", label: "Overview", icon: "clipboard-sharp" },
    { key: "unit", label: "AC Unit", icon: "snow-sharp" },
    { key: "proof", label: "Proof", icon: "camera-sharp" },
  ],
  service: [
    { key: "overview", label: "Overview", icon: "clipboard-sharp" },
    { key: "unit", label: "AC Unit", icon: "snow-sharp" },
    { key: "service", label: "Service", icon: "construct-sharp" },
    { key: "proof", label: "Proof", icon: "camera-sharp" },
  ],
};

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

function DetailItem({ icon, label, value, accent = COLORS.tech, emphasis = false }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", backgroundColor: emphasis ? accent === COLORS.warning ? COLORS.warningLight : COLORS.techLight : COLORS.surfaceAlt, borderWidth: 1, borderColor: emphasis ? `${accent}66` : COLORS.border, borderRadius: RADIUS.md, padding: emphasis ? SPACING.md : SPACING.sm + 4, marginBottom: SPACING.sm }}>
      <View style={{ width: 34, height: 34, borderRadius: RADIUS.sm, backgroundColor: `${accent}14`, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: emphasis ? accent : COLORS.textSecondary, fontSize: FONT.sm, fontWeight: FONT.bold }}>{label}</Text>
        <Text style={{ color: COLORS.textPrimary, fontSize: emphasis ? FONT.lg : FONT.md, fontWeight: FONT.bold, marginTop: 3, lineHeight: emphasis ? 25 : 21 }}>{String(value ?? "Not provided")}</Text>
      </View>
    </View>
  );
}

function InstallationTimeline({ pages, currentPage, workflowPage, finished, onChange }) {
  const { language, t } = useInterfaceLanguage();
  return (
    <Card style={{ marginBottom: SPACING.md }}>
      <Text style={{ color: COLORS.textPrimary, fontSize: FONT.md, fontWeight: FONT.black }}>
        {t("Installation details")}
      </Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 3 }}>
        {t("Complete each stage in order. The highlighted stage is the next work to perform.")}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: SPACING.md }}>
        {pages.map((page, index) => {
          const viewed = currentPage === index;
          const current = !finished && workflowPage === index;
          const passed = finished || index < workflowPage;
          const lineComplete = finished || index < workflowPage;
          return (
            <View key={page.key} style={{ flex: 1, alignItems: "center" }}>
              {index < pages.length - 1 ? (
                <View
                  style={{
                    position: "absolute",
                    top: 19,
                    left: "50%",
                    right: "-50%",
                    height: 3,
                    backgroundColor: lineComplete ? COLORS.success : COLORS.borderInput,
                  }}
                />
              ) : null}
              <TouchableOpacity
                onPress={() => onChange(index)}
                accessibilityRole="button"
                accessibilityLabel={language === "Filipino" ? `Mga detalye ng installation: Hakbang ${index + 1}, ${t(page.label)}` : `Installation details: Step ${index + 1}, ${page.label}`}
                accessibilityState={{ selected: viewed }}
                style={{ alignItems: "center", width: "100%", minHeight: 84, zIndex: 1 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: passed ? COLORS.success : current || viewed ? COLORS.tech : COLORS.borderInput,
                    backgroundColor: passed ? COLORS.success : current ? COLORS.tech : COLORS.surface,
                  }}
                >
                  <Ionicons
                    name={passed ? "checkmark-sharp" : page.icon}
                    size={18}
                    color={passed || current ? COLORS.surface : viewed ? COLORS.tech : COLORS.textMuted}
                  />
                </View>
                <Text style={{ color: passed ? COLORS.success : current ? COLORS.tech : COLORS.textMuted, fontSize: 10, fontWeight: FONT.bold, marginTop: 7 }}>
                  {passed ? t("DONE") : current ? t("CURRENT") : language === "Filipino" ? `HAKBANG ${index + 1}` : `STEP ${index + 1}`}
                </Text>
                <Text
                  numberOfLines={2}
                  style={{ color: viewed || current ? COLORS.tech : COLORS.textPrimary, fontSize: FONT.sm, fontWeight: viewed || current ? FONT.black : FONT.bold, marginTop: 2, textAlign: "center" }}
                >
                  {t(page.label)}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </Card>
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

export default function TaskInformationScreen() {
  const router = useRouter();
  const { language, t } = useInterfaceLanguage();
  const { id } = useLocalSearchParams();
  const scrollRef = React.useRef(null);
  const openingVisitAttempt = React.useRef(false);
  const [task, setTask] = useState(null);
  const [unit, setUnit] = useState(null);
  const [requests, setRequests] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [detailPage, setDetailPage] = useState(0);
  const [visitProof, setVisitProof] = useState(null);

  // A direct notification can replace the task ID without remounting this
  // screen. Always start each work order on its overview instead of retaining
  // the tab that happened to be open for the previous task.
  React.useEffect(() => {
    setDetailPage(0);
    openingVisitAttempt.current = false;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      async function load({ background }) {
        if (!background) setLoading(true);
        setLoadError("");
        try {
          const loadedTask = await getTaskById(id, { requireOnline: true });
          if (!loadedTask) {
            throw new Error("This work order is no longer available. Return to My Work Orders and refresh the list.");
          }
          const loadedUnit = loadedTask.unit || null;
          const loadedRequests = loadedTask.requestId ? [{ id: loadedTask.requestId }] : [];
          const loadedLogs = !isInstallationWorkOrder(loadedTask) && loadedTask?.id
            ? await getServiceLogsByTask(loadedTask.id)
            : [];
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
      const stop = startLiveRefresh(load);
      return () => {
        active = false;
        stop();
      };
    }, [id]),
  );

  const assignedSerials = getTaskSerials(task);
  const proof = task?.proof || {};
  const registrationProgress = task?.registrationProgress;
  const installationTask = isInstallationWorkOrder(task);
  const detailPages = installationTask ? WORK_ORDER_PAGES.installation : WORK_ORDER_PAGES.service;
  const activePage = detailPages[detailPage] || detailPages[0];
  const registrationComplete =
    registrationProgress?.isComplete ?? assignedSerials.length === 0;
  const hasCheckedIn = Boolean(task?.checkIn?.checkedInAt);
  const customerPresenceConfirmed = Boolean(
    task?.arrivalValidation?.customerPresent &&
    task?.arrivalValidation?.checkedInAt === task?.checkIn?.checkedInAt,
  );
  const installationWorkflow = getInstallationWorkflowState(task);
  const installationFinished = installationWorkflow.finished;
  const installationWorkflowPage = installationWorkflow.step;
  React.useEffect(() => {
    let active = true;
    setVisitProof(null);
    if (task?.visitAttempt?.id) getVisitAttempt(id).then(attempt => { if (active) setVisitProof(attempt); }).catch(() => {});
    return () => { active = false; };
  }, [id, task?.visitAttempt?.id, task?.visitAttempt?.awaitingAdmin]);
  React.useEffect(() => {
    if (detailPage >= detailPages.length) setDetailPage(detailPages.length - 1);
  }, [detailPage, detailPages.length]);
  const installationNextAction = task?.codPayment && !task.codPayment.collectedAt
    ? { stage: "overview", title: "Confirm cash collected", subtitle: "Record the customer's full COD payment after receiving it.", icon: "cash-sharp", action: "cash" }
    : registrationComplete
      ? { stage: "proof", title: "Capture photo and complete", subtitle: "The assigned AC unit is verified. Capture one installed-unit photo to close this work order.", href: `/technician/task/${id}/complete-service`, icon: "checkmark-circle-sharp" }
      : { stage: "unit", title: "Verify assigned AC unit", subtitle: "Scan the assigned QR or enter its serial number before submitting proof.", href: `/technician/task/${id}/amp-registration`, icon: "qr-code-sharp" };
  const activeFieldStatus = [TASK_STATUS.IN_PROGRESS, TASK_STATUS.INSTALLING].includes(task?.status);
  const hasSavedServiceReport = Array.isArray(task?.serviceLogs) && task.serviceLogs.length > 0;
  const primaryNextAction = task?.visitAttempt?.awaitingAdmin
    ? { stage: "overview", title: 'Awaiting Admin follow-up', subtitle: 'This visit attempt is closed. Admin will contact the customer and confirm the next visit. The request is still open.', icon: 'time-sharp', disabled: true }
    : task?.status === TASK_STATUS.PENDING
    ? installationTask
      ? { stage: "overview", title: "Awaiting Admin dispatch", subtitle: "Admin must dispatch this installation order before field work can begin.", icon: "time-sharp", disabled: true }
      : { stage: "overview", title: "Awaiting Admin activation", subtitle: "Admin must activate this service work order before field work can begin.", icon: "time-sharp", disabled: true }
    : installationTask && activeFieldStatus
      ? !hasCheckedIn
        ? { stage: "overview", title: "Check in at installation", subtitle: "Record your GPS arrival before verifying the assigned AC unit.", icon: "location-sharp", action: "check-in" }
        : !customerPresenceConfirmed
          ? { stage: "overview", title: "Confirm customer presence", subtitle: "Validate whether the customer is present before installation can begin.", icon: "person-sharp", action: "validate-arrival" }
        : task?.codPayment && !task.codPayment.collectedAt
          ? { stage: "overview", title: "Confirm cash collected", subtitle: "Record the customer's full COD payment after receiving it.", icon: "cash-sharp", action: "cash" }
        : installationNextAction
    : !installationTask && task?.status === TASK_STATUS.IN_PROGRESS
      ? !hasCheckedIn
        ? { stage: "overview", title: "Check in at service address", subtitle: "Record your GPS arrival before completing the maintenance work.", icon: "location-sharp", action: "check-in" }
        : task?.codPayment && !task.codPayment.collectedAt
          ? { stage: "overview", title: "Confirm cash collected", subtitle: "Record the customer's full COD payment after receiving it.", icon: "cash-sharp", action: "cash" }
          : !hasSavedServiceReport
            ? { stage: "service", title: "Add service note and final costs", subtitle: "Save the technician findings, work performed, labor, and parts before collecting payment.", href: `/technician/task/${id}/unit/log/insert`, icon: "document-text-sharp" }
            : { stage: "proof", title: "Confirm payment and complete", subtitle: "The service note is saved. Confirm the exact cash payment, capture proof, and complete the visit.", href: `/technician/task/${id}/complete-service`, icon: "checkmark-circle-sharp" }
      : null;
  const nextAction = primaryNextAction;

  const runWorkOrderAction = async () => {
    if (!actionBusy && nextAction?.action === "cash") { confirmCash(); return; }
    if (!actionBusy && nextAction?.action === "validate-arrival") { confirmPresence(); return; }
    if (actionBusy || !task || nextAction?.action !== "check-in") return;
    setActionBusy(true);
    try {
      const location = await getCurrentLocationSnapshot();
      await checkInTask(id, location);
      const updated = await getTaskById(id, { requireOnline: true });
      setTask(updated);
      if (!installationTask) {
        const servicePageIndex = detailPages.findIndex((page) => page.key === "service");
        if (servicePageIndex >= 0) changePage(servicePageIndex);
      }
      Alert.alert(t("Arrival recorded"), t(installationTask ? "Your GPS check-in was recorded. Confirm whether the customer is present before installation." : "Your GPS check-in was recorded. You can now complete the service report."));
    } catch (error) {
      Alert.alert(t("Unable to check in"), t(error?.message || "Please check location permissions and try again."));
    } finally {
      setActionBusy(false);
    }
  };

  const confirmPresence = () => Alert.alert(
    t("Is the customer present?"),
    t("Installation can begin only after confirming that someone is available at the address."),
    [
      { text: t("Nobody is present"), style: "destructive", onPress: () => {
        if (openingVisitAttempt.current) return;
        openingVisitAttempt.current = true;
        router.replace(`/technician/task/${id}/visit-attempt`);
      } },
      { text: t("Customer is present"), onPress: async () => {
        if (actionBusy) return;
        setActionBusy(true);
        try {
          const updated = await confirmInstallationArrival(id);
          setTask(updated);
          Alert.alert(t("Installation validated"), t("Customer presence is recorded. You may now continue the installation."));
        } catch (error) {
          Alert.alert(t("Unable to validate arrival"), t(error?.message || "Please try again."));
        } finally { setActionBusy(false); }
      } },
    ],
  );

  const changePage = (nextPage) => {
    const safePage = Math.max(0, Math.min(detailPages.length - 1, nextPage));
    setDetailPage(safePage);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  const scrollToAssessmentPage = (pager) => {
    requestAnimationFrame(() => {
      scrollToAssessmentPager(scrollRef.current, pager, SPACING.sm);
    });
  };

  const confirmCash = () => confirmAction({
    title: t("Confirm Cash Received"),
    message: language === "Filipino" ? `Natanggap mo na ba ang buong ${money(task?.codPayment?.amount)} mula sa customer? Kumpirmahin lamang pagkatapos makolekta ang cash.` : `Have you received the full ${money(task?.codPayment?.amount)} from the customer? Only confirm after collecting the cash.`,
    cancelText: t("Not yet"),
    confirmText: t("Cash Received"),
    pendingText: t("Recording..."),
    onConfirm: async () => {
      if (actionBusy) return;
      setActionBusy(true);
      try {
        const updated = await confirmCodCollection(id);
        setTask(updated);
        Alert.alert(t("Payment recorded"), t("Cash collection is now visible on the order and receipt."));
      } catch (error) {
        Alert.alert(t("Unable to confirm payment"), t(error?.message || "Please try again."));
      } finally { setActionBusy(false); }
    },
  });

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          padding: SPACING.md,
          paddingBottom: SPACING.md,
        }}
      >
        <PageHeader
          title={t("Work Order Details")}
          subtitle={task?.title || task?.issueType || `Work Order #${String(id).slice(0, 8)}`}
          color={COLORS.tech}
          onBack={() => router.back()}
        />

        {loading && !task ? (
          <Card>
            <Text style={{ color: COLORS.textSecondary }}>{t("Loading work order details…")}</Text>
          </Card>
        ) : null}

        {loadError ? (
          <Card>
            <Text style={{ color: COLORS.danger, fontWeight: FONT.bold }}>{t(loadError)}</Text>
            <TechButton
              title={t("Back to Work Orders")}
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
                <Text style={{ color: "#BAE6FD", fontSize: FONT.sm, fontWeight: FONT.bold }}>{t("WORK ORDER")}</Text>
                <Text style={{ color: COLORS.surface, fontSize: FONT.xl, fontWeight: FONT.black, marginTop: 2 }}>{task?.taskCode || task?.orderCode || `#${String(id).slice(0, 8)}`}</Text>
                <Text style={{ color: "#E0F2FE", marginTop: 4, lineHeight: 20 }}>{task?.title || task?.issueType || t("Assigned field service")}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: SPACING.md }}>
              <StatusChip label={t(workOrderStatusPresentation(task?.status).label)} color={workOrderStatusPresentation(task?.status).color} tone="solid" />
              <Text style={{ color: "#E0F2FE", fontSize: FONT.sm }}>{detailPage + 1} {language === "Filipino" ? "sa" : "of"} {detailPages.length}</Text>
            </View>
          </View>

          {installationTask ? (
            <InstallationTimeline
              pages={detailPages}
              currentPage={detailPage}
              workflowPage={installationWorkflowPage}
              finished={installationFinished}
              onChange={changePage}
            />
          ) : (
            <Card style={{ padding: SPACING.xs, marginBottom: SPACING.md }}>
              <View style={{ flexDirection: "row" }}>
                {detailPages.map((page, index) => {
                  const selected = detailPage === index;
                  return (
                    <TouchableOpacity
                      key={page.key}
                      onPress={() => changePage(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t("Step")} ${index + 1}: ${t(page.label)}`}
                      accessibilityState={{ selected }}
                      style={{ flex: 1, minWidth: 0, minHeight: 64, alignItems: "center", justifyContent: "center", borderRadius: RADIUS.md, backgroundColor: selected ? COLORS.tech : "transparent", paddingHorizontal: SPACING.xs }}
                    >
                      <Ionicons name={page.icon} size={19} color={selected ? COLORS.surface : COLORS.textMuted} />
                      <Text numberOfLines={2} style={{ color: selected ? COLORS.surface : COLORS.textSecondary, fontSize: 11, fontWeight: selected ? FONT.black : FONT.bold, marginTop: 4, textAlign: "center" }}>{t(page.label)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>
          )}

          {nextAction && activePage.key === nextAction.stage ? (
            <Card style={{ borderColor: nextAction.disabled ? COLORS.warning : COLORS.tech, backgroundColor: nextAction.disabled ? COLORS.warningLight : COLORS.techLight }}>
              <SectionHeading icon={nextAction.icon} title={t("Next Action")} subtitle={`${t(activePage.label)} ${t("stage")}`} />
              <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.md }}>{t(nextAction.title)}</Text>
              <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: 4 }}>{t(nextAction.subtitle)}</Text>
              {!nextAction.disabled ? <TechButton title={t(actionBusy ? "Saving..." : nextAction.title)} loading={actionBusy} onPress={() => nextAction.href ? router.push(nextAction.href) : runWorkOrderAction()} style={{ marginTop: SPACING.md }} leftIcon={<Ionicons name={nextAction.icon} size={17} color={COLORS.surface} />} /> : null}
            </Card>
          ) : null}

          {activePage.key === "proof" && task?.visitAttempt?.id ? <Card>
            <SectionHeading icon="time-sharp" title={t("Unattended visit")} subtitle={t(task.visitAttempt.awaitingAdmin ? 'Awaiting Admin follow-up' : 'Previous attempt — next visit confirmed')} />
            <Text style={{ color: COLORS.textPrimary, lineHeight: 21 }}>{task.visitAttempt.note}</Text>
            <Text style={{ color: COLORS.textSecondary, marginVertical: SPACING.sm }}>{new Date(task.visitAttempt.submittedAt).toLocaleString()}</Text>
            {visitProof?.photo?.uri ? <ProofPhotoList photos={[{ uri: visitProof.photo.uri, label: t('Visit attempt proof') }]} /> : <TechButton title={t("Load visit proof")} variant="secondary" onPress={async () => {
              try { setVisitProof(await getVisitAttempt(id)); } catch (error) { Alert.alert(t('Unable to load proof'), t(error.message)); }
            }} />}
          </Card> : null}
          {activePage.key === "overview" ? <>
            <Card>
              <SectionHeading icon="person-sharp" title={t("Customer & Schedule")} subtitle={t("Essential visit details")} />
              <DetailItem icon="calendar-sharp" label={t("Schedule")} value={[task?.scheduledDate, task?.timeSlot].filter(Boolean).join(" · ") || t("Unscheduled")} accent={COLORS.warning} emphasis />
              <DetailItem icon="location-sharp" label={t("Delivery / Service Address")} value={task?.address || t("Not provided")} emphasis />
              <DetailItem icon="person-circle-sharp" label={t("Customer")} value={task?.customerName || t("Unknown")} />
              <DetailItem icon="call-sharp" label={t("Customer Contact")} value={task?.customerPhone || t("Not recorded")} />
              <DetailItem icon="person-sharp" label={t("Assigned Technician")} value={task?.assignedTechnicianName || t("Not recorded")} />
              {task?.schedule?.driverName && task.schedule.driverName !== task?.assignedTechnicianName ? <DetailItem icon="car-sharp" label={t("Driver")} value={task.schedule.driverName} /> : null}
              {task?.schedule?.notes ? <DetailItem icon="reader-sharp" label={t("Admin Schedule Note")} value={task.schedule.notes} accent={COLORS.warning} /> : null}
              <DetailItem icon="chatbox-ellipses-sharp" label={t(installationTask ? "Installation Details" : "Service Concern")} value={task?.description || task?.concern || t(installationTask ? "No special instructions" : "None")} />
            </Card>

            {!installationTask ? <ServicePaymentCard task={task} onUpdated={setTask} /> : null}
            {!installationTask && hasCheckedIn && task?.status === TASK_STATUS.IN_PROGRESS && !task?.visitAttempt?.awaitingAdmin ? <Card>
              <SectionHeading icon="person-remove-sharp" title={t("No one available?")} subtitle={t("Record an unattended visit after arrival")} />
              <TechButton title={t("Close visit / request reschedule")} variant="secondary" onPress={() => router.push(`/technician/task/${id}/visit-attempt`)} />
            </Card> : null}
            {task?.codPayment ? <Card>
              <SectionHeading icon="cash-sharp" title={t("Cash on Delivery")} subtitle={t("Payment is confirmed by the collecting technician")} />
              <DetailItem icon="cash-sharp" label={t("Order total")} value={money(task.codPayment.amount)} />
              <Text>{t(task.codPayment.collectedAt ? "Cash collection confirmed" : hasCheckedIn ? "Confirm only after receiving the full cash payment." : "Check in at the customer location before confirming cash collection.")}</Text>
            </Card> : null}
            {installationTask && task?.orderPayment && String(task.orderPayment.method || '').toLowerCase() !== 'cod' ? <Card>
              <SectionHeading icon="card-sharp" title={t("Order payment")} subtitle={t("Payment status recorded on this installation ticket")} />
              <DetailItem icon="wallet-sharp" label={t("Method")} value={t(String(task.orderPayment.method || 'Online').replace(/\b\w/g, letter => letter.toUpperCase()))} />
              <DetailItem icon="checkmark-circle-sharp" label={t("Status")} value={t(task.orderPayment.paidAt || ['paid', 'verified', 'completed', 'succeeded'].includes(String(task.orderPayment.status || '').toLowerCase()) ? 'Paid' : String(task.orderPayment.status || 'pending').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()))} accent={task.orderPayment.paidAt || ['paid', 'verified', 'completed', 'succeeded'].includes(String(task.orderPayment.status || '').toLowerCase()) ? COLORS.success : COLORS.warning} />
              <DetailItem icon="cash-sharp" label={t("Amount")} value={money(task.orderPayment.amount)} />
            </Card> : null}

            {hasCheckedIn ? (
              <Card>
                <SectionHeading icon="location-sharp" title={t("GPS Arrival")} subtitle={t("Visible to the customer and branch administrators")} />
                <DetailItem icon="time-sharp" label={t("Checked In")} value={new Date(task.checkIn.checkedInAt).toLocaleString()} accent={COLORS.success} />
                <DetailItem icon="navigate-sharp" label={t("Coordinates")} value={`${Number(task.checkIn.latitude).toFixed(6)}, ${Number(task.checkIn.longitude).toFixed(6)}`} />
                {checkInMapUrl(task.checkIn) ? <TechButton title={t("Open check-in map")} variant="secondary" size="sm" onPress={() => Linking.openURL(checkInMapUrl(task.checkIn))} leftIcon={<Ionicons name="map-sharp" size={17} color={COLORS.tech} />} /> : null}
              </Card>
            ) : null}

          </> : null}

          {activePage.key === "unit" ? (<>
            {installationTask && assignedSerials.length > 0 ? (
              <Card>
                <SectionHeading icon="analytics-sharp" title={t("Installation Progress")} subtitle={t("Assigned AC unit verification")} />
                <DetailItem icon="checkmark-done-sharp" label={t("Registered Units")} value={`${registrationProgress?.totalRegistered || 0} ${language === "Filipino" ? "sa" : "of"} ${registrationProgress?.totalRequired || assignedSerials.length}`} accent={registrationComplete ? COLORS.success : COLORS.warning} />
                <DetailItem icon="qr-code-sharp" label={t("Serial Numbers")} value={assignedSerials.join(", ")} />
                <DetailItem icon="navigate-sharp" label={t("Next Step")} value={t(registrationComplete ? "Continue to Proof and capture the installed-unit photo." : "Scan each assigned QR or enter its serial number before continuing to Proof.")} />
              </Card>
            ) : null}
            <Card>
              <SectionHeading icon="snow-sharp" title={t("AC Unit Details")} subtitle={t("Equipment assigned to this work order")} />
              <DetailItem icon="cube-sharp" label={t("AC Unit")} value={unit?.unitName || task?.unitName || t("Unassigned")} />
              <DetailItem icon="pricetag-sharp" label={t("Brand / Model")} value={[unit?.brand, unit?.model].filter(Boolean).join(" / ") || t("Not provided")} />
              <DetailItem icon="barcode-sharp" label={t("Serial")} value={unit?.serialNumber || assignedSerials.join(", ") || t("Not provided")} />
              <DetailItem icon="speedometer-sharp" label={t("Horsepower")} value={Number(unit?.capacityHp || 0) > 0 ? `${Number(unit.capacityHp)} HP` : t("Not recorded")} />
              <DetailItem icon="resize-sharp" label={t("Room Size")} value={Number(unit?.roomSizeSqm || 0) > 0 ? `${Number(unit.roomSizeSqm)} m²` : t("Not recorded")} />
              <DetailItem icon="shield-checkmark-sharp" label={t("Warranty Status")} value={t(formatWarrantyStatus(unit?.warrantyStatus, { installationPending: installationTask && !unit?.installationDate }))} accent={COLORS.success} />
              {unit?.warrantyCoverage?.coverageSummary ? <DetailItem icon="document-text-sharp" label={t("Warranty Coverage")} value={unit.warrantyCoverage.coverageSummary} /> : null}
              {!installationTask && unit?.bestServicedBy ? <DetailItem icon="calendar-number-sharp" label={t("Suggested Servicing Date")} value={`${new Date(unit.bestServicedBy).toLocaleDateString()} · ${t(String(unit.recommendedService || "regular_cleaning").replace(/_/g, " "))}`} accent={COLORS.warning} /> : null}
            </Card>
          </>) : null}

          {activePage.key === "service" ? <>
            {!installationTask ? <MaintenanceDecisionCard taskId={task.id} requestId={task.requestId} completed={task.status === TASK_STATUS.COMPLETED} onPageChange={scrollToAssessmentPage} /> : null}
            <Card>
              <SectionHeading icon="document-text-sharp" title={t("Service Report")} subtitle={t("Recorded findings and resolution")} />
              <DetailItem icon="eye-sharp" label={t("Before")} value={task?.beforeCondition || t("No report yet")} />
              <DetailItem icon="search-sharp" label={t("Findings")} value={task?.findings || t("No findings yet")} accent={COLORS.warning} />
              <DetailItem icon="checkmark-circle-sharp" label={t("Resolution")} value={task?.resolution || t("No resolution yet")} accent={COLORS.success} />
              <ServiceCostSummary task={task} />
            </Card>
            <Card>
              <SectionHeading icon="time-sharp" title={t("Service History")} subtitle={language === "Filipino" ? `${logs.length} tala para sa work order na ito · ${requests.length} kaugnay na kahilingan` : `${logs.length} note(s) for this work order · ${requests.length} related request(s)`} />
              {!task?.unitId ? <Text style={{ color: COLORS.textSecondary }}>{t("No linked AC unit is available for service notes.")}</Text> : null}
              <View style={{ gap: SPACING.sm }}>
                {!!task?.unitId ? <TechButton title={t("View Service Notes")} onPress={() => router.push(`/technician/task/${task.id}/unit/log/select`)} size="sm" leftIcon={<Ionicons name="reader-sharp" size={17} color={COLORS.surface} />} /> : null}
                {[TASK_STATUS.INSTALLING, TASK_STATUS.IN_PROGRESS].includes(task?.status) && !!task?.unitId ? <TechButton title={t("Add Service Note")} onPress={() => router.push(`/technician/task/${task.id}/unit/log/insert`)} size="sm" variant="secondary" leftIcon={<Ionicons name="add-circle-sharp" size={17} color={COLORS.tech} />} /> : null}
              </View>
            </Card>
          </> : null}

          {activePage.key === "proof" ? (
            <Card>
              <SectionHeading icon="camera-sharp" title={t(installationTask ? "Installation proof" : "Service proof")} subtitle={t(proof.submittedAt ? "Saved work confirmation" : "Proof will appear after the visit is completed")} />
              <View style={{ flexDirection: 'row', gap: SPACING.md, borderBottomWidth: 1, borderColor: COLORS.border, paddingBottom: SPACING.md }}>
                <View style={{ flex: 1 }}><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>{t("Customer")}</Text><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold, marginTop: 4 }}>{proof.customer?.name || task?.customerName || task?.customer || t('Not provided')}</Text></View>
                <View style={{ flex: 1 }}><Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>{t(proof.submittedAt ? 'Submitted by' : 'Assigned technician')}</Text><Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold, marginTop: 4 }}>{proof.technicianName || task?.assignedTechnicianName || t('Technician')}</Text></View>
              </View>
              {proof.submittedAt || task?.proofSubmittedAt ? <Text style={{ color: COLORS.textSecondary, marginVertical: SPACING.sm }}>{t("Submitted")} {new Date(proof.submittedAt || task.proofSubmittedAt).toLocaleString()}</Text> : null}
              {(proof.afterPhotos || []).some(photo => photo?.uri) ? <>
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold, marginTop: SPACING.sm, marginBottom: SPACING.sm }}>{t(installationTask ? 'Installed AC photo' : 'After-service photo')}</Text>
                <ProofPhotoList photos={proof.afterPhotos || []} />
              </> : <View style={{ padding: SPACING.md, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, marginTop: SPACING.md }}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.bold }}>{t("No completed-work photo yet")}</Text>
                <Text style={{ color: COLORS.textSecondary, lineHeight: 20, marginTop: 5 }}>{t(task?.visitAttempt?.awaitingAdmin ? 'The unattended-visit photo above is proof of the attempt, not proof of completed service.' : installationTask ? 'Submit the installed-unit photo when completing the installation.' : 'Submit one after-service photo with the completed service report.')}</Text>
              </View>}
            </Card>
          ) : null}

          <WorkOrderPager pages={detailPages} currentPage={detailPage} onChange={changePage} />
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
