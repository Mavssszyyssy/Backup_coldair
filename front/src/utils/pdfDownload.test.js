import { measurePdfReport, pdfPageSlices } from './pdfDownload';

const bounds = (start, end) => ({ start, end });
const positions = (pages) => pages.map(({ top, height }) => [top, height]);

test('a short report and a final partial page use only the necessary pages', () => {
  expect(positions(pdfPageSlices(980, 1000, { keepTogether: [bounds(930, 975)] }))).toEqual([[0, 980]]);
  expect(positions(pdfPageSlices(1001, 1000))).toEqual([[0, 1000], [1000, 1]]);
  expect(pdfPageSlices(0, 1000)).toEqual([]);
});

test('moves a table title, column headings, and first row together even when the break is early', () => {
  const pages = pdfPageSlices(1600, 1000, {
    keepTogether: [bounds(680, 1040), bounds(905, 1040), bounds(1040, 1175)],
    tables: [{ headerTop: 850, bodyTop: 905, bodyEnd: 1175 }],
  });
  expect(positions(pages)).toEqual([[0, 680], [680, 920]]);
  expect(pages[1].headerHeight).toBe(0);
});

test('repeats the correct headings and reserves their space before breaking at whole rows', () => {
  const pages = pdfPageSlices(2600, 1000, {
    keepTogether: [bounds(970, 1070), bounds(1910, 2010), bounds(2470, 2600)],
    tables: [
      { headerTop: 235, bodyTop: 280, bodyEnd: 1300 },
      { headerTop: 1400, bodyTop: 1460, bodyEnd: 2440 },
    ],
  });
  expect(positions(pages)).toEqual([[0, 970], [970, 940], [1910, 690]]);
  expect(pages.map(({ headerTop, headerHeight }) => [headerTop, headerHeight])).toEqual([
    [undefined, 0], [235, 45], [1400, 60],
  ]);
});

test('keeps the signature and footer together at the end of a report', () => {
  const pages = pdfPageSlices(1060, 1000, { keepTogether: [bounds(915, 1060)] });
  expect(positions(pages)).toEqual([[0, 915], [915, 145]]);
});

test('allows an oversized block to continue across pages without splitting its smaller rows', () => {
  const pages = pdfPageSlices(1850, 1000, {
    keepTogether: [bounds(80, 1550), bounds(940, 1100), bounds(1100, 1250)],
    tables: [{ headerTop: 100, bodyTop: 140, bodyEnd: 1550 }],
  });
  expect(positions(pages)).toEqual([[0, 940], [940, 910]]);
  expect(pages[1].headerHeight).toBe(40);
});

const measuredDocument = (html, positions) => {
  const element = document.createElement('main');
  element.innerHTML = html;
  for (const [selector, [top, bottom]] of Object.entries(positions)) {
    element.querySelector(selector).getBoundingClientRect = () => ({ top, bottom });
  }
  return element;
};

test('keeps section heading chains with their first paragraph at an actual measured page boundary', () => {
  const element = measuredDocument('<h2>Inventory intelligence</h2><h3>Inventory performance</h3><p>Recorded stock and actions.</p>', {
    h2: [440, 470], h3: [480, 500], p: [510, 560],
  });
  expect(positions(pdfPageSlices(1120, 1000, measurePdfReport(element, 0, 1000))))
    .toEqual([[0, 880], [880, 240]]);
});

test('moves the final short analysis with its signature instead of leaving a signature-only page', () => {
  const element = measuredDocument('<div class="report-content"><section class="report-section report-section--splittable">Final analysis</section></div><section class="signature-section">Prepared by</section><footer class="report-footer">Report details</footer>', {
    '.report-section': [340, 540], '.signature-section': [550, 580], '.report-footer': [590, 600],
  });
  expect(positions(pdfPageSlices(1200, 1000, measurePdfReport(element, 0, 1000))))
    .toEqual([[0, 680], [680, 520]]);
});

test('includes the table caption when repeating headings on a continuation page', () => {
  const element = measuredDocument('<h3>Inventory movement</h3><table><thead><tr><th>Product</th></tr></thead><tbody><tr><td>First</td></tr><tr><td>Last</td></tr></tbody></table>', {
    h3: [20, 40], thead: [45, 70], 'tbody tr:first-child': [70, 110], 'tbody tr:last-child': [110, 150],
  });
  expect(measurePdfReport(element, 0, 1000).tables).toEqual([{ headerTop: 40, bodyTop: 140, bodyEnd: 300 }]);
});
