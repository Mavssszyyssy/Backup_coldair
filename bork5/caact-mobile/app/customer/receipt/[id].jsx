import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { BoutiqueButton, BoutiqueCard, BoutiqueHeader, BoutiqueScreen, BoutiqueText, BQ_COLORS, BQ_SPACING } from "../../../components/boutique";
import { formatPeso } from "../../../services/ecommerceService";
import { getOrderById } from "../../../services/orderStorage";

export default function ReceiptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState(null);
  useFocusEffect(useCallback(() => { getOrderById(id).then(setOrder); }, [id]));
  return <><BoutiqueHeader title="Receipt" onBack={() => router.back()} /><BoutiqueScreen>{!order ? <BoutiqueCard><BoutiqueText color={BQ_COLORS.inkMuted}>Receipt unavailable.</BoutiqueText></BoutiqueCard> : <BoutiqueCard style={{ gap: BQ_SPACING.md }}><BoutiqueText variant="h1">Payment receipt</BoutiqueText><BoutiqueText color={BQ_COLORS.inkMuted}>Receipt {order.receipt?.receiptNumber || order.orderCode || order.id}</BoutiqueText>{(order.items || []).map((item) => <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between" }}><BoutiqueText>{item.name} x{item.quantity}</BoutiqueText><BoutiqueText>{formatPeso(item.price * item.quantity)}</BoutiqueText></View>)}<View style={{ borderTopWidth: 1, borderTopColor: BQ_COLORS.border, paddingTop: BQ_SPACING.md, flexDirection: "row", justifyContent: "space-between" }}><BoutiqueText variant="h2">Paid</BoutiqueText><BoutiqueText variant="h2">{formatPeso(order.receipt?.amountPaid || order.total)}</BoutiqueText></View><BoutiqueButton title="View orders" onPress={() => router.replace("/customer/orders")} /></BoutiqueCard>}</BoutiqueScreen></>;
}
