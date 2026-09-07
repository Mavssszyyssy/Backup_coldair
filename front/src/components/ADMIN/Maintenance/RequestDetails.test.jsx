import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RequestDetails from './RequestDetails';
import { apiRequest } from '../../../config/api';
import { TECHNICIAN_TIME_SLOTS } from '../../../domain/technicianTimeSlots';

vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
const request = { id: 'request-1', status: 'Reviewed', branch: 'Bulacan', unitName: 'Test AC', timeline: [] };
beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockImplementation(async (path, options) => {
    if (path.startsWith('/users')) return { users: [{ id: 'tech-1', name: 'Branch technician', assignedBranch: 'Bulacan' }] };
    if (options?.method === 'PATCH') return { request: { ...request, ...JSON.parse(options.body) } };
    return { task: { id: 'task-1', status: 'completed', checkIn: { latitude: 14.65, longitude: 121.02, checkedInAt: '2026-09-07T01:00:00Z' }, proof: { submittedAt: '2026-09-07T02:00:00Z' } } };
  });
});

describe('maintenance request controls', () => {
  it('requires an appointment and submits it with the selected technician', async () => {
    render(<RequestDetails request={request} />);
    await screen.findByRole('option', { name: /Branch technician/ });
    fireEvent.change(screen.getByLabelText('Choose technician'), { target: { value: 'tech-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign technician' }));
    expect(screen.getByRole('alert').textContent).toMatch(/appointment date/);
    expect(apiRequest.mock.calls.some(([, opts]) => opts?.method === 'PATCH')).toBe(false);
    const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText('Appointment date'), { target: { value: date } });
    const slot = screen.getByRole('combobox', { name: 'Time slot' });
    expect(Array.from(slot.options, option => option.value)).toEqual(['', ...TECHNICIAN_TIME_SLOTS]);
    fireEvent.click(screen.getByRole('button', { name: 'Assign technician' }));
    expect(apiRequest.mock.calls.some(([, opts]) => opts?.method === 'PATCH')).toBe(false);
    fireEvent.change(slot, { target: { value: TECHNICIAN_TIME_SLOTS[0] } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign technician' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/service-requests/request-1/status', expect.objectContaining({ body: JSON.stringify({ status: 'In Progress', assignedTechnicianId: 'tech-1', assignedTechnicianName: 'Branch technician', scheduledDate: date, timeSlot: TECHNICIAN_TIME_SLOTS[0] }) })));
    expect(screen.getByRole('combobox', { name: 'Time slot' }).value).toBe(TECHNICIAN_TIME_SLOTS[0]);
  });

  it('preserves an existing custom appointment without offering free-text entry', async () => {
    const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    render(<RequestDetails request={{ ...request, timeSlot: '9:30 AM - 11:30 AM', scheduledDate: date, assignedTechnicianId: 'tech-1' }} />);
    await screen.findByRole('option', { name: /Branch technician/ });
    const slot = screen.getByRole('combobox', { name: 'Time slot' });
    expect(slot.value).toBe('9:30 AM - 11:30 AM');
    expect(screen.getByRole('option', { name: '9:30 AM - 11:30 AM (Current appointment)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save assignment & schedule' }));
    await waitFor(() => expect(apiRequest.mock.calls.some(([, opts]) => opts?.method === 'PATCH' && JSON.parse(opts.body).timeSlot === '9:30 AM - 11:30 AM')).toBe(true));
  });

  it('shows recorded GPS evidence without implying a signature is required', async () => {
    render(<RequestDetails request={{ ...request, status: 'Completed', linkedTaskId: 'task-1' }} />);
    expect((await screen.findByRole('link', { name: 'Open check-in map' })).getAttribute('href')).toBe('https://www.google.com/maps?q=14.65,121.02');
    expect(screen.getByText('Technician proof of work')).toBeTruthy();
    expect(screen.queryByText(/Customer sign-off/)).toBeNull();
    expect(screen.queryByLabelText('Appointment date')).toBeNull();
  });

  it('refreshes check-in evidence when the same request is refreshed', async () => {
    const { rerender } = render(<RequestDetails request={{ ...request, linkedTaskId: 'task-1' }} />);
    await screen.findByRole('link', { name: 'Open check-in map' });
    const before = apiRequest.mock.calls.filter(([path]) => path === '/tasks/task-1').length;
    rerender(<RequestDetails request={{ ...request, linkedTaskId: 'task-1', updatedAt: 'new' }} />);
    await waitFor(() => expect(apiRequest.mock.calls.filter(([path]) => path === '/tasks/task-1').length).toBeGreaterThan(before));
  });
});
