import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import {
  CustomerHealthPanel,
  CustomerMaintenancePanel,
} from "../../../components/customer/CustomerHealthPanels";
import CustomerScreen from "../../../components/customer/CustomerScreen";
import CustomerSectionHeader from "../../../components/customer/CustomerSectionHeader";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import DetailRow from "../../../components/ui/DetailRow";
import EmptyState from "../../../components/ui/EmptyState";
import StatusChip from "../../../components/ui/StatusChip";
import { COLORS, FONT, SPACING } from "../../../constants/theme";
import { useUserContext } from "../../../context/UserContext";
import {
  buildNextRecommendedMaintenance,
  calculateUnitHealthScore,
} from "../../../services/acHealthScoreService";
import { getCustomerServiceHistory } from "../../../services/customerHistoryService";
import {
  ensureSeededCustomerUnit,
  getUnitByCode,
} from "../../../services/unitStorage";

function readParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default function CustomerUnitDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { current } = useUserContext();
  const [unit, setUnit] = useState(null);
  const [health, setHealth] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [history, setHistory] = useState({
    requests: [],
    linkedTasks: [],
    completedServices: [],
  });
  const [loading, setLoading] = useState(true);

  const unitId = readParam(params.id);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Promise.all([
        ensureSeededCustomerUnit(current).then(() => getUnitByCode(unitId)),
        getCustomerServiceHistory(current?.id),
      ])
        .then(([loadedUnit, loadedHistory]) => {
          if (!active) return;

          const ownsUnit =
            loadedUnit &&
            String(loadedUnit.userId || "") === String(current?.id || "");

          if (!ownsUnit) {
            setUnit(null);
            setHealth(null);
            setMaintenance(null);
            setHistory(loadedHistory);
            return;
          }

          const relatedRequests = loadedHistory.requests.filter(
            (request) =>
              String(request.unitId || "") === String(loadedUnit.id) ||
              String(request.unitName || "").toLowerCase() ===
                String(loadedUnit.unitName || "").toLowerCase(),
          );
          const relatedRequestIds = new Set(
            relatedRequests.map((request) => String(request.id)),
          );
          const relatedTasks = loadedHistory.linkedTasks.filter(
            (task) =>
              String(task.unitId || "") === String(loadedUnit.id) ||
              String(task.unitName || "").toLowerCase() ===
                String(loadedUnit.unitName || "").toLowerCase() ||
              relatedRequestIds.has(String(task.requestId || "")),
          );

          setUnit(loadedUnit);
          setHistory({
            requests: relatedRequests,
            linkedTasks: relatedTasks,
            completedServices: relatedTasks.filter(
              (task) => String(task.status || "").toLowerCase() === "completed",
            ),
          });
          const nextHealth = calculateUnitHealthScore({
            unit: loadedUnit,
            requests: relatedRequests,
            tasks: relatedTasks,
          });
          setHealth(nextHealth);
          setMaintenance(buildNextRecommendedMaintenance(nextHealth));
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [current, unitId]),
  );

  if (!loading && !unit) {
    return (
      <CustomerScreen title="AC Unit Details" subtitle="AC unit not found">
        <Card>
          <EmptyState
            title="AC unit unavailable"
            message="This AC unit could not be found for your account."
            icon="alert-circle-sharp"
            iconColor={COLORS.warning}
            action={
              <Button title="Back to Home" onPress={() => router.replace("/customer/home")} />
            }
          />
        </Card>
      </CustomerScreen>
    );
  }

  return (
    <CustomerScreen
      title="AC Unit Details"
      subtitle={unit?.unitName || "Loading AC unit details"}
    >
      <Button
        title="Back to Home"
        variant="secondary"
        onPress={() => router.back()}
        leftIcon={
          <Ionicons name="arrow-back-sharp" size={18} color={COLORS.primary} />
        }
        style={{ marginBottom: SPACING.md }}
      />

      <Card>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: SPACING.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: COLORS.textPrimary,
                fontSize: FONT.xl,
                fontWeight: FONT.black,
              }}
            >
              {unit?.unitName || "Unnamed AC Unit"}
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 2 }}>
              {[unit?.brand, unit?.model].filter(Boolean).join(" / ") ||
                "Brand and model not set"}
            </Text>
          </View>
          <StatusChip
            label={unit?.status || "Active"}
            color={
              String(unit?.status || "").toLowerCase() === "active"
                ? COLORS.success
                : COLORS.warning
            }
          />
        </View>

        <DetailRow label="Serial Number" value={unit?.serialNumber} />
        <DetailRow label="Inventory QR" value={unit?.qrCode} multiline />
        <DetailRow label="Installation Date" value={unit?.installationDate} />
        <DetailRow label="Last Maintenance" value={unit?.lastMaintenanceDate} />
        <DetailRow
          label="AMP Service Window"
          value={unit?.nextIdealServicePeriod || "Not calculated"}
        />
      </Card>

      <CustomerHealthPanel health={health} />

      <CustomerMaintenancePanel maintenance={maintenance} />

      <Card>
        <CustomerSectionHeader title="AC Unit Status" />
        <DetailRow label="Placement" value={unit?.placementArea || "Not set"} />
        <DetailRow
          label="Environment"
          value={unit?.installationEnvironment || "Not set"}
        />
        <DetailRow label="Usage Level" value={unit?.usageLevel || "Normal"} />
        <DetailRow
          label="Ventilation"
          value={unit?.ventilationQuality || "Good"}
        />
      </Card>

      {health?.aiPrediction ? (
        <Card>
          <CustomerSectionHeader title="Maintenance Forecast" />
          <DetailRow
            label="Forecast"
            value={health.aiPrediction.predictionSummary}
            multiline
          />
          <DetailRow
            label="Next Recommended Maintenance"
            value={health.aiPrediction.nextMaintenanceDate}
          />
          <DetailRow
            label="Estimated Remaining Life"
            value={`${health.aiPrediction.estimatedRemainingYears} years`}
          />
        </Card>
      ) : null}

      <Card>
          <CustomerSectionHeader title="Service Request Status" />
        <DetailRow label="Open Requests" value={String(history.requests.length)} />
        <DetailRow
          label="Assigned Work Orders"
          value={String(history.linkedTasks.length)}
        />
        <DetailRow
          label="Completed Services"
          value={String(history.completedServices.length)}
        />
        <Button
          title="Book Service for This AC"
          onPress={() => router.push("/customer/services")}
          leftIcon={
            <Ionicons
              name="calendar-sharp"
              size={18}
              color={COLORS.surface}
            />
          }
        />
      </Card>
    </CustomerScreen>
  );
}
