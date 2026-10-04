import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "../Common/AdminLayout";
import { useUser } from "../../../context/UserContext";
import { BRANCHES } from "../../../domain/branches/branches";
import { TECHNICIAN_TIME_SLOTS as TIME_SLOTS } from "../../../domain/technicianTimeSlots";
import { technicianHasConflict } from "../../../domain/scheduleConflicts";
import { apiRequest } from "../../../config/api";
import { formatBusinessDateKey } from "../../../utils/dateTime";
import { alertDialog, confirmDialog } from "../../../utils/dialog";
import { isValidEmailFormat, validateEmailForSubmission } from "../../../domain/emailPolicy";
import PersistentErrorNotice from "../../common/PersistentErrorNotice";
import DailyWorkSchedule from "./DailyWorkSchedule";
import "../adminShared.css";
import "./styles.css";

const PAGE_SIZE = 8;
const WORK_ASSIGNMENT_PAGE_SIZE = 4;
const CUSTOM_ADDRESS_ID = "__custom__";
const INSTALLATION_SERVICE = {
  id: "installation",
  title: "Installation",
  defaultIssueType: "Installation",
};
const today = () => formatBusinessDateKey();
const displayName = (person = {}) =>
  person.name || [person.name_first, person.name_last].filter(Boolean).join(" ").trim() || person.username || person.alias || person.email || "Technician";
const credentialPart = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ".")
  .replace(/^\.+|\.+$/g, "")
  .replace(/\.{2,}/g, ".");
const openTask = (task) => !["completed"].includes(String(task.status || "").toLowerCase());
const taskStatusLabel = (status = "") =>
  String(status || "pending").replace(/-/g, " ");
const isServiceTask = (task = {}) =>
  task?.payload?.source === "service_request" ||
  Boolean(task?.payload?.requestId);
const isInstallationTask = (task = {}) =>
  Boolean(task?.orderId || task?.orderCode || task?.payload?.orderId) ||
  /install/i.test(String(task?.title || ""));
