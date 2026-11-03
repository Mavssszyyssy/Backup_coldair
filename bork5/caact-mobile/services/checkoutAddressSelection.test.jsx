import { checkoutFingerprint, getAddressForOrder, validateBranchCart } from './checkoutAddressSelection';

const user = { addresses: [
  { id: 'a', street: 'Default Street', city: 'Malolos', province: 'Bulacan', isDefault: true },
  { id: 'b', street: 'Other Street', city: 'Bacoor', province: 'Cavite', isDefault: false },
] };

test('checkout selection uses a saved address for this order without changing account default', () => {
  const selected = getAddressForOrder(user, 'b');
  expect(selected.street).toBe('Other Street');
  expect(user.addresses[0].isDefault).toBe(true);
  expect(user.addresses[1].isDefault).toBe(false);
  expect(getAddressForOrder(user).street).toBe('Default Street');
});

test('changing the selected order address changes the idempotency fingerprint', () => {
  const cartItems = [{ id: 'product-1', quantity: 1 }];
  expect(checkoutFingerprint({ cartItems, address: getAddressForOrder(user, 'a'), paymentMethod: 'cod' }))
    .not.toBe(checkoutFingerprint({ cartItems, address: getAddressForOrder(user, 'b'), paymentMethod: 'cod' }));
});

test('idempotency fingerprint changes with customer, branch, price, or payment method', () => {
  const base = { cartItems: [{ id: 'product-1', quantity: 1, price: 100 }], address: getAddressForOrder(user, 'a'), paymentMethod: 'cod', customerId: 'customer-a', branch: 'Bulacan' };
  const original = checkoutFingerprint(base);
  expect(checkoutFingerprint({ ...base, customerId: 'customer-b' })).not.toBe(original);
  expect(checkoutFingerprint({ ...base, branch: 'Cavite' })).not.toBe(original);
  expect(checkoutFingerprint({ ...base, cartItems: [{ ...base.cartItems[0], price: 200 }] })).not.toBe(original);
  expect(checkoutFingerprint({ ...base, paymentMethod: 'gcash' })).not.toBe(original);
});

test('a changed delivery branch must independently fulfill the order', () => {
  const cart = [{ id: 'product-1', quantity: 2 }];
  expect(validateBranchCart(cart, [{ id: 'product-1', stock: 3, inStock: true, name: 'AC' }], 'Bulacan')).toHaveLength(1);
  expect(() => validateBranchCart(cart, [{ id: 'product-1', stock: 1, inStock: true, name: 'AC' }], 'Cavite'))
    .toThrow('The Cavite branch has only 1 unit(s)');
  expect(() => validateBranchCart(cart, [{ id: 'product-1', stock: 0, inStock: false, name: 'AC' }], 'Cavite'))
    .toThrow('no stock');
});
