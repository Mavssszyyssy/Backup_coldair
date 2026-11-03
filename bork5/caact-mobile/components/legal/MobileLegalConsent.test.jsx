import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MobileLegalConsent from './MobileLegalConsent';
import { LEGAL_DOCUMENTS } from '../../services/legalConsent';
let mockLanguage = 'English';
jest.mock('../../hooks/useInterfaceLanguage', () => ({ useInterfaceLanguage: () => ({ t: value => require('../../services/interfaceI18n').translateText(value, mockLanguage) }) }));
function Fixture() {
  const [value, setValue] = useState({});
  return <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
    <MobileLegalConsent value={value} onChange={setValue} />
  </SafeAreaProvider>;
}
test('closing each reviewed document automatically marks its review complete', async () => {
  mockLanguage = 'English';
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
}, 20000);

test('Filipino legal controls keep the recorded consent identifiers unchanged', async () => {
  mockLanguage = 'Filipino';
  await render(<Fixture />);
  expect(screen.getByText('Mga Tuntunin at Kundisyon ng App')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Basahin ang Mga Tuntunin at Kundisyon ng App'));
  expect(screen.getByText(/Huling na-update:/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Bumalik sa pagpaparehistro'));
  expect(screen.getByLabelText('Sumasang-ayon ako sa mga Tuntunin at Kundisyon ng App').props.accessibilityState.checked).toBe(true);
});
