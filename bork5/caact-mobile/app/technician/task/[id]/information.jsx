import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TechButton from "../../../../components/technician/TechButton";
import Card from "../../../../components/ui/Card";
import InfoCard from "../../../../components/ui/InfoCard";
import PageHeader from "../../../../components/ui/PageHeader";
import { COLORS, FONT, SPACING } from "../../../../constants/theme";
import { calculateUnitHealthScore } from "../../../../services/acHealthScoreService";
import { getServiceRequestsByUser } from "../../../../services/serviceRequestStorage";
import { getTaskById, TASK_STATUS } from "../../../../services/taskStorage";
import { getUnitByCode } from "../../../../services/unitStorage";
import { getServiceLogsByUnit } from "../../../../services/unitServiceLogStorage";

function money(value) {
  return `PHP ${Number(value || 0).toFixed(2)}`;
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
  const [task, setTask] = useState(null);
  const [unit, setUnit] = useState(null);
  const [requests, setRequests] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
          const loadedLogs = loadedUnit?.id ? await getServiceLogsByUnit(loadedUnit.id) : [];
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

  const health = unit
    ? calculateUnitHealthScore({
        unit,
        requests: requests.filter(
          (request) =>
            String(request.unitId || "") === String(unit.id) ||
            String(request.unitName || "").toLowerCase() ===
              String(unit.unitName || "").toLowerCase(),
        ),
        tasks: task ? [task] : [],
      })
    : null;
  const assignedSerials = getTaskSerials(task);
  const proof = task?.proof || {};
  const registrationProgress = task?.registrationProgress;
  const registrationComplete =
    registrationProgress?.isComplete ?? assignedSerials.length === 0;
  const nextAction = task?.status === TASK_STATUS.IN_PROGRESS
    ? registrationComplete
      ? { title: "Submit proof and complete", subtitle: "Capture the installed unit and collect receiver sign-off.", href: `/technician/task/${id}/complete-service`, icon: "checkmark-circle-sharp" }
      : { title: "Continue AMP registration", subtitle: "Register the remaining assigned QR serials before closing this work order.", href: `/technician/task/${id}/amp-registration`, icon: "qr-code-sharp" }
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
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

        <Card>
          <InfoCard label="Status" value={task?.status || "Unknown"} />
          <InfoCard label="Customer" value={task?.customerName || "Unknown"} />
          <InfoCard label="Address" value={task?.address || "Not provided"} />
          <InfoCard label="Schedule" value={task?.scheduledDate || "Unscheduled"} />
          <InfoCard label="Service Concern" value={task?.description || task?.concern || "None"} />
        </Card>

        {nextAction ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.techLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm }}>
                <Ionicons name={nextAction.icon} size={21} color={COLORS.tech} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, fontSize: FONT.md }}>{nextAction.title}</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 }}>{nextAction.subtitle}</Text>
              </View>
            </View>
            <TechButton title={nextAction.title} onPress={() => router.push(nextAction.href)} style={{ marginTop: SPACING.sm }} leftIcon={<Ionicons name={nextAction.icon} size={17} color={COLORS.surface} />} />
          </Card>
        ) : null}

        {assignedSerials.length > 0 && (
          <Card>
            <Text
              style={{
                color: COLORS.textPrimary,
                fontWeight: FONT.black,
                fontSize: FONT.lg,
                marginBottom: SPACING.sm,
              }}
            >
              Installation progress
            </Text>
            <InfoCard
              label="Assigned QR labels"
              value={`${registrationProgress?.totalRegistered || 0} of ${registrationProgress?.totalRequired || assignedSerials.length} registered`}
            />
            <InfoCard label="Serial numbers" value={assignedSerials.join(", ")} />
            <InfoCard
              label="Next step"
              value={registrationComplete ? "Submit the installation report and customer sign-off." : "Register each assigned unit before completing the installation."}
            />
          </Card>
        )}

        <Card>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontWeight: FONT.black,
              fontSize: FONT.lg,
              marginBottom: SPACING.sm,
            }}
          >
            AC Unit Details
          </Text>
          <InfoCard label="AC Unit" value={unit?.unitName || task?.unitName || "Unassigned"} />
          <InfoCard label="Brand / Model" value={[unit?.brand, unit?.model].filter(Boolean).join(" / ") || "Not provided"} />
          <InfoCard label="Serial" value={unit?.serialNumber || assignedSerials.join(", ") || "Not provided"} />
          <InfoCard label="Warranty Status" value={unit?.installationDate ? "Check purchase date and warranty terms" : "Unknown"} />
          {health && (
            <InfoCard
              label="Maintenance Status"
              value={`${health.score} - ${health.label}. ${health.recommendation}`}
            />
          )}
        </Card>

        <Card>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontWeight: FONT.black,
              fontSize: FONT.lg,
              marginBottom: SPACING.sm,
            }}
          >
            Service Report
          </Text>
          <InfoCard label="Before" value={task?.beforeCondition || "No report yet"} />
          <InfoCard label="Findings" value={task?.findings || "No findings yet"} />
          <InfoCard label="Resolution" value={task?.resolution || "No resolution yet"} />
          <InfoCard label="Total Cost" value={money(task?.totalServiceCost)} />
        </Card>

        <Card>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontWeight: FONT.black,
              fontSize: FONT.lg,
              marginBottom: SPACING.sm,
            }}
          >
            Service Proof
          </Text>
          <InfoCard label="Customer Sign-off" value={proof.customerSignature?.name || task?.customerSignatureName || "No sign-off yet"} />
          <InfoCard label="Submitted By" value={proof.technicianName || task?.assignedTechnicianName || "Technician"} />
          <InfoCard label="Submitted At" value={proof.submittedAt || task?.proofSubmittedAt || "Not submitted"} />
          <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, marginTop: SPACING.sm, marginBottom: SPACING.xs }}>
            Before Photo
          </Text>
          <ProofPhotoList photos={proof.beforePhotos || []} />
          <Text style={{ color: COLORS.textPrimary, fontWeight: FONT.black, marginTop: SPACING.sm, marginBottom: SPACING.xs }}>
            After Photo
          </Text>
          <ProofPhotoList photos={proof.afterPhotos || []} />
        </Card>

        <Card>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontWeight: FONT.black,
              fontSize: FONT.lg,
              marginBottom: SPACING.sm,
            }}
          >
            Service History
          </Text>
          <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>
            {logs.length} service note(s) and {requests.length} related service request(s) found.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            {!!task?.unitId && (
              <TechButton
                title="View Service Notes"
                onPress={() => router.push(`/technician/task/${task.id}/unit/log/select`)}
                size="sm"
              />
            )}
            {task?.status === TASK_STATUS.IN_PROGRESS && !!task?.unitId && (
              <TechButton
                title="Add Service Note"
                onPress={() => router.push(`/technician/task/${task.id}/unit/log/insert`)}
                size="sm"
                variant="secondary"
              />
            )}
          </View>
        </Card>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
