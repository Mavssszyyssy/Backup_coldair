import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MobileLegalConsent from './MobileLegalConsent';
import { LEGAL_DOCUMENTS } from '../../services/legalConsent';
function Fixture() { const [value, setValue] = useState({}); return <MobileLegalConsent value={value} onChange={setValue} />; }
test('all documents open independently; returning preserves selection without auto-acceptance', async () => {
  await render(<Fixture />);
  for (const doc of LEGAL_DOCUMENTS) {
    expect(screen.getByLabelText(doc.action).props.accessibilityState.checked).toBe(false);
    await fireEvent.press(screen.getByLabelText(`Read ${doc.title}`));
    expect(screen.getByText(/Last updated:/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Back to signup'));
    expect(screen.getByLabelText(doc.action).props.accessibilityState.checked).toBe(false);
    await fireEvent.press(screen.getByLabelText(doc.action));
  }
  for (const doc of LEGAL_DOCUMENTS) expect(screen.getByLabelText(doc.action).props.accessibilityState.checked).toBe(true);
});
