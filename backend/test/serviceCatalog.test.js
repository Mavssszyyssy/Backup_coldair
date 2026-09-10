const test = require('node:test');
const assert = require('node:assert/strict');
const { getServiceCatalog, findServiceOffering } = require('../src/domain/serviceCatalog');

test('customer catalogue separates cleaning and excludes delivery/installation', () => {
  const catalog = getServiceCatalog();
  assert.deepEqual(catalog.map(item => item.title), ['Regular Cleaning', 'Deep Cleaning', 'Repair', 'Consultation']);
  assert.equal(findServiceOffering(catalog, 'delivery'), null);
  assert.equal(findServiceOffering(catalog, 'installation'), null);
  assert.equal(findServiceOffering(catalog, 'regular_cleaning').id, 'maintenance');
  assert.equal(findServiceOffering(catalog, 'deep_cleaning').id, 'cleaning');
});

test('configured cleaning prices and IDs survive relabeling, including canonical IDs', () => {
  for (const [id, title] of [['maintenance', 'Regular Cleaning'], ['cleaning', 'Deep Cleaning'], ['regular_cleaning', 'Regular Cleaning'], ['deep_cleaning', 'Deep Cleaning']]) {
    const catalog = getServiceCatalog(JSON.stringify([{ id, title: 'Old label', basePrice: 800 }]));
    assert.equal(catalog[0].title, title);
    assert.equal(catalog[0].defaultIssueType, title);
    assert.equal(catalog[0].pricing.basePrice, 800);
    assert.equal(findServiceOffering(catalog, id).id, id);
  }
});

test('old configured offerings cannot reintroduce removed request types', () => {
  const catalog = getServiceCatalog(JSON.stringify([
    { id: 'delivery', title: 'Delivery' }, { id: 'installation', title: 'Installation' },
    { id: 'legacy-install', title: 'Installation' }, { id: 'repair', title: 'Repair', basePrice: 900 }
  ]));
  assert.deepEqual(catalog.map(item => item.id), ['repair']);
  assert.equal(catalog[0].pricing.basePrice, 900);
  assert.deepEqual(getServiceCatalog(JSON.stringify([{ id: 'installation', title: 'Installation' }])), []);
});
