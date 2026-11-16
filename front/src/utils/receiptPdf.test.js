// @vitest-environment node
import { expect, it } from 'vitest';
import { createReceiptPdf } from './receiptPdf';

const receipt = (items = []) => ({
  order: { items, totalAmount: 38895.25 },
  orderName: 'Windfree Wallmount',
  paymentMethod: 'Cash on Delivery',
  paymentStatus: 'Payment due on delivery',
  totalLabel: 'Amount Due',
  statusTone: 'pending',
  reference: 'RCP-ORD-100',
  issuedAt: '11/16/2026',
  details: [[['Recipient', 'QA Customer'], ['Branch', 'Bulacan']]],
  tracking: ['Order placed'],
});

it('includes payment, customer, and tracking details as selectable text', () => {
  const pdf = createReceiptPdf(receipt());
  const output = pdf.output();
  expect(pdf.getNumberOfPages()).toBe(1);
  expect(output).toContain('(Official E-Receipt)');
  expect(output).toContain('(Amount Due)');
  expect(output).toContain('(PHP 38,895.25)');
  expect(output).toContain('(Payment due on delivery)');
  expect(output).toContain('(QA Customer)');
  expect(output).toContain('(Order placed)');
  expect(output).not.toContain('(Total Paid)');
});

it('repeats the item headings and keeps the final serial when the item list spans pages', () => {
  const items = Array.from({ length: 80 }, (_, index) => ({
    name: `Air Conditioner ${index + 1}`, quantity: 1, price: 38895.25,
    specs: '1.5 HP', serialNumbers: [`SERIAL-QA-${index + 1}`],
  }));
  const pdf = createReceiptPdf(receipt(items));
  const output = pdf.output();
  expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
  expect(output.match(/\(Product \/ Model \/ Serial\)/g).length).toBeGreaterThan(1);
  expect(output).toContain('(Air Conditioner 80)');
  expect(output).toContain('(Serial: SERIAL-QA-80)');
});
