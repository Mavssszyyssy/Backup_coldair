import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 10;
const RENDER_SCALE = 2;

export const pdfPageSlices = (height, pagePixels, { keepTogether = [], tables = [] } = {}) => {
  const slices = [];
  for (let top = 0; top < height;) {
    const table = tables.find(({ bodyTop, bodyEnd }) => bodyTop <= top && top < bodyEnd);
    const headerHeight = table ? table.bodyTop - table.headerTop : 0;
    const space = pagePixels - headerHeight;
    let end = Math.min(height, top + space);

    // Move a cut back to the start of any row or group it intersects. A
    // block taller than a page can flow, but its smaller children still fit.
    for (let block; (block = keepTogether.find(({ start, end: bottom }) =>
      start > top && start < end && end < bottom && bottom - start <= space
    ));) {
      end = block.start;
    }

    slices.push({ top, height: end - top, headerTop: table?.headerTop, headerHeight });
    top = end;
  }
  return slices;
};

const measureReport = (element, rootTop, pagePixels) => {
  const position = (y) => Math.round((y - rootTop) * RENDER_SCALE);
  const bounds = (node) => {
    const { top, bottom } = node.getBoundingClientRect();
    return { start: position(top), end: position(bottom) };
  };
  const keepTogether = Array.from(element.querySelectorAll(
    '.report-header, .report-title, .summary-item, .report-section:not(.report-section--splittable), '
    + '.report-field, .history-entry, p, li, tbody tr, .report-footer',
  ), bounds);
  const signature = element.querySelector('.signature-section');
  const footer = element.querySelector('.report-footer');
  if (signature) {
    keepTogether.push({ start: bounds(signature).start, end: bounds(footer || signature).end });
  }

  const tables = [];
  for (const table of element.querySelectorAll('table')) {
    const rows = Array.from(table.tBodies).flatMap((body) => Array.from(body.rows));
    if (!table.tHead || !rows.length) continue;
    const headerTop = bounds(table.tHead).start;
    const firstRow = bounds(rows[0]);
    const title = table.previousElementSibling;
    const titleTop = title?.matches('h2, h3, .report-section-heading') ? bounds(title).start : headerTop;
    keepTogether.push({ start: titleTop, end: firstRow.end });

    if (firstRow.start - headerTop < pagePixels) {
      tables.push({ headerTop, bodyTop: firstRow.start, bodyEnd: bounds(rows.at(-1)).end });
    }
  }

  return { keepTogether, tables };
};

export const downloadElementPdf = async ({ element, fileName, orientation = 'portrait' }) => {
  if (!element) throw new Error('The document is not ready to export. Please try again.');
  await element.ownerDocument.fonts?.ready;
  await Promise.all(Array.from(element.querySelectorAll('img')).map((image) => image.decode?.().catch(() => {}) || Promise.resolve()));

  const root = element.getBoundingClientRect();
  const width = Math.ceil(root.width);
  const height = Math.ceil(root.height * RENDER_SCALE);
  if (!width || !height) throw new Error('The document could not be rendered as a PDF.');

  const renderStrip = (top, stripHeight) => html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: RENDER_SCALE,
    width,
    y: top / RENDER_SCALE,
    height: stripHeight / RENDER_SCALE,
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
  });
  const landscape = orientation === 'landscape';
  const pageWidth = landscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const pageHeight = landscape ? A4_WIDTH_MM : A4_HEIGHT_MM;
  const contentWidth = pageWidth - 2 * MARGIN_MM;
  const contentHeight = pageHeight - 2 * MARGIN_MM;
  const pixelsPerMm = width * RENDER_SCALE / contentWidth;
  const pagePixels = Math.max(1, Math.floor(contentHeight * pixelsPerMm));
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
  const pages = pdfPageSlices(height, pagePixels, measureReport(element, root.top, pagePixels));
  const headerImages = new Map();

  for (const [page, slice] of pages.entries()) {
    const body = await renderStrip(slice.top, slice.height);
    if (!body.width || !body.height) throw new Error('The document could not be rendered as a PDF.');
    if (page) pdf.addPage('a4', orientation);
    if (slice.headerHeight) {
      if (!headerImages.has(slice.headerTop)) {
        const header = await renderStrip(slice.headerTop, slice.headerHeight);
        headerImages.set(slice.headerTop, header.toDataURL('image/jpeg', 0.96));
      }
      pdf.addImage(headerImages.get(slice.headerTop), 'JPEG', MARGIN_MM, MARGIN_MM, contentWidth, slice.headerHeight / pixelsPerMm);
    }
    pdf.addImage(body.toDataURL('image/jpeg', 0.96), 'JPEG', MARGIN_MM,
      MARGIN_MM + slice.headerHeight / pixelsPerMm, contentWidth, slice.height / pixelsPerMm);
  }

  pdf.save(fileName || 'aeropulse-document.pdf');
  return true;
};
