const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');
const Notification = require('../src/models/Notification');
const { notifyOperationalStaff } = require('../src/services/operationalNotificationService');
test('transactions, requests and maintenance reach the matching branch admin and Superadmin', async (t) => {
  const users = [
    { _id: '000000000000000000000001', role: 'admin', assignedBranch: 'Cavite' },
    { _id: '000000000000000000000002', role: 'admin', assignedBranch: 'Bulacan' },
    { _id: '000000000000000000000003', role: 'superadmin' },
    { _id: '000000000000000000000004', role: 'admin' },
  ];
  t.mock.method(User, 'find', () => ({ select: async () => users }));
  t.mock.method(Notification, 'findOne', () => ({ sort: async () => null }));
  const create = t.mock.method(Notification, 'create', async (payload) => ({ ...payload, $locals: {} }));
  for (const type of ['order', 'payment', 'delivery', 'service', 'warranty', 'technician']) {
    await notifyOperationalStaff({ branch: 'Cavite', type, title: 'Test event', message: 'Event details', dedupeKey: type });
    const recipients = create.mock.calls.slice(-2).map((call) => call.arguments[0]);
    assert.deepEqual(recipients.map((item) => item.user), [users[0]._id, users[2]._id]);
    assert.ok(recipients.every((item) => item.unread && item.branch === 'Cavite' && item.type === type));
  }
  assert.equal(create.mock.callCount(), 12);
});
