import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import CustomerMetricPill from "../../../components/customer/CustomerMetricPill";
import CustomerScreen from "../../../components/customer/CustomerScreen";
import AppHero from "../../../components/ui/AppHero";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import EmptyState from "../../../components/ui/EmptyState";
import IconRow from "../../../components/ui/IconRow";
import StatusChip from "../../../components/ui/StatusChip";
import { COLORS, FONT, RADIUS, SPACING } from "../../../constants/theme";
import { useUserContext } from "../../../context/UserContext";
import {
  getCustomerServiceHistory,
  getCustomerServiceStats,
} from "../../../services/customerHistoryService";

function statusColor(status = "") {
  const value = status.toLowerCase();
  if (value.includes("completed")) return COLORS.success;
  if (value.includes("cancelled")) return COLORS.danger;
  if (value.includes("progress") || value.includes("assigned")) return COLORS.primary;
  return COLORS.warning;
}

export default function CustomerRequestsScreen() {
  const router = useRouter();
  const { current } = useUserContext();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      getCustomerServiceHistory(current?.id).then((history) => {
        if (!active) return;
        setRequests(history.requests);
        setStats(getCustomerServiceStats(history.requests, history.completedServices));
      });

      return () => {
        active = false;
      };
    }, [current]),
  );

  return (
    <CustomerScreen
      title="Service Requests"
      subtitle="Appointments, status updates, and technician notes"
    >
      <AppHero
        eyebrow="Service Desk"
        title="Track your service requests"
        subtitle="See which requests are scheduled, in progress, or completed."
        icon="construct-sharp"
      />

      <View
        style={{
          flexDirection: "row",
          marginBottom: SPACING.md,
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          paddingVertical: SPACING.sm,
        }}
      >
        <CustomerMetricPill
          label="Total"
          value={stats?.totalRequests || 0}
          icon="list-sharp"
          color={COLORS.textPrimary}
        />
        <CustomerMetricPill
          label="Assigned"
          value={stats?.assigned || 0}
          icon="person-sharp"
          color={COLORS.primary}
        />
        <CustomerMetricPill
          label="Completed"
          value={stats?.completedRequests || 0}
          icon="checkmark-done-sharp"
          color={COLORS.success}
        />
      </View>

      {requests.length === 0 ? (
        <Card>
          <EmptyState
            title="No service requests yet"
            message="Go to Services to request installation, cleaning, repair, or delivery support."
            icon="calendar-sharp"
            iconColor={COLORS.primary}
            action={
              <Button
                title="Request Service"
                onPress={() => router.push("/customer/services")}
                leftIcon={<Ionicons name="add-sharp" size={18} color={COLORS.surface} />}
              />
            }
          />
        </Card>
      ) : (
        requests.map((request) => (
          <Card
            key={request.id}
            onPress={() => router.push(`/customer/requests/${request.id}`)}
            accessibilityLabel={`View ${request.serviceType || request.issueType || "service request"}`}
          >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: SPACING.sm,
                }}
              >
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontWeight: FONT.black,
                    fontSize: FONT.lg,
                    flex: 1,
                    marginRight: SPACING.sm,
                  }}
                >
                  {request.serviceType || request.issueType || "Service Request"}
                </Text>
                <StatusChip label={request.status} color={statusColor(request.status)} />
              </View>

              <IconRow
                icon="snow-sharp"
                title={request.unitName || "No AC unit selected"}
                subtitle={`Preferred schedule: ${request.preferredDate || "Not scheduled yet"}`}
                color={COLORS.primary}
              />
              <IconRow
                icon="person-sharp"
                title={request.assignedTechnicianName || "Technician not assigned"}
                subtitle="Tap to view updates and details"
                color={COLORS.success}
                right={<Ionicons name="chevron-forward-sharp" size={18} color={COLORS.textMuted} />}
              />
          </Card>
        ))
      )}
    </CustomerScreen>
  );
}
