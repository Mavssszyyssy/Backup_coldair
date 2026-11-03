import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useState } from 'react';
import useAutoDismissMessage from './useAutoDismissMessage';

function NoticeHarness() {
  const [notice, setNotice] = useState('');
  useAutoDismissMessage(notice, setNotice);
  return <>
    <button onClick={() => setNotice('Saved')}>Save</button>
    <button onClick={() => setNotice('Saved again')}>Save again</button>
    {notice && <p role="status">{notice}</p>}
  </>;
}

afterEach(() => vi.useRealTimers());

test('success feedback clears after five seconds and a new save restarts the timer', () => {
  vi.useFakeTimers();
  render(<NoticeHarness />);
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  act(() => vi.advanceTimersByTime(4000));
  expect(screen.getByRole('status')).toHaveTextContent('Saved');
  fireEvent.click(screen.getByRole('button', { name: 'Save again' }));
  act(() => vi.advanceTimersByTime(4000));
  expect(screen.getByRole('status')).toHaveTextContent('Saved again');
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
