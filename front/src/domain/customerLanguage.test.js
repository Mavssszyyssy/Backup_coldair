import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { receiptReferences, customerStatus, customerSystemMessage } from './customerLanguage';

describe('customer-friendly display text', () => {
  it('keeps web and mobile rules identical', () => {
    expect(readFileSync('src/domain/customerLanguage.js', 'utf8')).toBe(readFileSync('../bork5/caact-mobile/services/customerLanguage.js', 'utf8'));
  });
  it.each([
    ['RCP-ORD-123', 'ORD-123', { receiptNumber: 'RCP-ORD-123', orderNumber: '' }],
    ['RCP-1', 'ORD-123', { receiptNumber: 'RCP-1', orderNumber: 'ORD-123' }],
    ['', 'ORD-123', { receiptNumber: 'ORD-123', orderNumber: '' }],
    ['ORD-123', 'ORD-123', { receiptNumber: 'ORD-123', orderNumber: '' }],
  ])('avoids repeated identifiers: %s', (receipt, order, expected) => expect(receiptReferences(receipt, order)).toEqual(expected));
  it('uses readable order states', () => expect(customerStatus('to_deliver')).toBe('Preparing for delivery'));
  it('preserves the difference between fallback and AI plans', () => {
    const fallback = customerSystemMessage("Insufficient service history. Default recommended cleaning interval: 6 months (180 days). This baseline is replaced when enough verified cleaning intervals become available.");
    expect(fallback).toContain('6 months (180 days)');
    expect(fallback).toContain('not enough completed cleaning visits');
    expect(customerSystemMessage('AI-estimated servicing interval: 180 days using 2 recorded cleaning intervals from same model history')).toContain('AI suggests cleaning 180 days');
  });
  it('does not rewrite findings or unrecognized messages', () => {
    const finding = 'Dust buildup on the air filter. Water was leaking from the drain line.';
    expect(customerSystemMessage(finding)).toBe(finding);
  });
});
