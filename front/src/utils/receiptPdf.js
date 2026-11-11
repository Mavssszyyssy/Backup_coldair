import { jsPDF } from 'jspdf';

const money = (value) => `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clean = (value) => String(value ?? '').trim();

// Draw the receipt as selectable PDF text. The browser preview remains separate.
export function downloadReceiptPdf({ order, address, paymentMethod, paymentStatus, reference, totalLabel, fileName, t = (value) => value }) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 20;
  const right = 190;
  const width = right - left;
  let y = 24;
  const pageBottom = 275;
  const page = () => { pdf.addPage(); y = 24; };
  const rule = () => { pdf.setDrawColor(215, 225, 235); pdf.line(left, y, right, y); y += 7; };
  const line = (label, value) => {
    if (!clean(value)) return;
    const labelText = `${t(label)}: `;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    const labelWidth = pdf.getTextWidth(labelText);
    const lines = pdf.splitTextToSize(clean(value), width - labelWidth);
    if (y + lines.length * 5 > pageBottom) page();
    pdf.text(labelText, left, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(lines, left + labelWidth, y);
    y += Math.max(6, lines.length * 5 + 2);
  };
  const section = (heading) => {
    if (y + 15 > pageBottom) page();
    y += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 35, 59);
    pdf.text(t(heading), left, y);
    y += 7;
  };

  pdf.setTextColor(15, 35, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('COLD AIR ACT', left, y);
  y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Cold Air Conditioning Trading  |  www.coldair-act.online', left, y);
  y += 7;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(t('Official E-Receipt'), left, y);
  y += 9;
  rule();
  line('Receipt Number', reference);
  line('Order number', order.orderCode);
  line('Date issued', order.invoice?.transactionDate || order.receipt?.issuedAt || order.createdAt
    ? new Date(order.invoice?.transactionDate || order.receipt?.issuedAt || order.createdAt).toLocaleString('en-PH') : t('Pending'));

  section('Customer');
  line('Recipient', address.name || order.invoice?.customer?.name || order.customerName);
  line('Contact number', address.phone || order.invoice?.customer?.phone);
  line('Branch', order.invoice?.branch);
  line('Delivery Address', address.formatted || [address.street, address.barangay, address.city, address.province, address.region, address.postalCode].filter(Boolean).join(', '));
  section('Payment');
  line('Payment Method', paymentMethod);
  line('Payment Status', paymentStatus);
  line('Payment Reference', order.paymentReference || order.receipt?.paymentReference || order.paymongo?.paymentId || t('Pending'));
  section('Delivery');
  line('Billing Address', order.invoice?.billingAddress?.formatted || [order.invoice?.billingAddress?.street, order.invoice?.billingAddress?.barangay, order.invoice?.billingAddress?.city, order.invoice?.billingAddress?.province, order.invoice?.billingAddress?.region, order.invoice?.billingAddress?.postalCode].filter(Boolean).join(', ') || t('Same as delivery'));
  line('Delivery progress', order.tracking?.currentLabel || order.invoice?.orderStatus);
  line('Warranty / Installation', order.invoice?.warranty);
  if (order.invoice?.technician?.name) line('Technician', `${order.invoice.technician.name} · ${order.invoice.technician.status || ''}`);

  section('Purchased items');
  for (const item of order.items || []) {
    const itemName = clean(item.name) || t('Product');
    const quantity = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const description = pdf.splitTextToSize(itemName, width);
    const detail = `${t('Qty')}: ${quantity} × ${money(price)}  |  ${t('Total')}: ${money(price * quantity)}`;
    const detailRows = pdf.splitTextToSize(detail, width);
    if (y + (description.length + detailRows.length) * 5 + 9 > pageBottom) page();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(description, left, y);
    y += description.length * 5 + 1;
    pdf.setTextColor(80, 95, 110);
    pdf.setFontSize(8);
    pdf.text(detailRows, left, y);
    y += detailRows.length * 5 + 2;
    pdf.setTextColor(15, 35, 59);
    if (item.specs) line('Specs', item.specs);
    if (item.serialNumbers?.length) line('Serial', item.serialNumbers.join(', '));
  }
  y += 4;
  rule();
  line('Subtotal', money(order.subtotalAmount));
  line('VAT', money(order.vatAmount));
  line('Delivery', money(order.shippingFee));
  if (Number(order.discountAmount || 0) > 0) line('Discount', `-${money(order.discountAmount)}`);
  line(totalLabel || (String(paymentStatus).toLowerCase().includes('due') ? 'Amount Due' : 'Total Paid'), money(order.totalAmount || order.total || order.receipt?.amountPaid));
  pdf.save(fileName);
}
