import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SPACING } from '../../constants/theme';
import KeyboardAwareScrollView, { focusedFieldScrollOffset } from './KeyboardAwareScrollView';

test('focused multiline field scrolls above a resized keyboard viewport', () => {
  expect(focusedFieldScrollOffset({ fieldTop: 520, fieldHeight: 120, viewportTop: 80, viewportHeight: 480, scrollY: 200 })).toBe(312);
  expect(focusedFieldScrollOffset({ fieldTop: 180, fieldHeight: 50, viewportTop: 80, viewportHeight: 480, scrollY: 200 })).toBe(200);
  expect(focusedFieldScrollOffset({ fieldTop: 10, fieldHeight: 50, viewportTop: 80, viewportHeight: 480, scrollY: 20 })).toBe(0);
});

test('uses compact bottom spacing with the keyboard closed and preserves explicit clearance', async () => {
  const form = (props = {}) => <KeyboardAwareScrollView testID="form-scroll" {...props}><Text>Form</Text></KeyboardAwareScrollView>;
  const { rerender } = await render(form());
  const bottomPadding = () => StyleSheet.flatten(screen.getByTestId('form-scroll').props.contentContainerStyle).paddingBottom;

  expect(bottomPadding()).toBe(SPACING.md);
  await rerender(form({ minBottomPadding: 34 }));
  expect(bottomPadding()).toBe(34);
  await rerender(form({ contentContainerStyle: [{ padding: 12 }, { paddingBottom: 40 }] }));
  expect(bottomPadding()).toBe(40);
});
