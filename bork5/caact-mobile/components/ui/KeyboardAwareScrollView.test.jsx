import { focusedFieldScrollOffset } from './KeyboardAwareScrollView';

test('focused multiline field scrolls above a resized keyboard viewport', () => {
  expect(focusedFieldScrollOffset({ fieldTop: 520, fieldHeight: 120, viewportTop: 80, viewportHeight: 480, scrollY: 200 })).toBe(312);
  expect(focusedFieldScrollOffset({ fieldTop: 180, fieldHeight: 50, viewportTop: 80, viewportHeight: 480, scrollY: 200 })).toBe(200);
  expect(focusedFieldScrollOffset({ fieldTop: 10, fieldHeight: 50, viewportTop: 80, viewportHeight: 480, scrollY: 20 })).toBe(0);
});
