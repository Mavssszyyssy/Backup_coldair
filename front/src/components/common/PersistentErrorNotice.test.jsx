import { fireEvent, render, screen } from '@testing-library/react';
import PersistentErrorNotice from './PersistentErrorNotice';

test('keeps an action error visible at viewport level and supports dismissal', () => {
  const onDismiss = vi.fn();
  const { container } = render(
    <div className="scrolling-form">
      <PersistentErrorNotice
        title="Please check this form"
        message="A required value is missing."
        onDismiss={onDismiss}
      />
    </div>,
  );

  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent('Please check this form');
  expect(alert).toHaveTextContent('A required value is missing.');
  expect(container).not.toContainElement(alert);

  fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
