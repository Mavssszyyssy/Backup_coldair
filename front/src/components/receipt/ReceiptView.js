import { DownloadSimple } from "@phosphor-icons/react";
import { paymentMethodLabel as methodLabel } from "../../domain/paymentMethodLabel";
import { receiptOrderName, receiptReferences, customerStatus } from "../../domain/customerLanguage";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { apiRequest } from "../../config/api";
import { downloadReceiptPdf } from "../../utils/receiptPdf";
import { translateText } from "../../utils/customerI18n";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueHeader from "../common/boutique/BoutiqueHeader";
import BoutiqueScreen from "../common/boutique/BoutiqueScreen";

const money = (value) => `PHP ${Number(value || 0).toLocaleString("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
const isConfirmedPaymentStatus = (status = "") =>
  ["paid", "verified", "complete", "completed"].some((value) => new RegExp(`\\b${value}\\b`).test(String(status).toLowerCase()));

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
  ["ZIP Code", address.postalCode],
].filter(([, value]) => String(value || "").trim());

function DeliveryAddressDetails({ address, t }) {
  const rows = deliveryAddressRows(address);
  return (
    <section className="receipt-address-details">
      <span>{t("Delivery Address Details")}</span>
      {rows.length ? (
        <dl>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{t(label)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : <strong>{t("Pending")}</strong>}
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
  status: String(order.status || ""),
  workflowStatus: String(order.workflowStatus || ""),
  paymentProvider: String(order.paymentProvider || order.receipt?.paymentProvider || ""),
  paymentReference: String(order.receipt?.paymentReference || order.paymongo?.paymentId || order.paymongo?.checkoutSessionId || ""),
  receiptAvailable: Boolean(order.receiptAvailable),
  codCollection: order.codCollection || {},
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
  const { user, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const isStaff = ["admin", "superadmin"].includes(user?.role);
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const backDestination = user?.role === "superadmin"
    ? "/superadmin/services"
    : user?.role === "admin"
      ? "/admin/services"
      : "/my-orders";
  const returnToWorkspace = () => navigate(backDestination, { replace: true });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    apiRequest(`/orders/${isStaff ? "" : "me/"}${encodeURIComponent(orderId)}`)
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
  }, [orderId, isStaff]);

  const downloadReceipt = async () => {
    setExportError("");
    setExporting(true);
    try {
      await downloadReceiptPdf({
        order,
        address: resolveDeliveryAddress(order),
        paymentMethod: paymentMethodLabel,
        paymentStatus: paymentStatusLabel,
        totalLabel,
        reference: references.receiptNumber,
        t,
        fileName: `cold-air-receipt-${String(order?.receipt?.receiptNumber || order?.orderCode || orderId).replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`,
      });
    } catch (downloadError) {
      setExportError(downloadError?.message || "Unable to download the PDF receipt. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const deliveryAddress = resolveDeliveryAddress(order || {});
  const references = receiptReferences(order?.invoice?.invoiceNumber || order?.receipt?.receiptNumber, order?.orderCode);
  const orderName = receiptOrderName(order?.items);
  const isCashOnDelivery = String(order?.paymentMethod || "").toLowerCase() === "cod";
  const isCompleted = Boolean(order?.codCollection?.collectedAt);
  const paymentMethodLabel = methodLabel(order?.paymentMethod || order?.receipt?.paymentMethod);
  const paymentStatusLabel = isCashOnDelivery
    ? isCompleted ? "Paid on delivery" : "Payment due on delivery"
    : String(order?.invoice?.payment?.status || order?.paymentStatus || "pending").replaceAll("_", " ");
  const isPaymentConfirmed = isCashOnDelivery
    ? isCompleted
    : isConfirmedPaymentStatus(paymentStatusLabel);
  const totalLabel = isPaymentConfirmed ? "Total Paid" : "Amount Due";
  const statusTone = isPaymentConfirmed ? "success" : ["failed", "cancelled", "expired"].some((status) => paymentStatusLabel.toLowerCase().includes(status)) ? "danger" : "pending";

  if (loading || error || !order || !order.receiptAvailable) {
    return (
      <BoutiqueScreen withHeader={false}>
        <BoutiqueHeader headingLevel={2} title={t("E-Receipt")} leftAction="back" onLeftAction={returnToWorkspace} />
        <main className="receipt-page">{loading ? t("Loading receipt...") : error ? t(error) : t(!order?.receiptAvailable ? "An official receipt will be available after payment is confirmed." : "Receipt not found.")}</main>
      </BoutiqueScreen>
    );
  }

  return (
    <BoutiqueScreen withHeader={false} className="bq-screen receipt-print-screen">
      <BoutiqueHeader headingLevel={2} title={t("E-Receipt")} leftAction="back" onLeftAction={returnToWorkspace} />
      <main className="receipt-page">
        <section className="receipt-shell">
          <div className="receipt-actions">
            <div className="receipt-action-buttons">
              <BoutiqueButton onClick={downloadReceipt} disabled={exporting} style={{ width: "auto" }}>
                <DownloadSimple size={18} /> {t(exporting ? "Preparing PDF..." : "Save as PDF")}
              </BoutiqueButton>
              <BoutiqueButton onClick={() => window.print()} style={{ width: "auto" }}>{t("Print")}</BoutiqueButton>
            </div>
          </div>

          {exportError ? <p role="alert" className="receipt-export-error">{t(exportError)}</p> : null}

          <article className="receipt-paper">
            <div className="receipt-brand">
              <img className="receipt-icon" src="/Cold%20Air%20Logo.jpg" alt="Cold Air logo" style={{ objectFit: "contain", background: "white" }} />
              <div>
                <p className="receipt-eyebrow">{t("Official E-Receipt")}</p>
                <h1>Coldair ACT</h1>
              </div>
            </div>

            <section className="receipt-payment-summary" aria-label={t("Payment summary")}>
              <div>
                <span>{t(totalLabel)}</span>
                <strong>{money(order.totalAmount)}</strong>
              </div>
              <div className="receipt-payment-method">
                <span>{t("Payment method")}</span>
                <strong>{t(paymentMethodLabel)}</strong>
              </div>
              <span className={`receipt-payment-state receipt-payment-state-${statusTone}`}>{t(paymentStatusLabel)}</span>
            </section>

            <div className="receipt-order-name">
              <span>{t("Order")}</span>
              <strong>{orderName}</strong>
            </div>

            <div className="receipt-band">
              <div>
                <span>{t("Receipt Number")}</span>
                <strong>{references.receiptNumber}</strong>
              </div>
              <div>
                <span>{t("Date issued")}</span>
                <strong>{t(formatDateTime(order.invoice?.transactionDate || order.receipt?.issuedAt || order.createdAt))}</strong>
                {references.orderNumber ? <><span>{t("Order number")}</span><strong>{references.orderNumber}</strong></> : null}
              </div>
            </div>

            <div className="receipt-grid">
              <div>
                <span>{t("Customer")}</span>
                <strong>{order.invoice?.customer?.name || order.customerName}</strong>
                <small>{[order.invoice?.customer?.email, order.invoice?.customer?.phone].filter(Boolean).join(" · ") || t("Contact pending")}</small>
              </div>
              <div>
                <span>{t("Branch")}</span>
                <strong>{order.invoice?.branch || t("Branch pending")}</strong>
              </div>
              <div>
                <span>{t("Payment Reference")}</span>
                <strong>{isCashOnDelivery ? t("Cash collected upon delivery") : order.paymentReference || t("Pending")}</strong>
              </div>
              <DeliveryAddressDetails address={deliveryAddress} t={t} />
              <div>
                <span>{t("Billing Address")}</span>
                <strong>{t(formatAddress(order.invoice?.billingAddress || order.address))}</strong>
              </div>
              <div>
                <span>{t("Delivery progress")}</span>
                <strong>{order.tracking?.currentLabel || customerStatus(order.invoice?.orderStatus || "Pending")}</strong>
              </div>
              <div>
                <span>{t("Warranty / Installation")}</span>
                <strong>{order.invoice?.warranty || t("Warranty activates after installation.")}</strong>
                {order.invoice?.technician?.name && <small>{order.invoice.technician.name} · {order.invoice.technician.status}</small>}
              </div>
            </div>

            <div className="receipt-table-wrap">
              <table className="receipt-table">
                <thead>
                  <tr><th>{t("Product / Model / Serial")}</th><th>{t("Specs")}</th><th>{t("Qty")}</th><th>{t("Unit Price")}</th><th>{t("Total")}</th></tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td><strong>{item.name}</strong><br /><small>{item.serialNumbers?.length ? `${t("Serial:")} ${item.serialNumbers.join(", ")}` : t("Serial pending")}</small></td>
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
                <p>{t("Keep this receipt for payment questions and warranty support.")}</p>
                {order.tracking?.timeline?.length > 0 && (
                  <div className="receipt-tracking">
                    <strong>{t("Delivery tracking")}</strong>
                    {order.tracking.timeline.map((step) => <span key={step.stage}>✓ {step.label}{step.timestamp ? ` · ${formatDateTime(step.timestamp)}` : ""}</span>)}
                  </div>
                )}
              </div>
              <div className="receipt-totals">
                <p><span>{t("Subtotal")}</span><strong>{money(order.subtotalAmount)}</strong></p>
                <p><span>{t("VAT")}</span><strong>{money(order.vatAmount)}</strong></p>
                <p><span>{t("Delivery")}</span><strong>{money(order.shippingFee)}</strong></p>
                <p><span>{t("Discount")}</span><strong>-{money(order.discountAmount)}</strong></p>
                <p className="receipt-grand-total"><span>{t(totalLabel)}</span><strong>{money(order.totalAmount)}</strong></p>
              </div>
            </div>
          </article>
        </section>
      </main>

      <style>{`
        .receipt-page { max-width: 1000px; margin: 0 auto; padding: 30px 20px 72px; color: #0f172a; }
        .receipt-shell { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; }
        .receipt-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-bottom: 16px; }
        .receipt-action-buttons { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .receipt-paper { background: #fff; border: 1px solid #dbe4ee; border-radius: 4px; overflow: hidden; box-shadow: none; }
        .receipt-brand { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 14px; padding: 26px; border-bottom: 1px solid #e2e8f0; }
        .receipt-icon { width: 54px; height: 54px; border-radius: 14px; display: grid; place-items: center; background: #eff6ff; color: #2563eb; }
        .receipt-eyebrow { margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .receipt-brand h1 { margin: 0; font-size: 30px; line-height: 1; }
        .receipt-status { display: grid; gap: 6px; justify-items: end; text-align: right; }
        .receipt-status span { padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 900; }
        .receipt-status-success, .receipt-payment-state-success { background: #ecfdf5; color: #047857; }
        .receipt-status-pending, .receipt-payment-state-pending { background: #fff7ed; color: #9a3412; }
        .receipt-status-danger, .receipt-payment-state-danger { background: #fef2f2; color: #b91c1c; }
        .receipt-payment-summary { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px 24px; padding: 20px 26px; background: #fff; border-bottom: 1px solid #e2e8f0; }
        .receipt-payment-summary > div { display: grid; gap: 5px; }
        .receipt-payment-summary span { color: #475569; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .receipt-payment-summary > div:first-child strong { color: #0f172a; font-size: 26px; line-height: 1.2; }
        .receipt-payment-method strong { color: #0f172a; font-size: 16px; }
        .receipt-payment-state { padding: 7px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .receipt-status strong { font-size: 18px; }
        .receipt-order-name { display: grid; gap: 4px; padding: 16px 26px; background: #fff; border-bottom: 1px solid #e2e8f0; }
        .receipt-order-name span { color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .receipt-order-name strong { color: #0f172a; font-size: 18px; overflow-wrap: anywhere; }
        .receipt-band { display: grid; grid-template-columns: 1fr 1fr; background: #fff; color: #0f172a; border-bottom: 1px solid #cbd5e1; }
        .receipt-band div { padding: 18px 26px; display: grid; gap: 5px; }
        .receipt-band span, .receipt-grid span { color: #475569; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .receipt-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; background: #fff; }
        .receipt-grid > div { background: #fff; padding: 18px 26px; display: grid; gap: 6px; min-width: 0; border-bottom: 1px solid #e2e8f0; }
        .receipt-grid strong { overflow-wrap: anywhere; }
        .receipt-grid small, .receipt-table small { color: #64748b; font-size: 12px; overflow-wrap: anywhere; }
        .receipt-address-details { grid-column: 1 / -1; background: #fff; padding: 20px 26px; display: grid; gap: 12px; }
        .receipt-address-details > span { color: #475569; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .receipt-address-details dl { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 26px; }
        .receipt-address-details dl div { display: grid; grid-template-columns: minmax(110px, 150px) 1fr; gap: 12px; align-items: baseline; }
        .receipt-address-details dt { color: #64748b; font-size: 12px; font-weight: 700; }
        .receipt-address-details dd { margin: 0; color: #0f172a; font-weight: 800; overflow-wrap: anywhere; }
        .receipt-table-wrap { padding: 24px 26px 0; overflow-x: auto; }
        .receipt-table { width: 100%; border-collapse: collapse; min-width: 640px; }
        .receipt-table th, .receipt-table td { padding: 13px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        .receipt-table th { color: #475569; background: #fff; font-size: 12px; text-transform: uppercase; }
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
          @page { size: A4; margin: 14mm; }
          html, body, #root, .App { background: #fff !important; color-scheme: light !important; }
          .receipt-print-screen, .receipt-print-screen > .bq-box {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }
          .receipt-print-screen header, .receipt-actions, .receipt-export-error,
          .customer-chatbot-root, .backend-connection-banner, .app-modal-overlay { display: none !important; }
          .receipt-page, .receipt-shell, .receipt-paper {
            margin: 0;
            padding: 0;
            max-width: none;
            border: 0;
            border-radius: 0;
            background: #fff;
            box-shadow: none;
            overflow: visible;
          }
          .receipt-paper { font-size: 10pt; }
          .receipt-brand, .receipt-payment-summary, .receipt-order-name, .receipt-band div,
          .receipt-grid > div, .receipt-address-details, .receipt-bottom { padding: 10px 14px; }
          .receipt-address-details dl div { grid-template-columns: minmax(75px, 34%) minmax(0, 1fr); }
          .receipt-table-wrap { padding: 10px 14px 0; overflow: visible; }
          .receipt-table { min-width: 0; }
          .receipt-table thead { display: table-header-group; }
          .receipt-table th, .receipt-table td { padding: 8px; overflow-wrap: anywhere; }
          .receipt-brand, .receipt-payment-summary, .receipt-band, .receipt-grid > div,
          .receipt-address-details dl div, .receipt-table tr, .receipt-bottom { break-inside: avoid; }
        }
        @media screen and (max-width: 700px) {
          .receipt-actions, .receipt-brand, .receipt-bottom { grid-template-columns: 1fr; display: grid; }
          .receipt-payment-summary { align-items: flex-start; }
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
