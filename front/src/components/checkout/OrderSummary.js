import PurchaseCostBreakdown from "./PurchaseCostBreakdown";
import { Snowflake } from "@phosphor-icons/react";
import { useState } from "react";

function CheckoutProductImage({ item }) {
  const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
  const [failedSource, setFailedSource] = useState("");
  return (
    <div className="summary-item-image">
      {imageUrl && imageUrl !== failedSource ? (
        <img
          src={imageUrl}
          alt={item.name || "Air conditioner"}
          className="summary-product-image"
          decoding="async"
          onError={() => setFailedSource(imageUrl)}
        />
      ) : (
        <span role="img" aria-label={`${item.name || "Air conditioner"}: product image unavailable`}>
          <Snowflake size={30} weight="regular" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

const formatHorsepower = (item = {}) => {
  const parsed = Number(item.horsepower || String(item.specs || "").match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
  return parsed > 0 ? `${parsed} HP` : "Not specified";
};

function OrderSummary({
  cart,
  selectedPayment,
  totals,
  onPlaceOrder,
  stockIssues = [],
  stockCheckedAt = "",
  isProcessing = false,
}) {
  const hasStockIssues = Array.isArray(stockIssues) && stockIssues.length > 0;

  return (
    <div className="checkout-section order-summary">
      <h2 style={{ marginBottom: "20px" }}>Order Summary</h2>
      <div className="summary-items">
        {cart.map((item) => (
          <div key={item.id} className="summary-item">
            <CheckoutProductImage item={item} />
            <div className="summary-item-details">
              <div className="summary-item-name">{item.name}</div>
              <div className="summary-item-horsepower">
                Horsepower: {formatHorsepower(item)}
              </div>
              <div className="summary-item-price">
                ₱{item.price.toLocaleString()} each
              </div>
              <div className="summary-item-quantity">×{item.quantity}</div>
            </div>
            <div style={{ fontWeight: "bold", color: "#1E88E5" }}>
              ₱{(item.price * item.quantity).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <PurchaseCostBreakdown totals={totals} />

      <div className="summary-total">
        <span>Total due</span>
        <span>₱{totals.total.toLocaleString()}</span>
      </div>

      <p className="checkout-flow-note">
        Your fulfillment branch will review and dispatch your order.
        {selectedPayment === "gcash" || selectedPayment === "credit"
          ? " Continue to secure payment after placing the order."
          : " Pay the assigned technician on delivery after arrival is confirmed."}
      </p>

      {hasStockIssues ? (
        <div
          style={{
            marginBottom: "12px",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#7f1d1d",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: "6px" }}>
            Out of stock items detected
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.35 }}>
            {stockIssues.slice(0, 4).map((issue) => (
              <div key={issue.id || issue.name}>
                {issue.name}: requested {issue.desired}, available{" "}
                {issue.available}
              </div>
            ))}
            {stockIssues.length > 4 ? (
              <div>+{stockIssues.length - 4} more</div>
            ) : null}
          </div>
          {stockCheckedAt ? (
            <div style={{ marginTop: "8px", fontSize: "12px", opacity: 0.8 }}>
              Last checked: {new Date(stockCheckedAt).toLocaleTimeString()}
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="place-order-btn"
        onClick={onPlaceOrder}
        disabled={hasStockIssues || isProcessing}
        aria-busy={isProcessing}
      >
        {hasStockIssues
          ? "Update cart to continue"
          : isProcessing
            ? "Connecting..."
            : "Place order"}
      </button>
    </div>
  );
}

export default OrderSummary;
