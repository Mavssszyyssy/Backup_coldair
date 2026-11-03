export const dashboardFilterQuery = ({ branch = '', from = '', to = '' } = {}) => {
  const query = new URLSearchParams();
  if (branch && branch !== 'all') query.set('branch', branch);
  if (from && to) { query.set('from', from); query.set('to', to); }
  return `/dashboard/me${query.size ? `?${query.toString()}` : ''}`;
};

export const validateDashboardDates = (from, to, today) => {
  if (!from || !to) return 'Select both From and To dates.';
  const valid = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(from) || !valid(to)) return 'Enter valid dates.';
  if (from > to) return 'From Date must be on or before To Date.';
  if (from > today || to > today) return 'Historical ranges cannot be in the future.';
  return '';
};
