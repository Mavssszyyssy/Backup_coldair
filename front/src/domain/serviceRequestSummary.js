export function matchesServiceRequestStatus(request, filter) {
  if (filter === 'all') return true;
  if (filter === 'unassigned') {
    return !request.assignedTechnicianId && !['Completed', 'Cancelled'].includes(request.status);
  }
  if (filter === 'active') return ['Assigned', 'In Progress'].includes(request.status);
  return request.status === filter;
}

export function serviceRequestSummary(requests = []) {
  const count = (filter) => requests.filter((request) => matchesServiceRequestStatus(request, filter)).length;
  return {
    total: requests.length,
    unassigned: count('unassigned'),
    active: count('active'),
    onHold: count('On Hold'),
    completed: count('Completed'),
    cancelled: count('Cancelled'),
  };
}
