import { ArrowLeft, DownloadSimple, Receipt } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../config/api";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";

const money = (value) => `PHP ${Number(value || 0).toLocaleString("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const formatDateTime = (value) => {
  if (!value) return "Pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const formatAddress = (address = {}) =>
  address.formatted || [address.street, address.barangay, address.city, address.province, address.region, address.postalCode]
    .filter(Boolean)
    .join(", ") || "Pending";

const resolveDeliveryAddress = (order = {}) => {
  const savedAddress = order.address || {};
  const invoiceAddress = order.invoice?.deliveryAddress || {};
  return {
    ...savedAddress,
    ...invoiceAddress,
    name: invoiceAddress.name || savedAddress.name || order.invoice?.customer?.name || order.customerName || "",
    phone: invoiceAddress.phone || savedAddress.phone || order.invoice?.customer?.phone || "",
  };
};

const deliveryAddressRows = (address = {}) => [
  ["Recipient", address.name],
  ["Contact number", address.phone],
  ["Street address", address.street],
  ["Barangay", address.barangay],
  ["City / Municipality", address.city],
  ["Province", address.province],
  ["Region", address.region],
  ["Postal code", address.postalCode],
].filter(([, value]) => String(value || "").trim());

function DeliveryAddressDetails({ address }) {
  const rows = deliveryAddressRows(address);
  return (
    <section className="receipt-address-details">
      <span>Delivery Address Details</span>
      {rows.length ? (
        <dl>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : <strong>Pending</strong>}
    </section>
  );
}

const normalizeOrder = (order = {}) => ({
  id: String(order.id || order._id || order.orderCode || ""),
  orderCode: String(order.orderCode || order.id || ""),
  customerName: String(order.customerName || order.address?.name || "Customer"),
  createdAt: order.createdAt || "",
  paymentMethod: String(order.paymentMethod || ""),
  paymentStatus: String(order.paymentStatus || order.receipt?.paymentStatus || ""),
  paymentProvider: String(order.paymentProvider || order.receipt?.paymentProvider || ""),
  paymentReference: String(order.receipt?.paymentReference || order.paymongo?.paymentId || order.paymongo?.checkoutSessionId || ""),
  receiptAvailable: Boolean(order.receiptAvailable),
  receipt: order.receipt || {},
  invoice: order.invoice || {},
  tracking: order.tracking || {},
  address: order.address || {},
  items: Array.isArray(order.items) ? order.items : [],
  subtotalAmount: Number(order.subtotalAmount || order.receipt?.subtotalAmount || 0),
  vatAmount: Number(order.vatAmount || order.receipt?.vatAmount || 0),
  shippingFee: Number(order.shippingFee || order.receipt?.shippingFee || 0),
  discountAmount: Number(order.discountAmount || order.receipt?.discountAmount || 0),
  totalAmount: Number(order.totalAmount || order.receipt?.amountPaid || 0),
});

function ReceiptView() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    apiRequest(`/orders/me/${orderId}`)
      .catch((err) => {
        if (err?.status === 403 || err?.status === 404) {
          return apiRequest(`/orders/${orderId}`);
        }
        throw err;
      })
      .then((response) => {
        if (mounted) setOrder(normalizeOrder(response.order));
      })
      .catch((err) => {
        if (mounted) setError(err?.message || "Unable to load receipt.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orderId]);

  const downloadReceipt = () => {
    // The browser print dialog preserves the same receipt markup and styles
    // shown in the preview. Customers can select "Save as PDF" to download it.
    window.print();
  };

  const deliveryAddress = resolveDeliveryAddress(order || {});

  if (loading || error || !order || !order.receiptAvailable) {
    return (
      <BoutiqueScreen withHeader={false}>
        <BoutiqueHeader title="E-Receipt" leftAction="back" onLeftAction={() => navigate(-1)} />
        <div className="receipt-page">{loading ? "Loading receipt..." : error || (!order?.receiptAvailable ? "An official receipt will be available after payment is confirmed." : "Receipt not found.")}</div>
      </BoutiqueScreen>
    );
  }

  return (
    <BoutiqueScreen withHeader={false}>
      <BoutiqueHeader title="E-Receipt" leftAction="back" onLeftAction={() => navigate(-1)} />
      <main className="receipt-page">
        <section className="receipt-shell">
          <div className="receipt-actions">
            <button type="button" className="receipt-link" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Back</button>
            <div className="receipt-action-buttons">
              <BoutiqueButton onClick={downloadReceipt} style={{ width: "auto" }}>
                <DownloadSimple size={18} /> Save as PDF
              </BoutiqueButton>
            </div>
          </div>

          <article className="receipt-paper">
            <div className="receipt-brand">
              <div className="receipt-icon"><Receipt size={30} weight="fill" /></div>
              <div>
                <p className="receipt-eyebrow">Official E-Receipt</p>
                <h1>Coldair ACT</h1>
              </div>
              <div className="receipt-status">
                <span>{(order.paymentStatus || "pending").toUpperCase()}</span>
                <strong>{order.receipt?.receiptNumber || "Pending"}</strong>
              </div>
            </div>

            <div className="receipt-band">
              <div>
                <span>Invoice Number</span>
                <strong>{order.invoice?.invoiceNumber || order.receipt?.receiptNumber || "Pending"}</strong>
              </div>
              <div>
                <span>Order Number / Transaction date</span>
                <strong>{order.orderCode} · {formatDateTime(order.invoice?.transactionDate || order.receipt?.issuedAt || order.createdAt)}</strong>
              </div>
            </div>

            <div className="receipt-grid">
              <div>
                <span>Customer</span>
                <strong>{order.invoice?.customer?.name || order.customerName}</strong>
                <small>{[order.invoice?.customer?.email, order.invoice?.customer?.phone].filter(Boolean).join(" · ") || "Contact pending"}</small>
              </div>
              <div>
                <span>Branch</span>
                <strong>{order.invoice?.branch || "Branch pending"}</strong>
              </div>
              <div>
                <span>Payment Method</span>
                <strong>{order.paymentProvider || order.paymentMethod || "Pending"}</strong>
                <small>{(order.invoice?.payment?.status || order.paymentStatus || "pending").toUpperCase()}</small>
              </div>
              <div>
                <span>Payment Reference</span>
                <strong>{order.paymentReference || "Pending"}</strong>
              </div>
              <DeliveryAddressDetails address={deliveryAddress} />
              <div>
                <span>Billing Address</span>
                <strong>{formatAddress(order.invoice?.billingAddress || order.address)}</strong>
              </div>
              <div>
                <span>Order / Delivery Status</span>
                <strong>{order.invoice?.orderStatus || "Pending"} · {order.tracking?.currentLabel || "Order Placed"}</strong>
              </div>
              <div>
                <span>Warranty / Installation</span>
                <strong>{order.invoice?.warranty || "Warranty activates after installation."}</strong>
                {order.invoice?.technician?.name && <small>{order.invoice.technician.name} · {order.invoice.technician.status}</small>}
              </div>
            </div>

            <div className="receipt-table-wrap">
              <table className="receipt-table">
                <thead>
                  <tr><th>Product / Model / Serial</th><th>Specs</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td><strong>{item.name}</strong><br /><small>{item.serialNumbers?.length ? `Serial: ${item.serialNumbers.join(", ")}` : "Serial pending"}</small></td>
                      <td>{item.specs || "-"}</td>
                      <td>{item.quantity}</td>
                      <td>{money(item.price)}</td>
                      <td>{money(Number(item.price || 0) * Number(item.quantity || 1))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="receipt-bottom">
              <div>
                <p>This invoice is tied to one order and one receipt record in the Coldair ACT system.</p>
                {order.tracking?.timeline?.length > 0 && (
                  <div className="receipt-tracking">
                    <strong>Delivery tracking</strong>
                    {order.tracking.timeline.map((step) => <span key={step.stage}>✓ {step.label}{step.timestamp ? ` · ${formatDateTime(step.timestamp)}` : ""}</span>)}
                  </div>
                )}
              </div>
              <div className="receipt-totals">
                <p><span>Subtotal</span><strong>{money(order.subtotalAmount)}</strong></p>
                <p><span>VAT</span><strong>{money(order.vatAmount)}</strong></p>
                <p><span>Delivery</span><strong>{money(order.shippingFee)}</strong></p>
                <p><span>Discount</span><strong>-{money(order.discountAmount)}</strong></p>
                <p className="receipt-grand-total"><span>Total Paid</span><strong>{money(order.totalAmount)}</strong></p>
              </div>
            </div>
          </article>
        </section>
      </main>

      <style>{`
        @page { size: A4; margin: 14mm; }
        .receipt-page { max-width: 1000px; margin: 0 auto; padding: 30px 20px 72px; color: #0f172a; }
        .receipt-shell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; }
        .receipt-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
        .receipt-link { display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: #2563eb; font-weight: 800; cursor: pointer; }
        .receipt-action-buttons { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .receipt-paper { background: #fff; border: 1px solid #dbe4ee; border-radius: 10px; overflow: hidden; box-shadow: 0 18px 50px rgba(15,23,42,.08); }
        .receipt-brand { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 14px; padding: 26px; border-bottom: 1px solid #e2e8f0; }
        .receipt-icon { width: 54px; height: 54px; border-radius: 14px; display: grid; place-items: center; background: #eff6ff; color: #2563eb; }
        .receipt-eyebrow { margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .receipt-brand h1 { margin: 0; font-size: 30px; line-height: 1; }
        .receipt-status { display: grid; gap: 6px; justify-items: end; text-align: right; }
        .receipt-status span { background: #ecfdf5; color: #047857; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 900; }
        .receipt-status strong { font-size: 18px; }
        .receipt-band { display: grid; grid-template-columns: 1fr 1fr; background: #0f172a; color: #fff; }
        .receipt-band div { padding: 18px 26px; display: grid; gap: 5px; }
        .receipt-band span, .receipt-grid span { color: #94a3b8; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .receipt-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; background: #e2e8f0; }
        .receipt-grid > div { background: #fff; padding: 18px 26px; display: grid; gap: 6px; min-width: 0; }
        .receipt-grid strong { overflow-wrap: anywhere; }
        .receipt-grid small, .receipt-table small { color: #64748b; font-size: 12px; overflow-wrap: anywhere; }
        .receipt-address-details { grid-column: 1 / -1; background: #fff; padding: 20px 26px; display: grid; gap: 12px; }
        .receipt-address-details > span { color: #94a3b8; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .receipt-address-details dl { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 26px; }
        .receipt-address-details dl div { display: grid; grid-template-columns: minmax(110px, 150px) 1fr; gap: 12px; align-items: baseline; }
        .receipt-address-details dt { color: #64748b; font-size: 12px; font-weight: 700; }
        .receipt-address-details dd { margin: 0; color: #0f172a; font-weight: 800; overflow-wrap: anywhere; }
        .receipt-table-wrap { padding: 24px 26px 0; overflow-x: auto; }
        .receipt-table { width: 100%; border-collapse: collapse; min-width: 640px; }
        .receipt-table th, .receipt-table td { padding: 13px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        .receipt-table th { color: #475569; background: #f8fafc; font-size: 12px; text-transform: uppercase; }
        .receipt-table td:nth-child(n+3), .receipt-table th:nth-child(n+3) { text-align: right; }
        .receipt-bottom { display: grid; grid-template-columns: 1fr minmax(280px, 380px); gap: 28px; padding: 24px 26px 28px; align-items: end; }
        .receipt-bottom > div > p { color: #64748b; line-height: 1.55; margin: 0; }
        .receipt-tracking { margin-top: 16px; display: grid; gap: 5px; color: #475569; font-size: 12px; }
        .receipt-tracking strong { color: #0f172a; text-transform: uppercase; font-size: 11px; letter-spacing: .06em; }
        .receipt-totals { display: grid; gap: 10px; }
        .receipt-totals p { display: flex; justify-content: space-between; gap: 18px; margin: 0; }
        .receipt-totals span { color: #64748b; }
        .receipt-grand-total { border-top: 2px solid #0f172a; padding-top: 12px; color: #2563eb; font-size: 20px; font-weight: 900; }
        @media print {
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .receipt-actions, header, .chat-widget, .customer-chatbot { display: none !important; }
          .receipt-page, .receipt-shell { padding: 0; max-width: none; border: 0; background: #fff; }
          .receipt-paper { border: 0; border-radius: 0; box-shadow: none; }
          .receipt-brand, .receipt-band, .receipt-grid, .receipt-table-wrap, .receipt-bottom { break-inside: avoid; }
          .receipt-table tr { break-inside: avoid; }
          .receipt-table { min-width: 0; }
        }
        @media (max-width: 700px) {
          .receipt-actions, .receipt-brand, .receipt-bottom { grid-template-columns: 1fr; display: grid; }
          .receipt-status { justify-items: start; text-align: left; }
          .receipt-band, .receipt-grid { grid-template-columns: 1fr; }
          .receipt-address-details dl { grid-template-columns: 1fr; }
          .receipt-address-details dl div { grid-template-columns: 1fr; gap: 3px; }
        }
      `}</style>
    </BoutiqueScreen>
  );
}

export default ReceiptView;
