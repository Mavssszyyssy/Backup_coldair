import { jsPDF } from 'jspdf';

export const RECEIPT_LOGO_URL = '/Cold%20Air%20Logo.jpg';

const INK = '#0f172a';
const MUTED = '#475569';
const BLUE = '#1e40af';
const LINE = '#dbe5f1';
const SOFT = '#f3f7fc';
const STATUS = {
  success: ['#ecfdf5', '#047857'],
  pending: ['#fff7ed', '#9a3412'],
  danger: ['#fef2f2', '#b91c1c'],
};
const money = (value) => `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function createReceiptPdf({
  order, orderName, paymentMethod, paymentStatus, totalLabel, statusTone, reference, orderNumber, issuedAt,
  details, tracking = [], logo, t = (value) => value,
}) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', putOnlyUsedFonts: true });
  const left = 14;
  const width = 182;
  const right = left + width;
  const bottom = 278;
  const leading = 4.1;
  let y = 14;

  const font = (size, bold = false, color = INK) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(color);
  };
  const wrap = (value, maxWidth, size, bold) => {
    font(size, bold);
    return pdf.splitTextToSize(String(value ?? ''), maxWidth);
  };
  const text = (value, x, baseline, size, bold, color, align = 'left') => {
    font(size, bold, color);
    pdf.text(value, x, baseline, { align, lineHeightFactor: leading * pdf.internal.scaleFactor / size });
  };
  const fill = (color, x, top, w, h, radius = 0) => {
    pdf.setFillColor(color);
    if (radius) pdf.roundedRect(x, top, w, h, radius, radius, 'F');
    else pdf.rect(x, top, w, h, 'F');
  };
  const rule = (top) => {
    pdf.setDrawColor(LINE);
    pdf.line(left, top, right, top);
  };
  const nextPage = () => {
    pdf.addPage();
    text('COLD AIR ACT', left, 16, 11, true, BLUE);
    text(reference, right, 16, 8, false, MUTED, 'right');
    rule(20);
    y = 25;
  };
  const reserve = (height) => {
    if (y + height > bottom) nextPage();
  };

  if (logo) pdf.addImage(logo, 'JPEG', left, y, 14, 14);
  const brandLeft = left + (logo ? 18 : 0);
  text(t('Official E-Receipt'), brandLeft, y + 4, 9, true, BLUE);
  text('COLD AIR ACT', brandLeft, y + 11, 19, true);
  text('Cold Air Conditioning Trading  |  www.coldair-act.online', brandLeft, y + 16.5, 8, false, MUTED);
  y += 23;

  const [statusFill, statusInk] = STATUS[statusTone] || STATUS.pending;
  const method = wrap(t(paymentMethod), 48, 11, true);
  const state = wrap(t(paymentStatus), 45, 9, true);
  const amountLabel = wrap(t(totalLabel), 62, 8, true);
  const summaryHeight = Math.max(24, 13 + amountLabel.length * leading, 13 + method.length * leading, 12 + state.length * leading);
  fill(SOFT, left, y, width, summaryHeight, 3);
  text(amountLabel, left + 5, y + 7, 8, true, MUTED);
  text(money(order.totalAmount), left + 5, y + 9 + amountLabel.length * leading, 17, true, BLUE);
  text(t('Payment method'), left + 76, y + 7, 8, true, MUTED);
  text(method, left + 76, y + 13, 11, true);
  fill(statusFill, right - 56, y + 5, 51, 5 + state.length * leading, 2);
  text(state, right - 30.5, y + 10, 9, true, statusInk, 'center');
  y += summaryHeight + 6;

  const fields = (entries, shaded = false) => {
    const columns = entries.filter(([, value]) => value);
    if (!columns.length) return;
    const columnWidth = width / columns.length;
    const rows = columns.map(([label, value]) => ({
      label: wrap(t(label), columnWidth - 10, 8, true),
      value: wrap(value, columnWidth - 10, 9.5, true),
    }));
    const labelLines = Math.max(...rows.map((field) => field.label.length));
    const rowHeight = 9 + leading * (labelLines + Math.max(...rows.map((field) => field.value.length)));
    reserve(rowHeight);
    if (shaded) fill(SOFT, left, y, width, rowHeight, 2);
    rows.forEach((field, index) => {
      const x = left + 5 + columnWidth * index;
      text(field.label, x, y + 6, 8, true, MUTED);
      text(field.value, x, y + 7 + labelLines * leading, 9.5, true);
    });
    y += rowHeight;
    if (!shaded) rule(y);
  };

  fields([['Order', orderName]]);
  fields([['Receipt Number', reference], ['Date issued', issuedAt], ['Order number', orderNumber]], true);
  for (const row of details) fields(row);
  y += 6;

  const columns = [
    { label: 'Product / Model / Serial', width: 74, align: 'left' },
    { label: 'Specs', width: 24, align: 'left' },
    { label: 'Qty', width: 15, align: 'right' },
    { label: 'Unit Price', width: 34, align: 'right' },
    { label: 'Total', width: 35, align: 'right' },
  ].map((column, index, all) => {
    const start = left + all.slice(0, index).reduce((sum, entry) => sum + entry.width, 0);
    return { ...column, x: start + (column.align === 'right' ? column.width - 3 : 3) };
  });
  const tableHeadingLines = columns.map((column) => wrap(t(column.label), column.width - 6, 8, true));
  const tableHeadingHeight = 6 + leading * Math.max(...tableHeadingLines.map((lines) => lines.length));
  const tableHead = () => {
    fill(BLUE, left, y, width, tableHeadingHeight, 2);
    columns.forEach((column, index) => {
      text(tableHeadingLines[index], column.x, y + 5.5, 8, true, '#ffffff', column.align);
    });
    y += tableHeadingHeight;
  };

  let needsTableHeading = true;
  for (const [index, item] of (order.items || []).entries()) {
    const quantity = Number(item.quantity || 1);
    const cells = [
      item.name || t('Product'),
      item.specs || '-',
      quantity,
      money(item.price),
      money(Number(item.price || 0) * quantity),
    ];
    const cellLines = cells.map((value, column) => wrap(value, columns[column].width - 6, 9, column === 0));
    const serial = item.serialNumbers?.length ? `${t('Serial:')} ${item.serialNumbers.join(', ')}` : t('Serial pending');
    const nameCount = cellLines[0].length;
    cellLines[0].push(...wrap(serial, columns[0].width - 6, 8, false));
    const rowLines = Math.max(...cellLines.map((lines) => lines.length));
    const rowHeight = 5 + leading * rowLines;
    const fullRowFitsOnNewPage = 25 + tableHeadingHeight + rowHeight <= bottom;
    const rowStartHeight = fullRowFitsOnNewPage ? rowHeight : 5 + leading * 2;
    if (y + rowStartHeight + (needsTableHeading ? tableHeadingHeight : 0) > bottom) {
      nextPage();
      needsTableHeading = true;
    }
    if (needsTableHeading) {
      tableHead();
      needsTableHeading = false;
    }

    // Keep ordinary item rows together. Extremely long serial lists can continue.
    let offset = 0;
    while (offset < rowLines) {
      const lineCount = Math.min(rowLines - offset, Math.floor((bottom - y - 5) / leading));
      const height = 5 + lineCount * leading;
      if (index % 2 === 0) fill(SOFT, left, y, width, height);
      columns.forEach((column, columnIndex) => {
        cellLines[columnIndex].slice(offset, offset + lineCount).forEach((line, i) => {
          const name = columnIndex === 0 && offset + i < nameCount;
          const secondary = columnIndex === 0 && !name;
          text(line, column.x, y + 5 + i * leading, secondary ? 8 : 9, name, secondary ? MUTED : INK, column.align);
        });
      });
      y += height;
      rule(y);
      offset += lineCount;
      if (offset < rowLines) {
        nextPage();
        tableHead();
      }
    }
  }
  if (needsTableHeading) {
    reserve(tableHeadingHeight);
    tableHead();
  }

  y += 7;
  const totalRows = [
    ['Subtotal', money(order.subtotalAmount)],
    ['VAT', money(order.vatAmount)],
    ['Delivery', money(order.shippingFee)],
    ['Discount', `-${money(order.discountAmount)}`],
  ];
  const totalLeft = right - 85;
  const totalLabels = [...totalRows.map(([label]) => wrap(t(label), 45, 9, false)), wrap(t(totalLabel), 40, 10, true)];
  const noteWidth = totalLeft - left - 7;
  const note = wrap(t('Keep this receipt for payment questions and warranty support.'), noteWidth, 8, false);
  const trackingEntries = tracking.map((entry) => wrap(entry, noteWidth, 8, false));
  const totalsHeight = 12 + totalLabels.reduce((height, lines) => height + lines.length * leading + 2, 0);
  const noteHeight = 8 + note.length * leading + (trackingEntries.length ? 7 + trackingEntries[0].length * leading : 0);
  reserve(Math.max(totalsHeight, noteHeight));
  const bottomStart = y;
  totalRows.forEach(([, amount], index) => {
    text(totalLabels[index], totalLeft + 4, y + 4, 9, false, MUTED);
    text(amount, right - 4, y + 4, 9, true, INK, 'right');
    y += totalLabels[index].length * leading + 2;
  });
  y += 3;
  const grandLabel = totalLabels.at(-1);
  const grandHeight = 9 + leading * grandLabel.length;
  fill(SOFT, totalLeft, y, 85, grandHeight, 2);
  text(grandLabel, totalLeft + 4, y + 8, 10, true, BLUE);
  text(money(order.totalAmount), right - 4, y + 8, 12, true, BLUE, 'right');

  y = bottomStart + 4;
  text(note, left, y, 8, false, MUTED);
  y += note.length * leading + 2;
  if (trackingEntries.length) {
    text(t('Delivery tracking'), left, y, 9, true, BLUE);
    y += 5;
    for (const lines of trackingEntries) {
      reserve(lines.length * leading);
      text(lines, left, y, 8, false, MUTED);
      y += lines.length * leading;
    }
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    rule(283);
    text('www.coldair-act.online', left, 288, 8, false, MUTED);
    if (pageCount > 1) text(`${page} / ${pageCount}`, right, 288, 8, false, MUTED, 'right');
  }
  return pdf;
}

export async function downloadReceiptPdf(options) {
  let logo;
  try {
    const response = await fetch(RECEIPT_LOGO_URL);
    if (response.ok && response.headers.get('content-type')?.startsWith('image/jpeg')) {
      logo = new Uint8Array(await response.arrayBuffer());
    }
  } catch {
    // The wordmark and receipt remain available if the logo cannot be fetched.
  }
  createReceiptPdf({ ...options, logo }).save(options.fileName);
}
