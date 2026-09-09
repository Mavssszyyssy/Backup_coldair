import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PagedItems from './PagedItems';
test('all records remain reachable and page clamps after record deletion', async () => {
  const items = [1,2,3,4,5,6,7];
  const view = values => <PagedItems label="Visits" items={values} renderItem={n => <Text key={n}>Visit {n}</Text>} />;
  await render(view(items));
  expect(screen.queryByText('Visit 4')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Visits: Next page'));
  expect(screen.getByText('Visit 4')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Visits: Next page'));
  expect(screen.getByText('Visit 7')).toBeTruthy();
  expect(screen.getByLabelText('Visits: Next page').props.accessibilityState.disabled).toBe(true);
  await screen.rerender(view([1]));
  expect(screen.getByText('Visit 1')).toBeTruthy();
  expect(screen.queryByLabelText('Visits: Next page')).toBeNull();
});
