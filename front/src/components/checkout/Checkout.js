import { Buildings, CheckCircle, Spinner } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { useCart } from "../../context/CartContext";
import { resolvePreferredBranch } from "../../domain/branches/branchRouting";
import { consumePostRegistrationCheckoutIntent } from "../../domain/checkout/postRegistrationIntent";
import { buildCustomerOrder } from "../../domain/purchase/buildCustomerOrder";
import { computePurchaseTotals } from "../../domain/purchase/computePurchaseTotals";
import {
  loadOrdersFromStorage,
  saveOrdersToStorage,
} from "../../domain/purchase/ordersStorage";
import { DEFAULT_SERVICE_AREA_ID } from "../../domain/purchase/serviceAreas";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueFooter from "../common/boutique/BoutiqueFooter";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS, BQ_SHADOWS } from "../common/boutique/BoutiqueTheme";
import AddAddressModal from "./AddAddressModal";
import "./Checkout.css";
import DeliveryAddress from "./DeliveryAddress";
import OrderSummary from "./OrderSummary";
import PaymentMethod from "./PaymentMethod";

const isValidCheckoutAddress = (address) => {
  if (!address) return false;
  const hasRequired =
    address.name?.trim() &&
    address.street?.trim() &&
    address.city?.trim() &&
    address.phone?.trim();
  if (!hasRequired) return false;
  const phoneDigits = String(address.phone || "").replace(/\D/g, "");
  if (!/^09\d{9}$/.test(phoneDigits)) return false;
  if (address.postalCode?.trim() && !/^\d{4}$/.test(address.postalCode.trim()))
    return false;
  return true;
};

const normalizeAddress = (address = {}) => ({
  id: String(address.id || address._id || ""),
  label: String(address.label || ""),
  type: String(address.type || "other"),
  name: String(address.name || ""),
  region: String(address.region || ""),
  province: String(address.province || ""),
  barangay: String(address.barangay || ""),
  street: String(address.street || ""),
  city: String(address.city || ""),
  postalCode: String(address.postalCode || ""),
  phone: String(address.phone || ""),
  isDefault: Boolean(address.isDefault),
});

const findBestSelectedAddress = (items, currentId = "") => {
  if (!Array.isArray(items) || items.length === 0) return null;
  if (currentId) {
    const current = items.find((item) => item.id === currentId);
    if (current) return current;
  }
  const defaultAddress = items.find((item) => item.isDefault);
  if (defaultAddress) return defaultAddress;
  return items[0];
};

