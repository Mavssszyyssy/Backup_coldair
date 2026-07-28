import { useLocalSearchParams, useRouter } from "expo-router";
import { BoutiqueButton, BoutiqueCard, BoutiqueHeader, BoutiqueScreen, BoutiqueText, BQ_COLORS, BQ_SPACING } from "../../../components/boutique";

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const { id, payment } = useLocalSearchParams();
  const isCancelled = payment === "cancelled";
  return <><BoutiqueHeader title={isCancelled ? "Payment cancelled" : "Order received"} onBack={() => router.replace("/customer/orders")} /><BoutiqueScreen><BoutiqueCard style={{ gap: BQ_SPACING.md, alignItems: "center" }}><BoutiqueText variant="h1" align="center">{isCancelled ? "Payment not completed" : "Thank you"}</BoutiqueText><BoutiqueText align="center" color={BQ_COLORS.inkMuted}>{isCancelled ? "You can reopen the order and try payment again." : "Your order was created. Payment status updates after PayMongo confirms the transaction."}</BoutiqueText><BoutiqueText variant="caption" color={BQ_COLORS.inkMuted}>Order: {id}</BoutiqueText><BoutiqueButton title="View my orders" onPress={() => router.replace("/customer/orders")} /></BoutiqueCard></BoutiqueScreen></>;
}
