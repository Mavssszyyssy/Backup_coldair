// services/customerHistoryService.jsx
import {
  getServiceRequestsByUser,
  SERVICE_REQUEST_STATUS,
} from "./serviceRequestStorage";
import { getAllTasks, TASK_STATUS } from "./taskStorage";
import { isActiveServiceRequest } from "./customerHistoryLogic";

export async function getCustomerServiceHistory(userId) {
  if (!userId) {
    return {
      requests: [],
      linkedTasks: [],
      completedServices: [],
    };
  }

  const [requests, tasks] = await Promise.all([
    getServiceRequestsByUser(userId),
    getAllTasks(),
  ]);

  const requestTaskIds = new Set(
    requests.map((request) => String(request.linkedTaskId || "")).filter(Boolean)
  );

  const linkedTasks = tasks.filter((task) => {
    return (
      String(task.customerId || "") === String(userId) ||
      requestTaskIds.has(String(task.id)) ||
      requests.some((request) => String(request.id) === String(task.requestId || ""))
    );
  });

  const completedServices = linkedTasks.filter(
    (task) => task.status === TASK_STATUS.COMPLETED
  );

  return {
    requests: requests.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    ),
    linkedTasks: linkedTasks.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    ),
    completedServices: completedServices.sort(
      (a, b) =>
        new Date(b.completedAt || b.updatedAt || b.createdAt) -
        new Date(a.completedAt || a.updatedAt || a.createdAt)
    ),
  };
}

export function getCustomerServiceStats(requests = [], completedServices = []) {
  return {
    totalRequests: requests.length,
    openRequests: requests.filter(isActiveServiceRequest).length,
    submitted: requests.filter(
      (request) => request.status === SERVICE_REQUEST_STATUS.SUBMITTED
    ).length,
    reviewed: requests.filter(
      (request) => request.status === SERVICE_REQUEST_STATUS.REVIEWED
    ).length,
    assigned: requests.filter(
      (request) => request.status === SERVICE_REQUEST_STATUS.ASSIGNED
    ).length,
    completedRequests: requests.filter(
      (request) => request.status === SERVICE_REQUEST_STATUS.COMPLETED
    ).length,
    completedServices: completedServices.length,
  };
}

export function findLinkedTaskForRequest(request, linkedTasks = []) {
  if (!request?.linkedTaskId) return null;

  return (
    linkedTasks.find(
      (task) => String(task.id) === String(request.linkedTaskId)
    ) || null
  );
}