const taskCheckIn = (task = {}) => task?.checkIn || task?.payload?.checkIn || null;
const formatCheckInTime = (value) => {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
};
const formatScheduledDate = (value) => {
  if (!value) return "Date not set";
  const key = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? String(value)
    : formatBusinessDateKey(new Date(value));
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return String(value);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
};
const checkInMapUrl = (checkIn = {}) => {
  const latitude = Number(checkIn?.latitude);
  const longitude = Number(checkIn?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : "";
};
const formatCheckInCoordinates = (checkIn = {}) => {
  const latitude = Number(checkIn?.latitude);
  const longitude = Number(checkIn?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "Coordinates unavailable";
  const accuracy = Number(checkIn?.accuracy);
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}${accuracy > 0 ? ` · ±${Math.round(accuracy)} m` : ""}`;
};

const formatAddress = (address = {}) => [
  address.street || address.thoroughfare,
  address.barangay || address.submunicipality,
  address.city || address.municipality,
  address.province,
  address.region,
  address.postalCode || address.zipCode,
]
  .map((part) => String(part || "").trim())
  .filter(Boolean)
  .join(", ");

const customerAddressOptions = (customer = {}, units = []) => {
  const options = (Array.isArray(customer.addresses) ? customer.addresses : [])
    .map((address, index) => ({
      id: String(address.id || address._id || `saved-${index}`),
      label: String(address.label || address.type || "Saved address").trim(),
      address: formatAddress(address),
      isDefault: Boolean(address.isDefault),
    }))
    .filter((item) => item.address);

  const legacyAddress = String(customer.address || "").trim() || formatAddress({
    street: customer.thoroughfare,
    barangay: customer.submunicipality,
    city: customer.municipality,
    province: customer.billingAddress?.province,
    region: customer.billingAddress?.region,
  });
  if (legacyAddress && !options.some((item) => item.address.toLowerCase() === legacyAddress.toLowerCase())) {
    options.push({ id: "profile-address", label: "Profile address", address: legacyAddress, isDefault: options.length === 0 });
  }

  units.forEach((unit) => {
    const installationAddress = String(unit.installationAddress || "").trim();
    if (installationAddress && !options.some((item) => item.address.toLowerCase() === installationAddress.toLowerCase())) {
      options.push({ id: `unit-${unit.unitId}`, label: `${unit.modelName || "AC unit"} location`, address: installationAddress, isDefault: false });
    }
  });
  return options;
};

const assignmentTitle = (task = {}) => {
  const service = String(task.issueType || task.payload?.serviceType || task.title || "Work order").trim();
  const unit = String(task.unitName || task.payload?.unitName || "").trim();
  return unit && !service.toLowerCase().includes(unit.toLowerCase()) ? `${service} — ${unit}` : service;
};

const CustomerCombobox = ({ customers, value, query, onQueryChange, onSelect, disabled }) => {
  const [open, setOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCustomers = customers
    .filter((customer) => !normalizedQuery || [customer.name, customer.email, customer.phone, customer.addressSummary]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(normalizedQuery)))
    .slice(0, 12);

  return <div className="tech-customer-combobox" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <label>
      <span>Customer / site</span>
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="tech-customer-options"
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(event) => { onQueryChange(event.target.value); setOpen(true); }}
        placeholder="Search customer name, email, phone, or address"
      />
    </label>
    {open ? <div className="tech-customer-options" id="tech-customer-options" role="listbox">
      {visibleCustomers.length ? visibleCustomers.map((customer) => <button
        key={customer.id}
        type="button"
        role="option"
        aria-selected={String(value) === String(customer.id)}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => { onSelect(customer); setOpen(false); }}
      >
        <strong>{customer.name}</strong>
        <span>{customer.addressSummary || customer.email || customer.phone || "No saved site information"}</span>
      </button>) : <p>No customers match this search.</p>}
    </div> : null}
  </div>;
};

const initialDraft = (branch = "") => ({
  technicianId: "",
  serviceTypeId: "",
  customerId: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  addressId: "",
  address: "",
  customAddress: false,
  unitId: "",
  unitName: "",
  description: "",
  scheduledDate: today(),
  timeSlot: TIME_SLOTS[0],
  priority: "medium",
  branch,
});

const initialStaffDraft = (branch = "") => ({
  firstName: "",
  lastName: "",
  loginName: "",
  branch,
  serviceQuota: "",
});

const AdminTechnician = ({ embedded = false, initialView = "technicians" }) => {
  const { user } = useUser();
  const isSuperAdmin = user?.role === "superadmin";
  const homeBranch = user?.assignedBranch || user?.activeBranch || "";
  const [technicians, setTechnicians] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [serviceOfferings, setServiceOfferings] = useState([INSTALLATION_SERVICE]);
  const [units, setUnits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("active");
  const [workloadFilter, setWorkloadFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState(isSuperAdmin ? "all" : homeBranch || "all");
  const [page, setPage] = useState(1);
  const [workPage, setWorkPage] = useState(1);
  const [draft, setDraft] = useState(() => initialDraft(homeBranch));
  const [customerQuery, setCustomerQuery] = useState("");
  const [staffDraft, setStaffDraft] = useState(() => initialStaffDraft(homeBranch));
  const [savingTask, setSavingTask] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const staffSavePending = useRef(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [createdLoginIdentifier, setCreatedLoginIdentifier] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [workspaceView, setWorkspaceView] = useState(initialView === "schedule" ? "schedule" : "technicians");

  useEffect(() => {
    setWorkspaceView(initialView === "schedule" ? "schedule" : "technicians");
  }, [initialView]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersResult, customerResult, tasksResult, catalogResult, unitResult] = await Promise.all([
        apiRequest("/users?role=technician"),
        apiRequest("/users?role=customer"),
        apiRequest("/tasks"),
        apiRequest("/service-requests/catalog"),
        apiRequest("/amp/report-units"),
      ]);
      setTechnicians((usersResult.users || []).map((item) => ({
        ...item,
        name: displayName(item),
        branch: item.assignedBranch || item.activeBranch || "",
        accountStatus: item.accountStatus || "active",
      })));
      setCustomers((customerResult.users || []).map((item) => {
        const addresses = customerAddressOptions(item);
        const preferredAddress = addresses.find((address) => address.isDefault) || addresses[0];
        return {
          ...item,
          id: String(item.id || item._id || ""),
          name: displayName(item),
          branch: item.assignedBranch || item.activeBranch || "",
          accountStatus: item.accountStatus || "active",
          addressSummary: preferredAddress?.address || "",
        };
      }));
      const configuredOfferings = (catalogResult.offerings || []).filter((item) => item?.id && item?.title);
      setServiceOfferings([INSTALLATION_SERVICE, ...configuredOfferings.filter((item) => item.id !== INSTALLATION_SERVICE.id)]);
      setUnits(unitResult.units || []);
      setTasks(tasksResult.tasks || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load technician management.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, accountFilter, workloadFilter, branchFilter]);
  useEffect(() => { setWorkPage(1); }, [tasks.length]);
  useEffect(() => {
    if (!isSuperAdmin) {
      setBranchFilter(homeBranch || "all");
      setDraft((current) => ({ ...current, branch: homeBranch }));
      setStaffDraft((current) => ({ ...current, branch: homeBranch }));
    }
  }, [homeBranch, isSuperAdmin]);

  const openTasksByTechnician = useMemo(() => tasks.reduce((counts, task) => {
    if (openTask(task) && task.assignedTechnicianId) {
      counts[String(task.assignedTechnicianId)] = (counts[String(task.assignedTechnicianId)] || 0) + 1;
    }
    return counts;
  }, {}), [tasks]);

  const taskStatsByTechnician = useMemo(() => tasks.reduce((stats, task) => {
    const technicianId = String(task.assignedTechnicianId || "");
    if (!technicianId) return stats;
    const current = stats[technicianId] || {
      assigned: 0,
      open: 0,
      completed: 0,
      activeServices: 0,
      activeInstallations: 0,
      currentStatus: "",
    };
    current.assigned += 1;
    if (openTask(task)) {
      current.open += 1;
      current.currentStatus = current.currentStatus || taskStatusLabel(task.status);
      if (isServiceTask(task)) current.activeServices += 1;
      if (isInstallationTask(task)) current.activeInstallations += 1;
    } else {
      current.completed += 1;
    }
    stats[technicianId] = current;
    return stats;
  }, {}), [tasks]);

  const filteredTechnicians = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return technicians.filter((technician) => {
      const openCount = openTasksByTechnician[String(technician.id)] || 0;
      const textMatches = !needle || [technician.name, technician.username, technician.alias, technician.email, technician.branch, technician.department, ...(technician.skills || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
      const accountMatches = accountFilter === "all" || technician.accountStatus === accountFilter;
      const branchMatches = branchFilter === "all" || technician.branch === branchFilter;
      const workloadMatches = workloadFilter === "all" ||
        (workloadFilter === "available" && openCount < 3) ||
        (workloadFilter === "busy" && openCount >= 3);
      return textMatches && accountMatches && branchMatches && workloadMatches;
    });
  }, [accountFilter, branchFilter, openTasksByTechnician, search, technicians, workloadFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTechnicians.length / PAGE_SIZE));
  const pageTechnicians = filteredTechnicians.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const workTotalPages = Math.max(1, Math.ceil(tasks.length / WORK_ASSIGNMENT_PAGE_SIZE));
  const pageWorkAssignments = tasks.slice((workPage - 1) * WORK_ASSIGNMENT_PAGE_SIZE, workPage * WORK_ASSIGNMENT_PAGE_SIZE);
  const intendedBranch = draft.branch || homeBranch;
  const availableCustomers = customers.filter((customer) => customer.accountStatus === "active"
    && (!intendedBranch || !customer.branch || customer.branch === intendedBranch));
  const selectedCustomer = customers.find((customer) => String(customer.id) === String(draft.customerId));
  const customerUnits = units.filter((unit) => String(unit.customerId || "") === String(draft.customerId || "")
    && (!intendedBranch || !unit.branch || unit.branch === intendedBranch));
  const addressOptions = customerAddressOptions(selectedCustomer, customerUnits);
  const availableForAssignment = technicians.filter((technician) => {
    if (technician.accountStatus !== "active") return false;
    return !intendedBranch || !technician.branch || technician.branch === intendedBranch;
  });
  const activeCount = technicians.filter((technician) => technician.accountStatus === "active").length;
  const busyCount = technicians.filter((technician) => (openTasksByTechnician[String(technician.id)] || 0) >= 3).length;
  const credentialPreview = useMemo(() => {
    const branchPart = credentialPart(staffDraft.branch);
    const namePart = credentialPart(staffDraft.loginName);
    return {
      loginIdentifier: branchPart && namePart ? `tech.${branchPart}.${namePart}` : "",
      defaultPassword: branchPart && namePart ? `${branchPart}.${namePart}` : "",
    };
  }, [staffDraft.branch, staffDraft.loginName]);

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const updateStaffDraft = (field, value) => setStaffDraft((current) => ({ ...current, [field]: value }));

  const selectCustomer = (customer) => {
    const relatedUnits = units.filter((unit) => String(unit.customerId || "") === String(customer.id));
    const addresses = customerAddressOptions(customer, relatedUnits);
    const preferredAddress = addresses.find((address) => address.isDefault) || (addresses.length === 1 ? addresses[0] : null);
    setCustomerQuery(customer.name);
    setDraft((current) => ({
      ...current,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email || "",
      customerPhone: customer.phone || "",
      addressId: preferredAddress?.id || "",
      address: preferredAddress?.address || "",
      customAddress: false,
      unitId: "",
      unitName: "",
    }));
  };

  const updateCustomerQuery = (value) => {
    setCustomerQuery(value);
    if (selectedCustomer && value !== selectedCustomer.name) {
      setDraft((current) => ({
        ...current,
        customerId: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        addressId: "",
        address: "",
        customAddress: false,
        unitId: "",
        unitName: "",
        technicianId: "",
      }));
    }
  };

  const selectAddress = (addressId) => {
    if (addressId === CUSTOM_ADDRESS_ID) {
      setDraft((current) => ({ ...current, addressId, address: "", customAddress: true }));
      return;
    }
    const selected = addressOptions.find((address) => address.id === addressId);
    setDraft((current) => ({
      ...current,
      addressId,
      address: selected?.address || "",
      customAddress: false,
    }));
  };

  const selectUnit = (unitId) => {
    const selected = customerUnits.find((unit) => String(unit.unitId) === String(unitId));
    const matchingAddress = selected?.installationAddress
      ? addressOptions.find((address) => address.address.toLowerCase() === selected.installationAddress.toLowerCase())
      : null;
    setDraft((current) => ({
      ...current,
      unitId,
      unitName: selected?.modelName || "",
      addressId: selected?.installationAddress ? matchingAddress?.id || `unit-${selected.unitId}` : current.addressId,
      address: selected?.installationAddress || current.address,
      customAddress: false,
    }));
  };

  const changeWorkOrderBranch = (branch) => {
    setCustomerQuery("");
    setDraft((current) => ({
      ...current,
      branch,
      technicianId: "",
      customerId: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      addressId: "",
      address: "",
      customAddress: false,
      unitId: "",
      unitName: "",
    }));
  };

  const createTechnician = async (event) => {
    event.preventDefault();
    if (staffSavePending.current) return;
    const firstName = staffDraft.firstName.trim();
    const lastName = staffDraft.lastName.trim();
    const loginName = credentialPart(staffDraft.loginName);
    const serviceQuota = Number(staffDraft.serviceQuota);
    if (!firstName || !lastName || !loginName || !staffDraft.branch) {
      setError("Enter the technician's name, login name, and assigned branch.");
      return;
    }
    if (credentialPreview.loginIdentifier.length > 30 || credentialPreview.defaultPassword.length > 25) {
      setError("Use a shorter login name so the Login ID and default password fit their limits.");
      return;
    }
    if (loginName.length < 2) {
      setError("Enter a technician login name with at least 2 letters or numbers.");
      return;
    }
    if (!Number.isSafeInteger(serviceQuota) || serviceQuota < 1) {
      setError("Enter a Service Quota as a whole number greater than 0.");
      return;
    }
    staffSavePending.current = true;
    setSavingStaff(true);
    setError("");
    setNotice("");
    setTemporaryPassword("");
    setCreatedLoginIdentifier("");
    try {
      const result = await apiRequest("/users/staff", {
        method: "POST",
        body: JSON.stringify({
          name_first: firstName,
          name_last: lastName,
          loginName,
          role: "technician",
          branch: staffDraft.branch,
          serviceQuota,
        }),
      });
      setTemporaryPassword(result.tempPassword || "");
      setCreatedLoginIdentifier(result.loginIdentifier || result.user?.username || result.user?.alias || "");
      setNotice(`${firstName} ${lastName} was added. Share the first-use credentials below securely.`);
      setStaffDraft(initialStaffDraft(staffDraft.branch));
      setShowAddStaff(false);
      await load();
    } catch (requestError) {
      setError(requestError.message || "Unable to add the technician.");
    } finally {
      staffSavePending.current = false;
      setSavingStaff(false);
    }
  };

  const createTask = async (event) => {
    event.preventDefault();
    const technician = technicians.find((item) => String(item.id) === String(draft.technicianId));
    const customer = customers.find((item) => String(item.id) === String(draft.customerId));
    const service = serviceOfferings.find((item) => String(item.id) === String(draft.serviceTypeId));
    if (!customer) { setError("Choose a customer from the search results."); return; }
    if (!service) { setError("Choose the type of work to be completed."); return; }
    if (!draft.address.trim()) { setError("Choose or enter the service address."); return; }
    if (!technician) { setError("Choose a technician from the assignment dropdown."); return; }
    if (draft.scheduledDate < today()) { setError("Choose today or a future date."); return; }
    if (technicianHasConflict(tasks, {
      technicianId: technician.id,
      scheduledDate: draft.scheduledDate,
      timeSlot: draft.timeSlot,
    })) {
      setError(`${technician.name} already has an overlapping work order on this date and time.`);
      return;
    }
    const workTitle = draft.unitName ? `${service.title} - ${draft.unitName}` : service.title;
    setSavingTask(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: workTitle,
          issueType: service.defaultIssueType || service.title,
          serviceId: service.id,
          serviceType: service.title,
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email || "",
          customerPhone: customer.phone || "",
          addressId: draft.customAddress ? "" : draft.addressId,
          address: draft.address.trim(),
          unitId: draft.unitId || "",
          unitName: draft.unitName || "",
          description: draft.description.trim(),
          scheduledDate: draft.scheduledDate,
          timeSlot: draft.timeSlot,
          priority: draft.priority,
          branch: isSuperAdmin ? draft.branch : homeBranch,
          assignedTechnicianId: technician.id,
          assignedTechnicianName: technician.name,
          status: "pending",
        }),
      });
      setNotice(`Work order assigned to ${technician.name}.`);
      setDraft(initialDraft(isSuperAdmin ? draft.branch : homeBranch));
      setCustomerQuery("");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Unable to assign the work order.");
    } finally {
      setSavingTask(false);
    }
  };

  const updateTaskAssignment = async (task, technicianId) => {
    const technician = technicians.find((item) => String(item.id) === String(technicianId));
    if (!technician) return;
    setUpdatingId(`task-${task.id}`);
    setError("");
    try {
      const result = await apiRequest(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          assignedTechnicianId: technician.id,
          assignedTechnicianName: technician.name,
        }),
      });
      const successMessage = `Work order reassigned to ${technician.name}.`;
      setTasks((current) => current.map((item) => item.id === task.id ? result.task : item));
      setNotice(successMessage);
      void alertDialog({
        title: "Work order reassigned",
        message: successMessage,
        confirmText: "Done",
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to reassign this work order.");
    } finally {
      setUpdatingId("");
    }
  };

  const updateTechnician = async (technician, payload, successMessage) => {
    setUpdatingId(`tech-${technician.id}`);
    setError("");
    try {
      const result = await apiRequest(`/users/${technician.id}${payload.status ? "/status" : ""}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setTechnicians((current) => current.map((item) => item.id === technician.id ? {
        ...item,
        ...result.user,
        name: displayName(result.user),
        branch: result.user.assignedBranch || result.user.activeBranch || "",
        accountStatus: result.user.accountStatus || "active",
      } : item));
      setNotice(successMessage);
    } catch (requestError) {
      setError(requestError.message || "Unable to update this technician.");
    } finally {
      setUpdatingId("");
    }
  };

  const saveTechnicianEmail = async (technician) => {
    const email = String(technician.email || "").trim().toLowerCase();
    const emailValidationError = await validateEmailForSubmission(email);
    if (emailValidationError) {
      setNotice("");
      setError(emailValidationError);
      return;
    }
    await updateTechnician(
      technician,
      { email },
      `${technician.name}'s email was updated successfully.`,
    );
  };

  const changeTechnicianAccountStatus = async (technician) => {
    const isDisabling = technician.accountStatus === "active";
    if (isDisabling) {
      const confirmed = await confirmDialog({
        title: "Disable technician account?",
        message: `Disable ${technician.name}'s account? The account will remain disabled until an administrator enables it again.`,
        confirmText: "Disable account",
        cancelText: "Keep account active",
        destructive: true,
      });
      if (!confirmed) return;
    }

    await updateTechnician(
      technician,
      { status: isDisabling ? "disabled" : "active" },
      `${technician.name}'s account is now ${isDisabling ? "disabled" : "active"}.`,
    );
  };

  return (
    <AdminLayout title="Technician Management" subtitle="Assign work, monitor workload, and keep field coverage organized." embedded={embedded}>
      <div className="module-tabs tech-workspace-tabs" role="tablist" aria-label="Technician workspace sections">
        <button type="button" role="tab" aria-selected={workspaceView === "technicians"} className={workspaceView === "technicians" ? "active" : ""} onClick={() => setWorkspaceView("technicians")}>Technicians</button>
        <button type="button" role="tab" aria-selected={workspaceView === "schedule"} className={workspaceView === "schedule" ? "active" : ""} onClick={() => setWorkspaceView("schedule")}>Daily Schedule</button>
      </div>
      {workspaceView === "schedule" ? <DailyWorkSchedule /> : <section className="tech-management">
        <div className="tech-summary-grid">
          <article><span>Total technicians</span><strong>{technicians.length}</strong><small>Visible to your access level</small></article>
          <article><span>Active accounts</span><strong>{activeCount}</strong><small>Ready for work assignment</small></article>
          <article><span>Busy technicians</span><strong>{busyCount}</strong><small>Three or more open work orders</small></article>
          <article><span>Open work orders</span><strong>{tasks.filter(openTask).length}</strong><small>Pending, in progress, or on hold</small></article>
        </div>

        <section className="tech-filter-card admin-card" aria-label="Technician filters">
          <div className="tech-filter-heading"><div><h2>Find a technician</h2><p>Use the filters to match the right field team member to each job.</p></div><button type="button" className="tech-secondary-button" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
          <div className="tech-filter-grid">
            <label className="tech-search-field"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, login ID, skill, or branch" /></label>
            <label><span>Account status</span><select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}><option value="all">All accounts</option><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
            <label><span>Workload</span><select value={workloadFilter} onChange={(event) => setWorkloadFilter(event.target.value)}><option value="all">All workloads</option><option value="available">Available (under 3 open)</option><option value="busy">Busy (3+ open)</option></select></label>
            <label><span>Branch</span><select value={branchFilter} disabled={!isSuperAdmin && Boolean(homeBranch)} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">All branches</option>{BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
          </div>
        </section>

        {isSuperAdmin ? <section className="tech-add-staff-card admin-card" aria-label="Add technician staff">
          <div className="tech-filter-heading">
            <div><h2>Add technician staff</h2><p>Create a branch-based technician login without using an email address.</p></div>
            <button type="button" className="tech-primary-button" disabled={savingStaff} onClick={() => { setShowAddStaff((current) => !current); setError(""); }}>{showAddStaff ? "Close" : "Add technician"}</button>
          </div>
          {showAddStaff ? <form className="tech-add-staff-form" onSubmit={createTechnician}>
            <div className="tech-form-row">
              <label><span>First name</span><input value={staffDraft.firstName} onChange={(event) => updateStaffDraft("firstName", event.target.value)} autoComplete="given-name" required /></label>
              <label><span>Last name</span><input value={staffDraft.lastName} onChange={(event) => updateStaffDraft("lastName", event.target.value)} autoComplete="family-name" required /></label>
            </div>
            <label><span>Login name</span><input value={staffDraft.loginName} onChange={(event) => updateStaffDraft("loginName", event.target.value)} placeholder="name" autoComplete="off" required /><small>Use a short, unique name such as juan or j.delacruz. Check the generated Login ID below.</small></label>
            <label><span>Assigned branch</span><select value={staffDraft.branch} onChange={(event) => updateStaffDraft("branch", event.target.value)} required><option value="">Select branch</option>{BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
            <label><span>Service Quota</span><input type="number" min="1" step="1" value={staffDraft.serviceQuota} onChange={(event) => updateStaffDraft("serviceQuota", event.target.value)} placeholder="Maximum service jobs" required /><small>This value must be defined before the technician can receive warranty claims.</small></label>
            <div className="tech-credential-preview"><span>Login ID</span><strong>{credentialPreview.loginIdentifier || "tech.branch.name"}</strong><span>Default password</span><strong>{credentialPreview.defaultPassword || "branch.name"}</strong></div>
            <p className="tech-staff-note">Email is not used. At first sign-in in the mobile app, the technician must confirm a contact number and replace the default password before accessing work.</p>
            <button type="submit" className="tech-primary-button" disabled={savingStaff}>{savingStaff ? "Adding technician…" : "Create technician account"}</button>
          </form> : null}
        </section> : null}

        <PersistentErrorNotice
          title="Please check this action"
          message={error}
          onDismiss={() => setError("")}
        />
        {notice ? <p className="tech-message tech-message--success">{notice}</p> : null}
        {temporaryPassword ? <p className="tech-message tech-message--temporary">Login ID: <strong>{createdLoginIdentifier}</strong><br />Default password: <strong>{temporaryPassword}</strong><br />Give both to the technician securely; the password is not shown again.</p> : null}

        <div className="tech-management-grid">
          <section className="admin-card tech-roster-card">
            <div className="tech-section-heading"><div><h2>Field team</h2><p>{filteredTechnicians.length} technician{filteredTechnicians.length === 1 ? "" : "s"} match the selected filters.</p></div></div>
            {loading ? <p className="tech-empty">Loading technicians…</p> : pageTechnicians.length === 0 ? <p className="tech-empty">No technicians match these filters.</p> : <div className="tech-roster-list">{pageTechnicians.map((technician) => {
              const openCount = openTasksByTechnician[String(technician.id)] || 0;
              const taskStats = taskStatsByTechnician[String(technician.id)] || {
                assigned: 0,
                open: 0,
                completed: 0,
                activeServices: 0,
                activeInstallations: 0,
                currentStatus: "",
              };
              const availability = technician.accountStatus !== "active"
                ? "Unavailable"
                : openCount >= 3
                  ? "Busy"
                  : "Available";
              const changing = updatingId === `tech-${technician.id}`;
              return <article className="tech-person-card" key={technician.id}>
                <div className="tech-person-main"><div className="tech-avatar">{technician.name.charAt(0).toUpperCase()}</div><div><h3>{technician.name}</h3><p>{technician.department || technician.skills?.[0] || "Field technician"}</p><small>{technician.username || technician.alias || technician.email || "No login ID recorded"}</small></div></div>
                <div className="tech-person-meta"><span className={`tech-account-status is-${technician.accountStatus}`}>{technician.accountStatus}</span><span className={`tech-availability is-${availability.toLowerCase()}`}>{availability}</span><span>{technician.branch || "Unassigned branch"}</span><strong>{openCount} assigned task{openCount === 1 ? "" : "s"}</strong></div>
                <div className="tech-person-workflow" aria-label={`${technician.name} work summary`}>
                  <span>Current work: <strong>{taskStats.currentStatus || "No active task"}</strong></span>
                  <span>Active service: <strong>{taskStats.activeServices}</strong></span>
                  <span>Installations: <strong>{taskStats.activeInstallations}</strong></span>
                  <span>Completed jobs: <strong>{taskStats.completed}</strong></span>
                </div>
                <label className="tech-inline-select"><span>Service Quota</span><input type="number" min="1" step="1" value={technician.serviceQuota || ""} disabled={changing} onChange={(event) => setTechnicians((current) => current.map((item) => item.id === technician.id ? { ...item, serviceQuota: event.target.value } : item))} /><small>{technician.serviceQuota ? "Required for warranty assignment" : "Required before warranty assignment"}</small></label>
                <button type="button" className="tech-secondary-button" disabled={changing || !Number.isSafeInteger(Number(technician.serviceQuota)) || Number(technician.serviceQuota) < 1} onClick={() => updateTechnician(technician, { serviceQuota: Number(technician.serviceQuota) }, `${technician.name}'s Service Quota is now ${technician.serviceQuota}.`)}>{changing ? "Saving…" : "Save quota"}</button>
                {isSuperAdmin ? <><label className="tech-inline-select tech-email-field"><span>Email address</span><input type="email" value={technician.email || ""} disabled={changing} onChange={(event) => setTechnicians((current) => current.map((item) => item.id === technician.id ? { ...item, email: event.target.value } : item))} placeholder="name@example.com" /><small>Contact email only; the technician still signs in with the unique login ID above.</small></label><button type="button" className="tech-secondary-button" disabled={changing || !isValidEmailFormat(technician.email)} onClick={() => saveTechnicianEmail(technician)}>{changing ? "Saving…" : "Save email"}</button></> : null}
                {isSuperAdmin ? <label className="tech-inline-select"><span>Branch assignment</span><select value={technician.branch} disabled={changing} onChange={(event) => updateTechnician(technician, { assignedBranch: event.target.value }, `${technician.name} is now assigned to ${event.target.value}.`)}><option value="">Select branch</option>{BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label> : null}
                <button type="button" className={technician.accountStatus === "active" ? "tech-danger-button" : "tech-primary-button"} disabled={changing} onClick={() => changeTechnicianAccountStatus(technician)}>{changing ? "Saving…" : technician.accountStatus === "active" ? "Disable account" : "Enable account"}</button>
              </article>;
            })}</div>}
            {filteredTechnicians.length > PAGE_SIZE ? <div className="tech-pagination"><span>Page {page} of {totalPages}</span><div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next</button></div></div> : null}
          </section>

          <form className="admin-card tech-assignment-form" onSubmit={createTask}>
            <div className="tech-section-heading"><div><h2>Create work order</h2><p>Assignment is saved directly to the selected technician’s My Work list.</p></div></div>
            <fieldset className="tech-form-section">
              <legend>Customer and service location</legend>
              {isSuperAdmin ? <label><span>Branch</span><select value={draft.branch} onChange={(event) => changeWorkOrderBranch(event.target.value)} required><option value="">Select branch</option>{BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label> : <p className="tech-branch-note">Branch: <strong>{homeBranch || "Your active branch"}</strong></p>}
              <CustomerCombobox
                customers={availableCustomers}
                value={draft.customerId}
                query={customerQuery}
                onQueryChange={updateCustomerQuery}
                onSelect={selectCustomer}
                disabled={isSuperAdmin && !draft.branch}
              />
              <label><span>Service address</span><select value={draft.addressId} onChange={(event) => selectAddress(event.target.value)} disabled={!draft.customerId} required><option value="">Select a saved address</option>{addressOptions.map((address) => <option key={address.id} value={address.id}>{address.label} · {address.address}</option>)}<option value={CUSTOM_ADDRESS_ID}>+ Use another address</option></select></label>
              {draft.customAddress ? <label><span>Custom service address</span><input value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} placeholder="Enter the complete service address" required /></label> : null}
              <label><span>Registered AC unit <small>(optional)</small></span><select value={draft.unitId} onChange={(event) => selectUnit(event.target.value)} disabled={!draft.customerId || customerUnits.length === 0}><option value="">{customerUnits.length ? "No specific unit" : "No registered units for this customer"}</option>{customerUnits.map((unit) => <option key={unit.unitId} value={unit.unitId}>{unit.modelName}{unit.serialNumber ? ` · ${unit.serialNumber}` : ""}</option>)}</select></label>
            </fieldset>

            <fieldset className="tech-form-section">
              <legend>Work details</legend>
              <label><span>Work type</span><select value={draft.serviceTypeId} onChange={(event) => updateDraft("serviceTypeId", event.target.value)} required><option value="">Select work type</option>{serviceOfferings.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}</select></label>
              <label><span>Instructions <small>(optional)</small></span><textarea rows="3" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="Add access notes or a short description of the work" /></label>
            </fieldset>

            <fieldset className="tech-form-section">
              <legend>Schedule and assignment</legend>
              <label><span>Assign technician</span><select value={draft.technicianId} onChange={(event) => updateDraft("technicianId", event.target.value)} disabled={!draft.customerId} required><option value="">Select an active technician</option>{availableForAssignment.map((technician) => {
                const conflict = technicianHasConflict(tasks, { technicianId: technician.id, scheduledDate: draft.scheduledDate, timeSlot: draft.timeSlot });
                return <option key={technician.id} value={technician.id} disabled={conflict}>{technician.name} · {openTasksByTechnician[String(technician.id)] || 0} open{conflict ? " · Schedule conflict" : ""}</option>;
              })}</select></label>
              <div className="tech-form-row"><label><span>Scheduled date</span><input type="date" min={today()} value={draft.scheduledDate} onChange={(event) => updateDraft("scheduledDate", event.target.value)} required /></label><label><span>Time slot</span><select value={draft.timeSlot} onChange={(event) => updateDraft("timeSlot", event.target.value)}>{TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label></div>
              <label><span>Priority</span><select value={draft.priority} onChange={(event) => updateDraft("priority", event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            </fieldset>
            <button className="tech-primary-button" type="submit" disabled={savingTask}>{savingTask ? "Creating work order…" : "Assign work order"}</button>
          </form>
        </div>

        <section className="admin-card tech-work-orders">
          <div className="tech-section-heading"><div><h2>Recent work assignments</h2><p>Reassign open work and review GPS arrival history for active and completed jobs.</p></div></div>
          {pageWorkAssignments.length === 0 ? <p className="tech-empty">There are no work orders yet.</p> : <div className="tech-work-list">{pageWorkAssignments.map((task) => {
            const checkIn = taskCheckIn(task);
            const mapUrl = checkInMapUrl(checkIn);
            return <article key={task.id} className="tech-work-item">
              <div className="tech-work-heading">
                <span className={`tech-task-status is-${String(task.status || "pending").replace(/\s+/g, "-")}`}>{task.status || "pending"}</span>
                <div><h3>{assignmentTitle(task)}</h3><small>{task.taskCode || "Work order"}</small></div>
              </div>
              <dl className="tech-work-meta">
                <div><dt>Customer</dt><dd>{task.customerName || task.customer || "Customer"}{task.unitName ? <small>{task.unitName}</small> : null}</dd></div>
                <div><dt>Branch</dt><dd>{task.branch || "No branch"}</dd></div>
                <div><dt>Schedule</dt><dd>{formatScheduledDate(task.scheduledDate)}<small>{task.timeSlot || "Time not set"}</small></dd></div>
                <div><dt>Technician</dt><dd>{task.assignedTechnicianName || "Not assigned"}</dd></div>
              </dl>
              <div className="tech-work-footer">
                {checkIn?.checkedInAt ? <div className="tech-check-in is-verified">
                  <strong>GPS check-in verified</strong>
                  <span>{formatCheckInTime(checkIn.checkedInAt)}</span>
                  <span>{formatCheckInCoordinates(checkIn)}</span>
                  {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer">Open check-in map</a> : null}
                </div> : <div className="tech-check-in"><strong>Not checked in</strong><span>The technician’s GPS arrival has not been recorded.</span></div>}
                {openTask(task) ? <label><span>Assigned technician</span><select value={task.assignedTechnicianId || ""} disabled={updatingId === `task-${task.id}`} onChange={(event) => updateTaskAssignment(task, event.target.value)}><option value="">Select technician</option>{technicians.filter((technician) => technician.accountStatus === "active" && (!task.branch || !technician.branch || technician.branch === task.branch)).map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}</select></label> : <p className="tech-completed-by"><span>Completed by</span><strong>{task.assignedTechnicianName || "Technician"}</strong></p>}
              </div>
            </article>;
          })}</div>}
          {tasks.length > WORK_ASSIGNMENT_PAGE_SIZE ? <nav className="tech-pagination" aria-label="Recent work assignments pagination">
            <span>Showing {(workPage - 1) * WORK_ASSIGNMENT_PAGE_SIZE + 1}–{Math.min(workPage * WORK_ASSIGNMENT_PAGE_SIZE, tasks.length)} of {tasks.length}</span>
            <div><button type="button" onClick={() => setWorkPage((current) => Math.max(1, current - 1))} disabled={workPage === 1}>Previous</button><span>Page {workPage} of {workTotalPages}</span><button type="button" onClick={() => setWorkPage((current) => Math.min(workTotalPages, current + 1))} disabled={workPage === workTotalPages}>Next</button></div>
          </nav> : null}
        </section>
      </section>}
    </AdminLayout>
  );
};

export default AdminTechnician;
