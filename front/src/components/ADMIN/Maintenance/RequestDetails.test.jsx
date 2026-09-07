import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RequestDetails from './RequestDetails';
import { apiRequest } from '../../../config/api';

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
    fireEvent.change(screen.getByLabelText('Time slot'), { target: { value: '9:00 AM – 12:00 PM' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign technician' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/service-requests/request-1/status', expect.objectContaining({ body: JSON.stringify({ status: 'In Progress', assignedTechnicianId: 'tech-1', assignedTechnicianName: 'Branch technician', scheduledDate: date, timeSlot: '9:00 AM – 12:00 PM' }) })));
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
