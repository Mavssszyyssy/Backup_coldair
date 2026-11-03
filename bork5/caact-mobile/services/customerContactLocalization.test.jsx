import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { createContactMessage, getMyContactMessage, getMyContactMessages } from './api';

import CustomerContactScreen from '../app/customer/contact';

let mockLanguage = 'Filipino';
let mockParams = {};
const mockCurrent = { id: 'customer-1', name: 'Ana Cruz', email: 'ana@example.com' };
jest.mock('../context/UserContext', () => ({ useUserContext: () => ({ current: mockCurrent, token: 'token' }) }));
jest.mock('../hooks/useInterfaceLanguage', () => ({
  useInterfaceLanguage: () => ({ t: (value) => require('./interfaceI18n').translateText(value, mockLanguage) }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../components/customer/CustomerScreen', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title, children }) => <><Text>{title}</Text>{children}</> };
});
jest.mock('../components/ui/BottomSheetSelect', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ label, value }) => <><Text>{label}</Text><Text>{value}</Text></> };
});
jest.mock('./liveRefresh', () => ({ startLiveRefresh: (load) => { load({ background: false, isCurrent: () => true }); return () => {}; } }));
jest.mock('./api', () => ({
  getMyContactMessages: jest.fn(async () => ({ success: true, messages: [{ id: 'message-1', ticketCode: 'T-1', subject: 'Original subject', message: 'Original customer message', adminReply: 'Original admin reply', status: 'resolved' }] })),
  getMyContactMessage: jest.fn(),
  createContactMessage: jest.fn(),
}));

beforeEach(() => {
  mockParams = {};
  getMyContactMessages.mockReset();
  getMyContactMessages.mockResolvedValue({ success: true, messages: [{ id: 'message-1', ticketCode: 'T-1', subject: 'Original subject', message: 'Original customer message', adminReply: 'Original admin reply', status: 'resolved' }], pagination: { hasMore: false, nextCursor: '' } });
  createContactMessage.mockReset();
  getMyContactMessage.mockReset();
});

test('a selected older conversation opens even when it is outside the first history page', async () => {
  mockLanguage = 'English';
  mockParams = { messageId: 'old-message' };
  getMyContactMessage.mockResolvedValue({ success: true, message: { id: 'old-message', ticketCode: 'T-0', subject: 'Older issue', message: 'Earlier customer message', adminReply: 'Earlier support reply', status: 'resolved' } });
  const view = await render(<CustomerContactScreen />);
  expect(await view.findByText('Earlier customer message')).toBeTruthy();
  expect(view.getByText('Earlier support reply')).toBeTruthy();
  expect(getMyContactMessage).toHaveBeenCalledWith('token', 'old-message');
  view.unmount();
});

test('customer contact labels switch languages without rewriting messages', async () => {
  mockLanguage = 'Filipino';
  const view = await render(<CustomerContactScreen />);
  await screen.findByText(/Original subject/);
  await act(async () => { fireEvent.press(screen.getByLabelText(/Original subject/)); });
  expect(await screen.findByText('Original customer message')).toBeTruthy();
  expect(screen.getByText('Original admin reply')).toBeTruthy();
  expect(screen.getByText('Magpadala ng Mensahe sa Suporta')).toBeTruthy();
  mockLanguage = 'English';
  await view.rerender(<CustomerContactScreen />);
  expect(view.getByText('Original customer message')).toBeTruthy();
  expect(view.getByText('Send a Support Message')).toBeTruthy();
  view.unmount();
});

test('sending locks the form, prevents duplicate requests, and preserves a failed draft', async () => {
  mockLanguage = 'English';
  let finishRequest;
  createContactMessage.mockImplementationOnce(() => new Promise((resolve) => { finishRequest = resolve; }));
  const view = await render(<CustomerContactScreen />);
  await view.findByText('My Support Messages');
  await act(async () => {
    fireEvent.changeText(view.getByLabelText('Subject'), 'Need service');
    fireEvent.changeText(view.getByLabelText('Message'), 'Please inspect the AC unit');
  });
  expect(view.getByText('26/3000')).toBeTruthy();
  await act(async () => { fireEvent.press(view.getByText('Send to Support')); fireEvent.press(view.getByText('Send to Support')); });
  expect(createContactMessage).toHaveBeenCalledTimes(1);
  expect(view.getByLabelText('Message').props.editable).toBe(false);
  await act(async () => finishRequest({ success: false, error: 'Try again later.' }));
  expect(view.getByLabelText('Message').props.value).toBe('Please inspect the AC unit');
  expect(view.getByText('Try again later.')).toBeTruthy();

  createContactMessage.mockResolvedValueOnce({ success: true, message: { id: 'new-message', ticketCode: 'T-2', subject: 'Need service', message: 'Please inspect the AC unit' } });
  await act(async () => { fireEvent.press(view.getByText('Send to Support')); });
  await waitFor(() => expect(view.getByLabelText('Message').props.value).toBe(''));
  expect(createContactMessage).toHaveBeenCalledTimes(2);
  view.unmount();
});

test('older support messages load once and duplicate page entries are merged', async () => {
  mockLanguage = 'English';
  getMyContactMessages.mockImplementation(async (_token, before) => before
    ? { success: true, messages: [{ id: 'new', subject: 'New message', message: 'New details', createdAt: '2026-10-02' }, { id: 'old', subject: 'Older message', message: 'Old details', createdAt: '2026-10-01' }], pagination: { hasMore: false, nextCursor: '' } }
    : { success: true, messages: [{ id: 'new', subject: 'New message', message: 'New details', createdAt: '2026-10-02' }], pagination: { hasMore: true, nextCursor: 'cursor' } });
  const view = await render(<CustomerContactScreen />);
  await view.findByText(/New message/);
  await act(async () => { fireEvent.press(view.getByText('Load older messages')); });
  await view.findByText(/Older message/);
  expect(view.getAllByText(/New message/)).toHaveLength(1);
  expect(getMyContactMessages).toHaveBeenCalledWith('token', 'cursor');
  view.unmount();
});
