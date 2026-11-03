import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 10;

export const pdfPageSlices = (height, pagePixels, breakpoints = []) => {
  const slices = [];
  for (let top = 0; top < height;) {
    const limit = Math.min(height, top + pagePixels);
    const safeBreak = breakpoints.filter((point) => point > top + pagePixels * 0.72 && point <= limit).at(-1);
    const next = safeBreak || limit;
    slices.push({ top, height: next - top });
    top = next;
  }
  return slices;
};

const contentBreakpoints = (element, canvas) => {
  const root = element.getBoundingClientRect();
  if (!root.width) return [];
  const scale = canvas.width / root.width;
  return Array.from(element.querySelectorAll('tr, .report-section, .report-page, .history-entry, .receipt-band'))
    .map((node) => Math.floor((node.getBoundingClientRect().top - root.top) * scale))
    .filter((point) => point > 0 && point < canvas.height)
    .sort((left, right) => left - right);
};

export const downloadElementPdf = async ({ element, fileName, orientation = 'portrait' }) => {
  if (!element) throw new Error('The document is not ready to export. Please try again.');
  await element.ownerDocument.fonts?.ready;
  await Promise.all(Array.from(element.querySelectorAll('img')).map((image) => image.decode?.().catch(() => {}) || Promise.resolve()));

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
  });
  if (!canvas.width || !canvas.height) throw new Error('The document could not be rendered as a PDF.');

  const landscape = orientation === 'landscape';
  const pageWidth = landscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const pageHeight = landscape ? A4_WIDTH_MM : A4_HEIGHT_MM;
  const contentWidth = pageWidth - 2 * MARGIN_MM;
  const contentHeight = pageHeight - 2 * MARGIN_MM;
  const pixelsPerMm = canvas.width / contentWidth;
  const pagePixels = Math.max(1, Math.floor(contentHeight * pixelsPerMm));
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });

  for (const [page, { top, height: sliceHeight }] of pdfPageSlices(canvas.height, pagePixels, contentBreakpoints(element, canvas)).entries()) {
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceHeight;
    slice.getContext('2d').drawImage(canvas, 0, top, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    if (page) pdf.addPage('a4', orientation);
    pdf.addImage(slice.toDataURL('image/jpeg', 0.9), 'JPEG', MARGIN_MM, MARGIN_MM, contentWidth, sliceHeight / pixelsPerMm);
  }

  pdf.save(fileName || 'aeropulse-document.pdf');
  return true;
};
