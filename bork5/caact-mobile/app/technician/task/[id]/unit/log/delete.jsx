import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import TechButton from "../../../../../../components/technician/TechButton";
import Card from "../../../../../../components/ui/Card";
import { COLORS, FONT, SPACING } from "../../../../../../constants/theme";
import { deleteServiceLog } from "../../../../../../services/unitServiceLogStorage";

export default function LogDeleteScreen() {
  const router = useRouter();
  const { id: taskId, logId } = useLocalSearchParams();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteServiceLog(taskId, logId);
      router.replace(`/technician/task/${taskId}/unit/log/select`);
    } catch (error) {
      Alert.alert("Delete Failed", error?.message || "Unable to delete this service note.");
      setDeleting(false);
    }
  };

  return (
    <Pressable
      onPress={() => router.back()}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(15, 23, 42, 0.42)",
        padding: SPACING.md,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <Text
          style={{
            color: COLORS.textPrimary,
            fontSize: FONT.lg,
            fontWeight: FONT.black,
            marginBottom: SPACING.xs,
          }}
        >
          Delete Service Note
        </Text>
        <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.md }}>
          Delete this service note? This action cannot be undone.
        </Text>
        <TechButton
          title={deleting ? "Deleting..." : "Delete"}
          variant="danger"
          onPress={handleDelete}
          loading={deleting}
          disabled={deleting}
        />
        <TechButton
          title="Cancel"
          variant="secondary"
          onPress={() => router.back()}
          disabled={deleting}
        />
      </Card>
    </Pressable>
  );
}
