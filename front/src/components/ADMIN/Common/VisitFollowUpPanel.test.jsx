import React from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VisitFollowUpPanel from './VisitFollowUpPanel';
import { apiRequest } from '../../../config/api';
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
const task = { id: 'task-1', status: 'on-hold', visitAttempt: { id: 'attempt-1', outcome: 'close', note: 'No one answered at the entrance.', submittedAt: '2026-09-10T02:00:00Z', awaitingAdmin: true } };
beforeEach(() => { vi.clearAllMocks(); apiRequest.mockResolvedValue({ attempt: { photo: { uri: 'data:image/jpeg;base64,test' }, checkIn: { latitude: 14.4, longitude: 120.9 }, technicianName: 'Test technician' } }); });
test('renders visit proof and requires Admin date and dropdown time before confirming', async () => {
  const updated = vi.fn(); render(<VisitFollowUpPanel task={task} onUpdated={updated} />);
  await screen.findByAltText('Technician proof of unattended visit');
  expect(screen.getByRole('button', { name: 'Confirm next visit' }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Next visit date'), { target: { value: '2099-12-12' } });
  fireEvent.change(screen.getByLabelText('Time slot'), { target: { value: '10:00 AM – 12:00 PM' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm next visit' }));
  await waitFor(() => expect(updated).toHaveBeenCalledTimes(1));
  expect(apiRequest).toHaveBeenCalledWith('/tasks/task-1/next-visit', { method: 'PATCH', body: JSON.stringify({ attemptId: 'attempt-1', scheduledDate: '2099-12-12', timeSlot: '10:00 AM – 12:00 PM' }) });
  expect(screen.queryByRole('button', { name: 'Confirm next visit' })).toBeNull();
});
test('no pending visit means no extra form; cancelled work cannot be rescheduled', () => {
  const { rerender } = render(<VisitFollowUpPanel task={{ id: 'other' }} />);
  expect(screen.queryByText('Visit follow-up')).toBeNull();
  rerender(<VisitFollowUpPanel task={{ ...task, status: 'cancelled' }} />);
  expect(screen.queryByRole('button', { name: 'Confirm next visit' })).toBeNull();
});
