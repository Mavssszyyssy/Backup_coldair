// app/(technician)/parts.jsx
import { useFocusEffect } from "expo-router";
import React, { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import TechButton from "../../components/technician/TechButton";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import StickyActionBar from "../../components/ui/StickyActionBar";
import TextField from "../../components/ui/TextField";
import TechnicianScreen, { TechHero } from "../../components/technician/TechnicianScreen";
import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { useUserContext } from "../../context/UserContext";
import {
  PARTS_REQUEST_STATUS,
  getPartsRequestsByTechnician,
  savePartsRequest,
} from "../../services/partsRequestService";

const PRIORITIES = ["Normal", "Urgent"];
const STATUS_COLOR = {
  [PARTS_REQUEST_STATUS.SUBMITTED]: COLORS.warning,
  [PARTS_REQUEST_STATUS.REVIEWED]: COLORS.tech,
  [PARTS_REQUEST_STATUS.ASSIGNED]: COLORS.tech,
  [PARTS_REQUEST_STATUS.COMPLETED]: COLORS.success,
  [PARTS_REQUEST_STATUS.CANCELLED]: COLORS.danger,
};
const PRIORITY_COLOR = { Normal: COLORS.textSecondary, Urgent: COLORS.danger };

function Badge({ label, color }) {
  return (
    <View
      style={{
        backgroundColor: color + "22",
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color, fontWeight: FONT.bold, fontSize: FONT.sm }}>
        {String(label).charAt(0).toUpperCase() + String(label).slice(1)}
      </Text>
    </View>
  );
}

const EMPTY_FORM = {
  partName: "",
  quantity: "1",
  reason: "",
  priority: "Normal",
};

export default function PartsScreen() {
  const { current } = useUserContext();
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    if (current?.id)
      getPartsRequestsByTechnician(current.id)
        .then((all) =>
          setRequests(
            [...all].sort(
              (a, b) =>
                new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0),
            ),
          ),
        )
        .catch(() => {});
  };
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [current]),
  );

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.partName.trim() || !form.reason.trim()) {
      Alert.alert("Required", "Enter the part name and explain why it is needed.");
      return;
    }
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      Alert.alert("Invalid quantity", "Enter a whole quantity of at least 1.");
      return;
    }
    setSubmitting(true);
    try {
      await savePartsRequest({
        technicianId: current.id,
        technicianName: `${current.name_first} ${current.name_last}`.trim(),
        partName: form.partName,
        quantity,
        reason: form.reason.trim(),
        priority: form.priority,
        status: PARTS_REQUEST_STATUS.SUBMITTED,
        requestedAt: new Date().toISOString(),
      });
      setForm(EMPTY_FORM);
      refresh();
      Alert.alert("Submitted", "Your parts request was submitted.");
    } catch {
      Alert.alert("Error", "Could not submit the parts request.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <Card style={{ marginBottom: SPACING.sm }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: SPACING.xs,
        }}
      >
        <Text
          style={{ fontWeight: FONT.black, color: COLORS.textPrimary, flex: 1 }}
        >
          {item.partName}
        </Text>
        <Badge
          label={item.status || "pending"}
          color={STATUS_COLOR[item.status] || COLORS.textSecondary}
        />
      </View>
      <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm }}>
        Quantity: {item.quantity} • Priority:{" "}
        <Text
          style={{
            color: PRIORITY_COLOR[item.priority] || COLORS.textSecondary,
          }}
        >
          {item.priority}
        </Text>
      </Text>
      {!!item.reason && (
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: FONT.sm,
            marginTop: 2,
          }}
        >
          Reason needed: {item.reason}
        </Text>
      )}
      {!!item.requestedAt && (
        <Text
          style={{ color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 }}
        >
          {new Date(item.requestedAt).toLocaleDateString()}
        </Text>
      )}
    </Card>
  );

  return (
    <TechnicianScreen
      title="Parts Requests"
      subtitle="Request parts needed for service work"
      icon="construct-sharp"
      scroll={false}
      contentContainerStyle={{ paddingBottom: 108 }}
      stickyAction={
        <StickyActionBar>
          <TechButton
            title={submitting ? "Submitting..." : "Submit Parts Request"}
            onPress={handleSubmit}
            loading={submitting}
            leftIcon={<Ionicons name="send-sharp" size={18} color={COLORS.surface} />}
          />
        </StickyActionBar>
      }
    >
      <FlatList
        data={requests}
        keyExtractor={(i) => String(i.id || i.requestedAt)}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: SPACING.lg,
        }}
        ListHeaderComponent={
          <View>
            <TechHero
              eyebrow="Inventory Support"
              title="Request parts for a work order"
              subtitle="Track submitted, reviewed, assigned, completed, and cancelled requests."
              icon="cube-sharp"
            />
            <Card style={{ marginBottom: SPACING.md }}>
              <Text
                style={{
                  fontWeight: FONT.black,
                  color: COLORS.textPrimary,
                  marginBottom: SPACING.sm,
                }}
              >
                New Parts Request
              </Text>
              <TextField
                label="Part Name"
                value={form.partName}
                onChangeText={set("partName")}
                placeholder="e.g. Capacitor 35μF"
              />
              <TextField
                label="Quantity"
                value={form.quantity}
                onChangeText={set("quantity")}
                keyboardType="numeric"
                placeholder="1"
              />
              <TextField
                label="Reason Needed"
                value={form.reason}
                onChangeText={set("reason")}
                placeholder="Describe why this part is needed"
                multiline
              />
              <Text
                style={{
                  fontSize: FONT.sm,
                  color: COLORS.textSecondary,
                  marginBottom: SPACING.xs,
                }}
              >
                Priority
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: SPACING.sm,
                  marginBottom: SPACING.sm,
                }}
              >
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => set("priority")(p)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      paddingVertical: SPACING.sm,
                      borderRadius: RADIUS.md,
                      backgroundColor:
                        form.priority === p
                          ? p === "Urgent"
                            ? COLORS.danger
                            : COLORS.tech
                          : COLORS.border,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          form.priority === p
                            ? COLORS.surface
                            : COLORS.textPrimary,
                        fontWeight: FONT.bold,
                        fontSize: FONT.sm,
                      }}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
            {requests.length > 0 && (
              <Text
                style={{
                  fontWeight: FONT.black,
                  color: COLORS.textPrimary,
                  marginBottom: SPACING.sm,
                }}
              >
                My Parts Requests
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No parts requests yet"
            message="Submit a parts request when service work needs inventory support."
            icon="construct-sharp"
            iconColor={COLORS.tech}
          />
        }
      />
    </TechnicianScreen>
  );
}
