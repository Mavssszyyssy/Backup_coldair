function TrackOrderModal({ order, onClose }) {
  const timeline = Array.isArray(order.tracking?.timeline) ? order.tracking.timeline : [];
  const currentStage = order.tracking?.currentStage || "placed";
  const steps = timeline.map((step) => ({
    label: step.label,
    detail: step.detail,
    date: step.timestamp,
    status: step.stage === currentStage ? "processing" : "completed",
  }));

  const stepInner = (step) => {
    if (step.status === "completed") {
      return "✓";
    }
    if (step.status === "processing") {
      return "●";
    }
    return "○";
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(8px)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        className="address-modal order-details-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        style={{
          background: "white",
          width: "100%",
          maxWidth: "600px",
          borderRadius: "24px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          animation: "modalSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        <div
          className="modal-header"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            Track Order
          </h3>
          <button
            type="button"
            className="close-modal"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        <div
          className="modal-body"
          style={{ padding: "24px", overflowY: "auto" }}
        >
          <div
            className="tracking-info"
            style={{
              background: "#f8fafc",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                marginBottom: "4px",
                color: "#64748b",
              }}
            >
              Order: <strong style={{ color: "#0f172a" }}>{order.orderCode || order.id}</strong>
            </div>
            <div
              style={{
                fontSize: "13px",
                marginBottom: "4px",
                color: "#64748b",
              }}
            >
              Tracking #:{" "}
              <div
                className="tracking-number"
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  background: "#eff6ff",
                  color: "#2563eb",
                  borderRadius: "6px",
                  fontWeight: 700,
                  fontFamily: "monospace",
                }}
              >
                {order.tracking?.trackingNumber || order.trackingNumber || "Pending"}
              </div>
            </div>
            <div style={{ fontSize: "13px", color: "#64748b" }}>
              Estimated Delivery:{" "}
              <span
                className="delivery-date"
                style={{ color: "#10b981", fontWeight: 700 }}
              >
                {order.estimatedDelivery}
              </span>
            </div>
            {order.receipt?.receiptNumber && (
              <div
                style={{ fontSize: "13px", marginTop: "4px", color: "#64748b" }}
              >
                E-Receipt:{" "}
                <strong style={{ color: "#0f172a" }}>
                  {order.receipt.receiptNumber}
                </strong>
              </div>
            )}
            {order.assignedTechnician && (
              <div
                style={{ fontSize: "13px", marginTop: "4px", color: "#64748b" }}
              >
                Assigned Technician:{" "}
                <strong style={{ color: "#0f172a" }}>
                  {order.assignedTechnician}
                </strong>
              </div>
            )}
            {order.estimatedArrival && (
              <div
                style={{ fontSize: "13px", marginTop: "4px", color: "#64748b" }}
              >
                Estimated Arrival:{" "}
                <strong style={{ color: "#0f172a" }}>
                  {new Date(order.estimatedArrival).toLocaleString()}
                </strong>
              </div>
            )}
            {order.installationDate && (
              <div
                style={{ fontSize: "13px", marginTop: "4px", color: "#64748b" }}
              >
                Estimated Installation:{" "}
                <strong style={{ color: "#0f172a" }}>
                  {new Date(order.installationDate).toLocaleDateString()}
                </strong>
              </div>
            )}
          </div>

          <div>
            <h4
              style={{
                margin: "0 0 16px",
                fontSize: "15px",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Delivery Tracking
            </h4>
            <div>
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    marginBottom: "16px",
                    alignItems: "center",
                    opacity: step.status === "upcoming" ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background:
                        step.status === "completed"
                          ? "#10b981"
                          : step.status === "processing"
                            ? "#f59e0b"
                            : "#e2e8f0",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: "16px",
                      fontSize: "12px",
                      flexShrink: 0,
                    }}
                  >
                    {stepInner(step)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "14px",
                        color: "#1e293b",
                      }}
                    >
                      {step.label}
                    </div>
                    {step.date && (
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                        {new Date(step.date).toLocaleString()}
                      </div>
                    )}
                    {step.detail && <div style={{ fontSize: "12px", color: "#64748b", marginTop: 2 }}>{step.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="delivery-address"
            style={{
              marginTop: "24px",
              padding: "16px",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Delivery Address
            </h4>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#1e293b",
              }}
            >
              {order.address.name}
            </p>
            <p
              style={{ margin: "0 0 4px", fontSize: "13px", color: "#64748b" }}
            >
              {order.address.street}
            </p>
            <p
              style={{ margin: "0 0 8px", fontSize: "13px", color: "#64748b" }}
            >
              {order.address.city}, {order.address.postalCode}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: "#2563eb",
                fontWeight: 600,
              }}
            >
              Phone: {order.address.phone || "Not provided"}
            </p>
          </div>

          <div style={{ marginTop: "24px" }}>
            <h4
              style={{
                margin: "0 0 8px",
                fontSize: "14px",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Payment Method
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              {order.paymentMethod === "cod"
                ? "Cash on Delivery"
                : order.paymentMethod === "gcash"
                  ? "GCash"
                  : "Credit/Debit Card"}
            </p>
          </div>
        </div>
        <div
          className="modal-footer"
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            background: "#f8fafc",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="confirm-btn"
            onClick={onClose}
            style={{
              padding: "10px 24px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrackOrderModal;
