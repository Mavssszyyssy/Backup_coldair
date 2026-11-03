import { translateText } from './customerI18n';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('customer settings and address labels switch between English and Filipino without changing records', () => {
  expect(translateText('Delivery Addresses', 'Filipino')).toBe('Mga Address ng Paghahatiran');
  expect(translateText('Save Privacy Settings', 'Filipino')).toBe('I-save ang mga Setting sa Pagkapribado');
  expect(translateText('Delivery Addresses', 'English')).toBe('Delivery Addresses');
  expect(translateText('Andrei Tupas', 'Filipino')).toBe('Andrei Tupas');
});

test('role navigation and AMP labels switch both ways while unknown text falls back unchanged', () => {
  const labels = [
    ['Inventory', 'Imbentaryo'],
    ['Work Orders', 'Mga Work Order'],
    ['Analytics & Reports', 'Analytics at Mga Ulat'],
    ['Service window', 'Panahon ng serbisyo'],
    ['Maintenance assessment', 'Pagsusuri sa maintenance'],
  ];
  labels.forEach(([english, filipino]) => {
    expect(translateText(english, 'Filipino')).toBe(filipino);
    expect(translateText(english, 'English')).toBe(english);
  });
  expect(translateText('Original technician note: compressor checked', 'Filipino'))
    .toBe('Original technician note: compressor checked');
});

test('mobile uses the generated copy of the same translation catalog', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/utils/customerI18n.js'), 'utf8');
  const mobile = readFileSync(resolve(process.cwd(), '../bork5/caact-mobile/services/interfaceI18n.js'), 'utf8');
  expect(mobile).toBe(source);
});

test('technician work-order filters, statuses, and actions use stable Filipino labels', () => {
  const labels = ['Filter work orders', 'Search work orders', 'Awaiting Admin', 'In Progress', 'On Hold', 'Clear Filters', 'Open Work Order', 'No matching work orders', 'Previous', 'Next'];
  labels.forEach((label) => {
    expect(translateText(label, 'Filipino')).not.toBe(label);
    expect(translateText(label, 'English')).toBe(label);
  });
});

test('new customer, technician, Superadmin, and AMP controls have Filipino entries', () => {
  const labels = [
    'Send a Support Message', 'Selected Support Message', 'Contact Channels',
    'Close this visit', 'Submit visit attempt', 'Assignments and service updates',
    'Active Products', 'Archived Products', 'Add product and generate serials',
    'Assign branch accountability', 'Save coverage',
    'Parts and future-issue assessment', 'Report generator', 'Close follow-up details',
  ];
  labels.forEach((label) => {
    expect(translateText(label, 'Filipino')).not.toBe(label);
    expect(translateText(label, 'English')).toBe(label);
  });
});

test('customer order and onboarding labels switch language while identifiers stay unchanged', () => {
  const labels = [
    'Order Center', 'ORDER PROGRESS', 'Request Cancellation', 'Payment due on delivery',
    'View my orders', 'Account Ready', 'Technician Setup', 'Save and Continue',
  ];
  labels.forEach((label) => {
    expect(translateText(label, 'Filipino')).not.toBe(label);
    expect(translateText(label, 'English')).toBe(label);
  });
  expect(translateText('ORD-1792234177578-ZOON23', 'Filipino')).toBe('ORD-1792234177578-ZOON23');
  expect(translateText('Stephen Curry', 'Filipino')).toBe('Stephen Curry');
});

test('technician completion, QR verification, and assessment controls translate without altering findings', () => {
  const labels = [
    'Verify AC unit', 'Room capacity check', 'Complete installation',
    'Customer & Schedule', 'Confirm customer presence',
    'Assessment summary', 'Possible next issue', 'Generate AI assessment',
    'Confirm service cash collected',
  ];
  labels.forEach((label) => {
    expect(translateText(label, 'Filipino')).not.toBe(label);
    expect(translateText(label, 'English')).toBe(label);
  });
  expect(translateText('Compressor pressure 35 PSI', 'Filipino')).toBe('Compressor pressure 35 PSI');
  expect(translateText('CAACT-FIXTURE', 'Filipino')).toBe('CAACT-FIXTURE');
});
