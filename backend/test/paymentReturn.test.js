const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/controllers/orderController'), 'utf8');
const extract = (name) => {
  const start = source.indexOf(`const ${name} =`);
  return source.slice(start, source.indexOf('\n};', start) + 3);
};
const app = require('../../bork5/caact-mobile/app.json').expo;
const context = {
  crypto: require('node:crypto'),
  process: { env: {} },
  envFrontendUrl: () => 'https://shop.example',
  escapeHtml: (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;'),
};
const { buildPaymentReturnUrls, handlePaymongoReturn, mobileDeepLinkForOrder } = vm.runInNewContext(
  ['normalizePaymentReturnTarget', 'mobileDeepLinkForOrder', 'buildRequestBaseUrl', 'buildPaymentReturnUrls', 'handlePaymongoReturn'].map(extract).join('\n') + '; ({ buildPaymentReturnUrls, handlePaymongoReturn, mobileDeepLinkForOrder });', context,
);

test('mobile checkout success and cancellation return through the HTTPS app bridge', () => {
  const urls = buildPaymentReturnUrls({ id: 'order123' }, { returnTarget: 'mobile', req: { get: (name) => name === 'host' ? 'api.example' : '', protocol: 'https' } });
  assert.equal(urls.successUrl, 'https://api.example/api/orders/order123/paymongo/return?payment=success&target=mobile');
  assert.equal(urls.cancelUrl, 'https://api.example/api/orders/order123/paymongo/return?payment=cancelled&target=mobile');
  assert.equal(mobileDeepLinkForOrder('order123', 'success'), `${app.scheme}://customer/order-confirmation/order123?payment=success`);
});

test('mobile return opens installed app without a forced website timeout', async () => {
  for (const payment of ['success', 'cancelled']) {
    let html = '';
    const headers = {};
    const response = { status() { return this; }, set(name, value) { headers[name] = value; return this; }, send(value) { html = value; } };
    await handlePaymongoReturn({ params: { orderId: 'order123' }, query: { target: 'mobile', payment } }, response);
    assert.ok(html.includes(`coldair://customer/order-confirmation/order123?payment=${payment}`));
    assert.ok(html.includes('Open Cold Air App'));
    assert.ok(html.includes('View order on website'));
    assert.ok(!html.includes('window.location.href = webUrl'));
    assert.ok(!html.includes('2400'));
    const nonce = html.match(/<script nonce="([^"]+)"/)[1];
    assert.ok(headers['Content-Security-Policy'].includes(`script-src 'nonce-${nonce}'`));
    assert.ok(headers['Content-Security-Policy'].includes(`style-src 'nonce-${nonce}'`));
    assert.ok(!headers['Content-Security-Policy'].includes('unsafe-inline'));
    assert.equal(headers['Cache-Control'], 'no-store');
  }
});

test('website checkout still returns to website', async () => {
  let destination;
  await handlePaymongoReturn({ params: { orderId: 'order123' }, query: { payment: 'success' } }, { redirect(status, url) { assert.equal(status, 302); destination = url; } });
  assert.equal(destination, 'https://shop.example/order-confirmation/order123?payment=success');
});
