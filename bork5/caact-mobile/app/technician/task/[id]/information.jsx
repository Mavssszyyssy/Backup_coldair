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

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      async function load() {
        const loadedTask = await getTaskById(id);
        const loadedUnit = loadedTask?.unitId
          ? await getUnitByCode(loadedTask.unitId)
          : null;
        const loadedRequests = loadedTask?.customerId
          ? await getServiceRequestsByUser(loadedTask.customerId)
          : [];
        const loadedLogs = loadedUnit?.id ? await getServiceLogsByUnit(loadedUnit.id) : [];
        if (active) {
          setTask(loadedTask);
          setUnit(loadedUnit);
          setRequests(loadedRequests);
          setLogs(loadedLogs);
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

        <Card>
          <InfoCard label="Status" value={task?.status || "Unknown"} />
          <InfoCard label="Customer" value={task?.customerName || "Unknown"} />
          <InfoCard label="Address" value={task?.address || "Not provided"} />
          <InfoCard label="Schedule" value={task?.scheduledDate || "Unscheduled"} />
          <InfoCard label="Service Concern" value={task?.description || task?.concern || "None"} />
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
            {task?.status === TASK_STATUS.IN_PROGRESS && !!task?.unitId && (
              <TechButton
                title="Complete Service"
                onPress={() => router.push(`/technician/task/${task.id}/complete-service`)}
                size="sm"
              />
            )}
            {assignedSerials.length > 0 && (
              <TechButton
                title="Register Assigned Unit"
                onPress={() => router.push(`/technician/task/${task.id}/amp-registration?serial=${encodeURIComponent(assignedSerials[0])}`)}
                size="sm"
                variant="secondary"
              />
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
