import { pdfPageSlices } from './pdfDownload';

test('PDF pagination includes the final partial page but never adds an empty page', () => {
  expect(pdfPageSlices(1000, 1000)).toEqual([{ top: 0, height: 1000 }]);
  expect(pdfPageSlices(1001, 1000)).toEqual([
    { top: 0, height: 1000 }, { top: 1000, height: 1 },
  ]);
  expect(pdfPageSlices(0, 1000)).toEqual([]);
});

test('PDF pagination prefers a nearby row boundary over cutting a table row', () => {
  expect(pdfPageSlices(1900, 1000, [750, 930, 1500])).toEqual([
    { top: 0, height: 930 }, { top: 930, height: 970 },
  ]);
});

test('a row boundary does not split content that fits on the last page', () => {
  expect(pdfPageSlices(980, 1000, [930])).toEqual([{ top: 0, height: 980 }]);
  expect(pdfPageSlices(1900, 1000, [930, 1820])).toEqual([
    { top: 0, height: 930 }, { top: 930, height: 970 },
  ]);
});
