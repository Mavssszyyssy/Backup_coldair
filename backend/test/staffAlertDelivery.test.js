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

test('cross-branch orders notify both involved admins and the owner once, not unrelated branches', async (t) => {
  const users = [
    { _id: '000000000000000000000001', role: 'admin', assignedBranch: 'Cavite' },
    { _id: '000000000000000000000002', role: 'admin', assignedBranch: 'Bulacan' },
    { _id: '000000000000000000000003', role: 'superadmin' },
    { _id: '000000000000000000000004', role: 'admin', assignedBranch: 'Laguna' },
    { _id: '000000000000000000000005', role: 'admin', assignedBranch: 'Cavite', notifications: { inApp: false } },
  ];
  t.mock.method(User, 'find', () => ({ select: async () => users }));
  t.mock.method(Notification, 'findOne', () => ({ sort: async () => null }));
  const create = t.mock.method(Notification, 'create', async payload => ({ ...payload, $locals: {} }));
  await notifyOperationalStaff({ branch: 'Cavite', branches: ['Bulacan', 'Cavite', 'Bulacan'], type: 'order', title: 'New customer order', message: 'Fixture', dedupeKey: 'order-fixture' });
  const notices = create.mock.calls.map(call => call.arguments[0]);
  assert.deepEqual(notices.map(n => n.user), users.slice(0, 3).map(u => u._id));
  assert.deepEqual(notices.map(n => n.branch), ['Cavite', 'Bulacan', 'Cavite']);
  assert.equal(new Set(notices.map(n => n.dedupeKey)).size, 3);
});
