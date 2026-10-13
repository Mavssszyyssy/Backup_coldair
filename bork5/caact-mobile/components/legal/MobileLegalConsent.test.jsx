import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MobileLegalConsent from './MobileLegalConsent';
import { LEGAL_DOCUMENTS } from '../../services/legalConsent';
function Fixture() {
  const [value, setValue] = useState({});
  return <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
    <MobileLegalConsent value={value} onChange={setValue} />
  </SafeAreaProvider>;
}
test('closing each reviewed document automatically marks its review complete', async () => {
  await render(<Fixture />);
  for (const doc of LEGAL_DOCUMENTS) {
    expect(screen.getByLabelText(doc.action).props.accessibilityState.checked).toBe(false);
    await fireEvent.press(screen.getByLabelText(`Read ${doc.title}`));
    expect(screen.getByText(/Last updated:/)).toBeTruthy();
    expect(screen.getByTestId('legal-document-header')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Back to signup'));
    expect(screen.getByLabelText(doc.action).props.accessibilityState.checked).toBe(true);
  }
  for (const doc of LEGAL_DOCUMENTS) expect(screen.getByLabelText(doc.action).props.accessibilityState.checked).toBe(true);
});
