export function serviceRequestSummary(requests = []) {
  return {
    total: requests.length,
    unassigned: requests.filter((request) => !request.assignedTechnicianId && !['Completed', 'Cancelled'].includes(request.status)).length,
    active: requests.filter((request) => ['Assigned', 'In Progress'].includes(request.status)).length,
    onHold: requests.filter((request) => request.status === 'On Hold').length,
    completed: requests.filter((request) => request.status === 'Completed').length,
    cancelled: requests.filter((request) => request.status === 'Cancelled').length,
  };
}
