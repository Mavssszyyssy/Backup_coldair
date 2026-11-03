import { priorityPresentation, taskPriorityKey } from './technicianPriority';

test('priority badges keep the stored priority and expose distinct readable labels', () => {
  expect(priorityPresentation('low')).toMatchObject({ label: 'Low priority', background: '#f0fdf4' });
  expect(priorityPresentation('medium')).toMatchObject({ label: 'Medium priority', background: '#fffbeb' });
  expect(priorityPresentation('high')).toMatchObject({ label: 'High priority', background: '#fef2f2' });
  expect(priorityPresentation('urgent').label).toBe('Urgent priority');
  expect(priorityPresentation('low').icon).toBe('arrow-down-circle-sharp');
  expect(priorityPresentation('medium').icon).toBe('remove-circle-sharp');
  expect(priorityPresentation('high').icon).toBe('arrow-up-circle-sharp');
  expect(taskPriorityKey(' High ')).toBe('high');
});