function Checkout() {
  const navigate = useNavigate();
  const { cart, clearCart, getCartTotal } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState("cod");
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressBusy, setAddressBusy] = useState(false);
  const [addressLoadFailed, setAddressLoadFailed] = useState(false);
  const [addressNotice, setAddressNotice] = useState("");
  const [discountAmount] = useState(0);
  const [stockIssues, setStockIssues] = useState([]);
  const [stockCheckedAt, setStockCheckedAt] = useState("");

  const assignedBranch = useMemo(() => {
    if (!selectedAddress) return "";
    return resolvePreferredBranch(selectedAddress);
  }, [selectedAddress]);

  const serviceAreaId = useMemo(() => {
    if (!assignedBranch) return DEFAULT_SERVICE_AREA_ID;
    return assignedBranch.toLowerCase();
  }, [assignedBranch]);

  const totals = useMemo(() => {
    const subtotal = getCartTotal();
    return computePurchaseTotals({
      subtotal,
      serviceAreaId,
      discountAmount,
    });
  }, [cart, getCartTotal, serviceAreaId, discountAmount]);

  const syncAddresses = useCallback(
    (nextAddresses, currentId = "") => {
      const normalized = (nextAddresses || []).map(normalizeAddress);
      setAddresses(normalized);
      setSelectedAddress(
        findBestSelectedAddress(
          normalized,
          currentId || selectedAddress?.id || "",
        ),
      );
      return normalized;
    },
    [selectedAddress?.id],
  );

  const loadAddresses = useCallback(async () => {
    try {
      const response = await apiRequest("/users/addresses");
      setAddressLoadFailed(false);
      return syncAddresses(response.addresses || []);
    } catch (_error) {
      setAddressLoadFailed(true);
      return syncAddresses([]);
    }
  }, [syncAddresses]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const computeStockIssues = useCallback(
    (productsResponse = {}) => {
      const rawProducts = Array.isArray(productsResponse.products)
        ? productsResponse.products
        : [];
      const byId = new Map(
        rawProducts.map((p) => [
          String(p.id || p._id || ""),
          Number(p.stock || 0),
        ]),
      );
      const bySku = new Map(
        rawProducts
          .map((p) => [String(p.sku || ""), Number(p.stock || 0)])
          .filter(([sku]) => Boolean(sku)),
      );

      const issues = [];
      for (const item of cart) {
        const idKey = String(item.id || "");
        const skuKey = String(item.model || item.sku || "");
        const available = byId.has(idKey)
          ? byId.get(idKey)
          : bySku.has(skuKey)
            ? bySku.get(skuKey)
            : null;
        if (available === null) continue;
        const desired = Number(item.quantity || 0);
        const normalizedAvailable = Number.isFinite(available)
          ? Math.max(0, Math.floor(available))
          : 0;
        if (normalizedAvailable <= 0) {
          issues.push({
            id: idKey,
            name: item.name,
            desired,
            available: 0,
            code: "out_of_stock",
          });
        } else if (desired > normalizedAvailable) {
          issues.push({
            id: idKey,
            name: item.name,
            desired,
            available: normalizedAvailable,
            code: "insufficient_stock",
          });
        }
      }
      return issues;
    },
    [cart],
  );

  const refreshStock = useCallback(async () => {
    try {
      const response = await apiRequest("/products/public");
      setStockIssues(computeStockIssues(response));
      setStockCheckedAt(new Date().toISOString());
      return { ok: true, issues: computeStockIssues(response) };
    } catch (_error) {
      return { ok: false, issues: stockIssues };
    }
  }, [computeStockIssues, stockIssues]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await refreshStock();
    };
    run();
    const pollId = window.setInterval(run, 20000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      mounted = false;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshStock]);

  const redirectToAddressForm = useCallback(() => {
    navigate("/profile", {
      state: {
        focusAddressForm: true,
        highlightAddressForm: true,
        highlightSource: "checkout",
      },
    });
  }, [navigate]);

  const ensureHasAddressBeforeCheckout = useCallback(async () => {
    const latestAddresses = await loadAddresses();
    const latestSelectedAddress = findBestSelectedAddress(
      latestAddresses,
      selectedAddress?.id || "",
    );
    if (latestSelectedAddress) return latestSelectedAddress;
    alert("No delivery address found. Please add an address to proceed.");
    redirectToAddressForm();
    return null;
  }, [loadAddresses, redirectToAddressForm, selectedAddress?.id]);

  const closeAddressModal = useCallback(() => {
    setShowAddressModal(false);
    setEditingAddress(null);
  }, []);

  const handleSaveAddress = useCallback(
    async (payload) => {
      setAddressBusy(true);
      try {
        if (editingAddress?.id) {
          const response = await apiRequest(
            `/users/addresses/${editingAddress.id}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
          );
          syncAddresses(response.addresses || [], editingAddress.id);
        } else {
          const response = await apiRequest("/users/addresses", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          const normalized = syncAddresses(response.addresses || []);
          const newest = normalized[normalized.length - 1];
          if (newest)
            setSelectedAddress(findBestSelectedAddress(normalized, newest.id));
          setAddressNotice("Delivery address saved and ready for checkout.");
        }
        closeAddressModal();
        if (!editingAddress?.id) {
          window.alert("Delivery address added. It is now available for this checkout.");
        }
      } catch (error) {
        if (error?.fieldErrors) {
          // Backend validation error with field-level details
          console.error("Address validation errors:", error.fieldErrors);
          // Re-open modal so user can see errors (modal will display them)
        } else {
          alert(error?.message || "Unable to save address right now.");
        }
      } finally {
        setAddressBusy(false);
      }
    },
    [editingAddress?.id, syncAddresses, closeAddressModal],
  );

  const handleDeleteAddress = useCallback(
    async (address) => {
      if (!address?.id) return;
      if (!window.confirm("Delete this saved address?")) return;
      setAddressBusy(true);
      try {
        const response = await apiRequest(`/users/addresses/${address.id}`, {
          method: "DELETE",
        });
        syncAddresses(response.addresses || []);
      } catch (error) {
        alert(error?.message || "Unable to delete address right now.");
      } finally {
        setAddressBusy(false);
      }
    },
    [syncAddresses],
  );

  const handleSetDefaultAddress = useCallback(
    async (address) => {
      if (!address?.id) return;
      setAddressBusy(true);
      try {
        const response = await apiRequest(
          `/users/addresses/${address.id}/default`,
          {
            method: "PATCH",
          },
        );
        syncAddresses(response.addresses || [], address.id);
      } catch (error) {
        alert(error?.message || "Unable to update default address right now.");
      } finally {
        setAddressBusy(false);
      }
    },
    [syncAddresses],
  );

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePlaceOrder = useCallback(async () => {
    const latestStock = await refreshStock();
    if (latestStock.ok && latestStock.issues.length > 0) {
      const message = latestStock.issues
        .map(
          (issue) =>
            `${issue.name}: requested ${issue.desired}, available ${issue.available}`,
        )
        .join("\n");
      alert(
        `Some items are no longer available.\n\n${message}\n\nPlease update your cart and try again.`,
      );
      return;
    }

    // Do not read the selectedAddress state after refreshing the address list:
    // React state is asynchronous and can still hold the old, empty address.
    const checkoutAddress = await ensureHasAddressBeforeCheckout();
    if (!checkoutAddress) return;

    if (!isValidCheckoutAddress(checkoutAddress)) {
      alert(
        "Please provide a valid address. Phone must be 11 digits (09XXXXXXXXX) and postal code must be 4 digits.",
      );
      return;
    }

    setIsProcessingPayment(true);

    const fromPostReg = consumePostRegistrationCheckoutIntent();
    const orderId = `ORD-${Date.now()}`;
    const trackingNumber = `TRK-${Math.floor(Math.random() * 1000000000)}`;

    const order = buildCustomerOrder({
      orderId,
      trackingNumber,
      cartItems: cart,
      address: checkoutAddress,
      paymentMethod: selectedPayment,
      serviceAreaId,
      totals,
      fromPostRegistrationCheckout: fromPostReg,
    });

    try {
      const response = await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: order.items,
          addressId: checkoutAddress.id,
          address: checkoutAddress,
          paymentMethod: selectedPayment,
          total: order.total,
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          shippingFee: totals.deliveryFee,
          discountAmount: totals.discountAmount,
        }),
      });
      const created = response.order;
      const paymentUrl =
        response.payment?.checkoutUrl ||
        response.payment?.checkout_url ||
        created?.paymentUrl ||
        created?.paymongo?.checkoutUrl ||
        "";
      setIsProcessingPayment(false);
      clearCart();
      if (paymentUrl) {
        window.location.assign(paymentUrl);
        return;
      }
      navigate(`/order-confirmation/${created._id || created.id}`);
    } catch (error) {
      setIsProcessingPayment(false);
      const isNetworkIssue = !error?.status;
      if (isNetworkIssue) {
        if (selectedPayment !== "cod" && selectedPayment !== "pay_on_install") {
          alert("Unable to reach the payment gateway. Please try again.");
          return;
        }
        const orders = loadOrdersFromStorage();
        orders.unshift(order);
        saveOrdersToStorage(orders);
        clearCart();
        navigate("/my-orders");
        alert(
          `Order received (${orderId}). Saved locally because backend could not be reached.`,
        );
        return;
      }
      alert(
        error?.message ||
          "Unable to place order right now. Please review your cart and try again.",
      );
    }
  }, [
    refreshStock,
    ensureHasAddressBeforeCheckout,
    cart,
    selectedPayment,
    serviceAreaId,
    totals,
    clearCart,
    navigate,
  ]);

  if (cart.length === 0) {
    return (
      <BoutiqueScreen withHeader={false} background="white">
        <BoutiqueHeader
          title="Checkout"
          leftAction="back"
          onLeftAction={() => navigate("/shop")}
        />
        <BoutiqueBox flex={1} align="center" justify="center" padding={60}>
          <BoutiqueStack gap={20} align="center">
            <BoutiqueText variant="h2">Your cart is empty</BoutiqueText>
            <BoutiqueButton
              onClick={() => navigate("/shop")}
              size="lg"
              style={{ width: "auto", padding: "12px 40px" }}
            >
              Continue Shopping
            </BoutiqueButton>
          </BoutiqueStack>
        </BoutiqueBox>
        <BoutiqueFooter />
      </BoutiqueScreen>
    );
  }

  return (
    <BoutiqueScreen withHeader={false} background={BQ_COLORS.bg}>
      {isProcessingPayment && (
        <BoutiqueBox
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
          }}
          align="center"
          justify="center"
        >
          <BoutiqueBox
            padding={40}
            background="white"
            align="center"
            gap={20}
            style={{
              borderRadius: "24px",
              boxShadow: BQ_SHADOWS.float,
              maxWidth: "400px",
            }}
          >
            <Spinner
              className="bq-spin"
              size={48}
              weight="bold"
              color={BQ_COLORS.brand}
            />
            <BoutiqueText variant="h2">Processing Payment</BoutiqueText>
            <BoutiqueText align="center" color={BQ_COLORS.inkMuted}>
              Please do not close this window while we prepare your order
              {selectedPayment === "cod" || selectedPayment === "pay_on_install"
                ? "."
                : " and open the PayMongo checkout."}
            </BoutiqueText>
          </BoutiqueBox>
        </BoutiqueBox>
      )}

      <BoutiqueHeader
        title="Checkout"
        leftAction="back"
        onLeftAction={() => navigate("/shop")}
      />

      <BoutiqueBox
        direction="row"
        flex={1}
        width="100%"
        className="checkout-main"
        style={{ maxWidth: "1400px", margin: "0 auto" }}
      >
        <BoutiqueBox flex={1} padding="32px" className="checkout-left">
          <BoutiqueStack gap={32}>
            {addressNotice ? (
              <div className="checkout-address-notice" role="status">
                <CheckCircle size={20} weight="fill" aria-hidden="true" />
                <span>{addressNotice}</span>
                <button type="button" onClick={() => setAddressNotice("")} aria-label="Dismiss address notification">×</button>
              </div>
            ) : null}
            <DeliveryAddress
              addresses={addresses}
              selectedAddress={selectedAddress}
              onSelectAddress={setSelectedAddress}
              onAddAddress={() => {
                setEditingAddress(null);
                setShowAddressModal(true);
              }}
              onEditAddress={(address) => {
                setEditingAddress(address);
                setShowAddressModal(true);
              }}
              onDeleteAddress={handleDeleteAddress}
              onSetDefaultAddress={handleSetDefaultAddress}
              isBusy={addressBusy}
            />

            {assignedBranch && (
              <BoutiqueBox
                padding={24}
                background={BQ_COLORS.bgAlt}
                style={{
                  borderRadius: "20px",
                  border: `1.5px dashed ${BQ_COLORS.border}`,
                }}
              >
                <BoutiqueBox
                  direction="row"
                  align="center"
                  gap={10}
                  margin="0 0 16px"
                >
                  <Buildings size={20} weight="fill" color={BQ_COLORS.accent} />
                  <BoutiqueText variant="label">Order Fulfillment</BoutiqueText>
                </BoutiqueBox>
                <BoutiqueStack gap={4}>
                  <BoutiqueText variant="h3">
                    {assignedBranch} Branch
                  </BoutiqueText>
                  <BoutiqueText size="13px" color={BQ_COLORS.inkMuted}>
                    Routed based on your location in{" "}
                    <strong>{selectedAddress?.city}</strong>.
                  </BoutiqueText>
                </BoutiqueStack>
              </BoutiqueBox>
            )}

            <PaymentMethod
              selectedMethod={selectedPayment}
              onSelectMethod={setSelectedPayment}
              branchHint={
                assignedBranch
                  ? `This order will be routed from the ${assignedBranch} branch based on the selected delivery address.`
                  : "The branch assignment will be determined once you choose a delivery address."
              }
            />
          </BoutiqueStack>
        </BoutiqueBox>

        <BoutiqueBox
          width={440}
          padding="32px"
          className="checkout-right"
          style={{ position: "sticky", top: "80px", height: "fit-content" }}
        >
          <OrderSummary
            cart={cart}
            selectedPayment={selectedPayment}
            totals={totals}
            onPlaceOrder={handlePlaceOrder}
            stockIssues={stockIssues}
            stockCheckedAt={stockCheckedAt}
          />
        </BoutiqueBox>
      </BoutiqueBox>

      {showAddressModal && (
        <AddAddressModal
          onClose={closeAddressModal}
          onSave={handleSaveAddress}
          initialAddress={editingAddress}
          title={editingAddress ? "Edit Address" : "Add New Address"}
          saveLabel={editingAddress ? "Save Changes" : "Save Address"}
          isSaving={addressBusy}
        />
      )}

      <BoutiqueFooter />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-spin { animation: bq-spin 1s linear infinite; }
        @keyframes bq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .checkout-main { flex-direction: column !important; }
          .checkout-right { width: 100% !important; position: static !important; }
        }
      `,
        }}
      />
    </BoutiqueScreen>
  );
}

export default Checkout;
