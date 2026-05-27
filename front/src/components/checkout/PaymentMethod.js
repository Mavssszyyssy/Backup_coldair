// import icons from '../common/icons';
const icons = {}; // BOUTIQUE MIGRATION STUB

function PaymentMethod({ selectedMethod, onSelectMethod, branchHint }) {
  const paymentMethods = [
    {
      id: "cod",
      name: "Cash on Delivery",
      description: "Processing until you pay on delivery",
      iconSrc: icons.cartShoppingFast,
    },
    {
      id: "gcash",
      name: "GCash",
      description: "Pay securely through PayMongo hosted checkout",
      iconSrc: icons.customize,
    },
    {
      id: "credit",
      name: "Credit / debit card",
      description: "Visa or Mastercard through PayMongo",
      iconSrc: icons.shieldKeyhole,
    },
    {
      id: "pay_on_install",
      name: "Payment upon installation",
      description: "Processing until installation is completed",
      iconSrc: icons.tools,
    },
  ];

  return (
    <div className="checkout-section">
      <h2 style={{ marginBottom: "20px" }}>Payment Method</h2>
      {branchHint ? (
        <p
          className="payment-branch-hint"
          style={{
            marginTop: "-8px",
            marginBottom: "16px",
            color: "#334155",
            fontSize: "14px",
          }}
        >
          {branchHint}
        </p>
      ) : null}
      <div className="payment-methods">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`payment-option ${selectedMethod === method.id ? "selected" : ""}`}
            onClick={() => onSelectMethod(method.id)}
            role="presentation"
          >
            <div className="payment-radio"></div>
            <div className="payment-info">
              <div className="payment-name">{method.name}</div>
              <div className="payment-description">{method.description}</div>
            </div>
            <img
              src={method.iconSrc}
              alt=""
              className="inline-icon inline-icon--xl"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default PaymentMethod;
