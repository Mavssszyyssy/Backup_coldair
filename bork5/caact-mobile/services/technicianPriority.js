import { COLORS } from '../constants/theme';

export const taskPriorityKey = (priority = '') => String(priority || 'Normal').trim().toLowerCase();

export const priorityPresentation = (priority) => {
  const key = taskPriorityKey(priority);
  if (key === 'urgent' || key === 'high') return { label: key === 'urgent' ? 'Urgent priority' : 'High priority', color: COLORS.danger, background: '#fef2f2', icon: key === 'urgent' ? 'alert-circle-sharp' : 'arrow-up-circle-sharp' };
  if (key === 'medium' || key === 'normal') return { label: key === 'medium' ? 'Medium priority' : 'Normal priority', color: '#92400e', background: '#fffbeb', icon: 'remove-circle-sharp' };
  if (key === 'low') return { label: 'Low priority', color: '#166534', background: '#f0fdf4', icon: 'arrow-down-circle-sharp' };
  return { label: `${String(priority || 'Unspecified')} priority`, color: COLORS.textSecondary, background: COLORS.surfaceAlt, icon: 'help-circle-sharp' };
};
