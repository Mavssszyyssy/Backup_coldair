import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "../Common/AdminLayout";
import { useUser } from "../../../context/UserContext";
import { translateText } from "../../../utils/customerI18n";
import useActiveBranches from "../../../domain/branches/useActiveBranches";
import { TECHNICIAN_TIME_SLOTS as TIME_SLOTS } from "../../../domain/technicianTimeSlots";
import { technicianHasConflict } from "../../../domain/scheduleConflicts";
import { apiRequest } from "../../../config/api";
import { formatBusinessDate, formatBusinessDateKey, formatBusinessDateTime } from "../../../utils/dateTime";
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
  String(status || "pending").replace(/[-_]/g, " ");
const isServiceTask = (task = {}) =>
  task?.payload?.source === "service_request" ||
  Boolean(task?.payload?.requestId);
const isInstallationTask = (task = {}) =>
  Boolean(task?.orderId || task?.orderCode || task?.payload?.orderId) ||
  /install/i.test(String(task?.title || ""));
const taskCheckIn = (task = {}) => task?.checkIn || task?.payload?.checkIn || null;
const formatCheckInTime = (value) => {
  if (!value) return "Time not recorded";
  return formatBusinessDateTime(value);
};
const formatScheduledDate = (value) => {
  if (!value) return "Date not set";
  const key = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? String(value)
    : formatBusinessDateKey(new Date(value));
  return formatBusinessDate(key);
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
  const { currentLanguage } = useUser();
  const t = (text) => translateText(text, currentLanguage);
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
      <span>{t("Customer / site")}</span>
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
        placeholder={t("Search customer name, email, phone, or address")}
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
      </button>) : <p>{t("No customers match this search.")}</p>}
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

const AdminTechnician = ({ embedded = false, initialView = "technicians", recordId = "" }) => {
  const branchNames = useActiveBranches();
  const { user, currentLanguage } = useUser();
  const t = (text) => translateText(text, currentLanguage);
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
  const [workSearch, setWorkSearch] = useState("");
  const [workStatusFilter, setWorkStatusFilter] = useState("all");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [workTechnicianFilter, setWorkTechnicianFilter] = useState("all");
  const [expandedTechnicianIds, setExpandedTechnicianIds] = useState([]);
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
  useEffect(() => { setWorkPage(1); }, [workSearch, workStatusFilter, workTypeFilter, workTechnicianFilter]);
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
  const filteredWorkAssignments = useMemo(() => {
    const needle = workSearch.trim().toLowerCase();
    return tasks.filter((task) => {
      const status = String(task.status || "pending").toLowerCase().replace(/_/g, "-");
      const type = isInstallationTask(task) ? "installation" : "service";
      const searchable = [
        task.taskCode,
        task.orderCode,
        task.title,
        task.issueType,
        task.customerName,
        task.customer,
        task.unitName,
        task.branch,
        task.assignedTechnicianName,
      ].filter(Boolean).join(" ").toLowerCase();
      const searchMatches = !needle || searchable.includes(needle);
      const statusMatches = workStatusFilter === "all" || status === workStatusFilter;
      const typeMatches = workTypeFilter === "all" || type === workTypeFilter;
      const technicianMatches = workTechnicianFilter === "all" || String(task.assignedTechnicianId || "") === workTechnicianFilter;
      return searchMatches && statusMatches && typeMatches && technicianMatches;
    });
  }, [tasks, workSearch, workStatusFilter, workTechnicianFilter, workTypeFilter]);
  const workTotalPages = Math.max(1, Math.ceil(filteredWorkAssignments.length / WORK_ASSIGNMENT_PAGE_SIZE));
  useEffect(() => { setWorkPage((current) => Math.min(current, workTotalPages)); }, [workTotalPages]);
  const pageWorkAssignments = filteredWorkAssignments.slice((workPage - 1) * WORK_ASSIGNMENT_PAGE_SIZE, workPage * WORK_ASSIGNMENT_PAGE_SIZE);
  const hasWorkFilters = Boolean(workSearch.trim()) || workStatusFilter !== "all" || workTypeFilter !== "all" || workTechnicianFilter !== "all";
  useEffect(() => {
    if (!recordId || !tasks.length) return;
    const index = tasks.findIndex((task) => String(task.id || task._id) === recordId || String(task.taskCode) === recordId);
    if (index < 0) { setError("This work order is no longer available in your authorized list."); return; }
    setWorkspaceView("technicians");
    setWorkPage(Math.floor(index / WORK_ASSIGNMENT_PAGE_SIZE) + 1);
    window.setTimeout(() => document.getElementById(`tech-work-${recordId}`)?.scrollIntoView({ block: "center" }), 0);
  }, [recordId, tasks]);
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
  const toggleTechnicianDetails = (technicianId) => setExpandedTechnicianIds((current) => {
    const key = String(technicianId);
    return current.includes(key) ? current.filter((id) => id !== key) : [...current, key];
  });

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
      setError("Enter the technician's name, username, and assigned branch.");
      return;
    }
    if (credentialPreview.loginIdentifier.length > 30 || credentialPreview.defaultPassword.length > 25) {
      setError("Use a shorter username so the Login ID and default password fit their limits.");
      return;
    }
    if (loginName.length < 2) {
      setError("Enter a technician username with at least 2 letters or numbers.");
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
      setNotice(`${firstName} ${lastName} ${t('was added. Share the first-use credentials below securely.')}`);
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
      setError(`${technician.name} ${t('already has an overlapping work order on this date and time.')}`);
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
      setNotice(`${t('Work order assigned to')} ${technician.name}.`);
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
      const successMessage = `${t('Work order reassigned to')} ${technician.name}.`;
      setTasks((current) => current.map((item) => item.id === task.id ? result.task : item));
      setNotice(successMessage);
      void alertDialog({
        title: t("Work order reassigned"),
        message: successMessage,
        confirmText: t("Done"),
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
      `${technician.name}${t("'s email was updated successfully.")}`,
    );
  };

  const activateTask = async (task) => {
    setUpdatingId(`task-${task.id}`);
    setError("");
    try {
      const result = await apiRequest(`/tasks/${task.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "in-progress" }),
      });
      setTasks((current) => current.map((item) => item.id === task.id ? result.task : item));
      setNotice(`${task.taskCode || t("Work order")} ${t('is active. The technician can now begin the visit.')}`);
    } catch (requestError) {
      setError(requestError.message || "Unable to activate this work order.");
    } finally {
      setUpdatingId("");
    }
  };

  const changeTechnicianAccountStatus = async (technician) => {
    const isDisabling = technician.accountStatus === "active";
    if (isDisabling) {
      const confirmed = await confirmDialog({
        title: t("Disable technician account?"),
        message: `${t("Disable the account of")} ${technician.name}? ${t("The account will remain disabled until an administrator enables it again.")}`,
        confirmText: t("Disable account"),
        cancelText: t("Keep account active"),
        destructive: true,
      });
      if (!confirmed) return;
    }

    await updateTechnician(
      technician,
      { status: isDisabling ? "disabled" : "active" },
      `${technician.name}${t("'s account is now")} ${t(isDisabling ? "disabled" : "active")}.`,
    );
  };

  return (
    <AdminLayout title={t("Technician Management")} subtitle={t("Assign work, monitor workload, and keep field coverage organized.")} embedded={embedded}>
      <div className="module-tabs tech-workspace-tabs" role="tablist" aria-label={t("Technician workspace sections")}>
        <button type="button" role="tab" aria-selected={workspaceView === "technicians"} className={workspaceView === "technicians" ? "active" : ""} onClick={() => setWorkspaceView("technicians")}>{t("Technicians")}</button>
        <button type="button" role="tab" aria-selected={workspaceView === "schedule"} className={workspaceView === "schedule" ? "active" : ""} onClick={() => setWorkspaceView("schedule")}>{t("Daily Schedule")}</button>
      </div>
      {workspaceView === "schedule" ? <DailyWorkSchedule /> : <section className="tech-management">
        <div className="tech-summary-grid">
          <article><span>{t("Total technicians")}</span><strong>{technicians.length}</strong><small>{t("Visible to your access level")}</small></article>
          <article><span>{t("Active accounts")}</span><strong>{activeCount}</strong><small>{t("Ready for work assignment")}</small></article>
          <article><span>{t("Busy technicians")}</span><strong>{busyCount}</strong><small>{t("Three or more open work orders")}</small></article>
          <article><span>{t("Open work orders")}</span><strong>{tasks.filter(openTask).length}</strong><small>{t("Pending, in progress, or on hold")}</small></article>
        </div>

        <section className="tech-filter-card admin-card" aria-label={t("Technician filters")}>
          <div className="tech-filter-heading"><div><h2>{t("Find a technician")}</h2><p>{t("Use the filters to match one assigned technician to each job.")}</p></div><button type="button" className="tech-secondary-button" onClick={load} disabled={loading}>{t(loading ? "Refreshing…" : "Refresh")}</button></div>
          <div className="tech-filter-grid">
            <label className="tech-search-field"><span>{t("Search")}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Name, login ID, skill, or branch")} /></label>
            <label><span>{t("Account status")}</span><select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}><option value="all">{t("All accounts")}</option><option value="active">{t("Active")}</option><option value="disabled">{t("Disabled")}</option></select></label>
            <label><span>{t("Workload")}</span><select value={workloadFilter} onChange={(event) => setWorkloadFilter(event.target.value)}><option value="all">{t("All workloads")}</option><option value="available">{t("Available (under 3 open)")}</option><option value="busy">{t("Busy (3+ open)")}</option></select></label>
            <label><span>{t("Branch")}</span><select value={branchFilter} disabled={!isSuperAdmin && Boolean(homeBranch)} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">{t("All branches")}</option>{branchNames.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
          </div>
        </section>

        {isSuperAdmin ? <section className="tech-add-staff-card admin-card" aria-label={t("Add technician staff")}>
          <div className="tech-filter-heading">
            <div><h2>{t("Add technician staff")}</h2><p>{t("Create a branch-based technician login without using an email address.")}</p></div>
            <button type="button" className="tech-primary-button" disabled={savingStaff} onClick={() => { setShowAddStaff((current) => !current); setError(""); }}>{t(showAddStaff ? "Close" : "Add technician")}</button>
          </div>
          {showAddStaff ? <form className="tech-add-staff-form" onSubmit={createTechnician}>
            <div className="tech-form-row">
              <label><span>{t("First name")}</span><input value={staffDraft.firstName} onChange={(event) => updateStaffDraft("firstName", event.target.value)} autoComplete="given-name" required /></label>
              <label><span>{t("Last name")}</span><input value={staffDraft.lastName} onChange={(event) => updateStaffDraft("lastName", event.target.value)} autoComplete="family-name" required /></label>
            </div>
            <label><span>{t("Username")}</span><input value={staffDraft.loginName} onChange={(event) => updateStaffDraft("loginName", event.target.value)} placeholder={t("e.g. j.delacruz")} autoComplete="off" required /><small>{t("Use a short, unique username. Check the generated Login ID below.")}</small></label>
            <label><span>{t("Assigned branch")}</span><select value={staffDraft.branch} onChange={(event) => updateStaffDraft("branch", event.target.value)} required><option value="">{t("Select branch")}</option>{branchNames.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
            <label><span>{t("Service Quota")}</span><input type="number" min="1" step="1" value={staffDraft.serviceQuota} onChange={(event) => updateStaffDraft("serviceQuota", event.target.value)} placeholder={t("Maximum service jobs")} required /><small>{t("This value must be defined before the technician can receive warranty claims.")}</small></label>
            <div className="tech-credential-preview"><span>{t("Login ID")}</span><strong>{credentialPreview.loginIdentifier || "tech.branch.name"}</strong><span>{t("Default password")}</span><strong>{credentialPreview.defaultPassword || "branch.name"}</strong></div>
            <p className="tech-staff-note">{t("Email is not used. At first sign-in in the mobile app, the technician must confirm a contact number and replace the default password before accessing work.")}</p>
            <button type="submit" className="tech-primary-button" disabled={savingStaff}>{t(savingStaff ? "Adding technician…" : "Create technician account")}</button>
          </form> : null}
        </section> : null}

        <PersistentErrorNotice
          title={t("Please check this action")}
          message={t(error)}
          onDismiss={() => setError("")}
        />
        {notice ? <p className="tech-message tech-message--success">{t(notice)}</p> : null}
        {temporaryPassword ? <p className="tech-message tech-message--temporary">{t("Login ID:")} <strong>{createdLoginIdentifier}</strong><br />{t("Default password:")} <strong>{temporaryPassword}</strong><br />{t("Give both to the technician securely; the password is not shown again.")}</p> : null}

        <div className="tech-management-grid">
          <section className="admin-card tech-roster-card">
            <div className="tech-section-heading"><div><h2>{t("Field team")}</h2><p>{filteredTechnicians.length} {t(filteredTechnicians.length === 1 ? "technician" : "technicians")} {t("match the selected filters.")}</p></div></div>
            {loading ? <p className="tech-empty">{t("Loading technicians…")}</p> : pageTechnicians.length === 0 ? <p className="tech-empty">{t("No technicians match these filters.")}</p> : <div className="tech-roster-list">{pageTechnicians.map((technician) => {
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
              const detailsExpanded = expandedTechnicianIds.includes(String(technician.id));
              return <article className="tech-person-card" key={technician.id}>
                <div className="tech-person-summary">
                  <div className="tech-person-main"><div className="tech-avatar">{technician.name.charAt(0).toUpperCase()}</div><div><h3>{technician.name}</h3><p>{technician.department || technician.skills?.[0] || t("Field technician")}</p><small>{technician.username || technician.alias || technician.email || t("No login ID recorded")}</small></div></div>
                  <div className="tech-person-meta"><span className={`tech-account-status is-${technician.accountStatus}`}>{t(technician.accountStatus)}</span><span className={`tech-availability is-${availability.toLowerCase()}`}>{t(availability)}</span><span>{technician.branch || t("Unassigned branch")}</span><strong>{openCount} {t(openCount === 1 ? "assigned task" : "assigned tasks")}</strong></div>
                  <button
                    type="button"
                    className="tech-details-toggle"
                    aria-expanded={detailsExpanded}
                    aria-controls={`technician-details-${technician.id}`}
                    aria-label={`${t(detailsExpanded ? "Show less" : "See more")} ${t("details for")} ${technician.name}`}
                    onClick={() => toggleTechnicianDetails(technician.id)}
                  >{t(detailsExpanded ? "Show Less" : "See More")}</button>
                </div>
                <div className="tech-person-workflow" aria-label={`${technician.name} ${t("work summary")}`}>
                  <span>{t("Current work:")} <strong>{t(taskStats.currentStatus || "No active task")}</strong></span>
                  <span>{t("Active service:")} <strong>{taskStats.activeServices}</strong></span>
                  <span>{t("Installations:")} <strong>{taskStats.activeInstallations}</strong></span>
                  <span>{t("Completed jobs:")} <strong>{taskStats.completed}</strong></span>
                </div>
                {detailsExpanded ? <div className="tech-person-details" id={`technician-details-${technician.id}`}>
                  <div className="tech-person-control-row">
                    <label className="tech-inline-select"><span>{t("Service Quota")}</span><input type="number" min="1" step="1" value={technician.serviceQuota || ""} disabled={changing} onChange={(event) => setTechnicians((current) => current.map((item) => item.id === technician.id ? { ...item, serviceQuota: event.target.value } : item))} /><small>{t(technician.serviceQuota ? "Required for warranty assignment" : "Required before warranty assignment")}</small></label>
                    <button type="button" className="tech-secondary-button" disabled={changing || !Number.isSafeInteger(Number(technician.serviceQuota)) || Number(technician.serviceQuota) < 1} onClick={() => updateTechnician(technician, { serviceQuota: Number(technician.serviceQuota) }, `${technician.name}${t("'s Service Quota is now")} ${technician.serviceQuota}.`)}>{t(changing ? "Saving…" : "Save quota")}</button>
                  </div>
                  {isSuperAdmin ? <div className="tech-person-control-row"><label className="tech-inline-select tech-email-field"><span>{t("Email address")}</span><input type="email" value={technician.email || ""} disabled={changing} onChange={(event) => setTechnicians((current) => current.map((item) => item.id === technician.id ? { ...item, email: event.target.value } : item))} placeholder="name@example.com" /><small>{t("Contact email only; the technician still signs in with the unique login ID above.")}</small></label><button type="button" className="tech-secondary-button" disabled={changing || !isValidEmailFormat(technician.email)} onClick={() => saveTechnicianEmail(technician)}>{t(changing ? "Saving…" : "Save email")}</button></div> : null}
                  <div className="tech-person-control-row">
                    {isSuperAdmin ? <label className="tech-inline-select"><span>{t("Branch assignment")}</span><select value={technician.branch} disabled={changing} onChange={(event) => updateTechnician(technician, { assignedBranch: event.target.value }, `${technician.name} ${t('is now assigned to')} ${event.target.value}.`)}><option value="">{t("Select branch")}</option>{branchNames.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label> : <span />}
                    <button type="button" className={technician.accountStatus === "active" ? "tech-danger-button" : "tech-primary-button"} disabled={changing} onClick={() => changeTechnicianAccountStatus(technician)}>{t(changing ? "Saving…" : technician.accountStatus === "active" ? "Disable account" : "Enable account")}</button>
                  </div>
                </div> : null}
              </article>;
            })}</div>}
            {filteredTechnicians.length > PAGE_SIZE ? <div className="tech-pagination"><span>{t("Page")} {page} {t("of")} {totalPages}</span><div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>{t("Previous")}</button><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>{t("Next")}</button></div></div> : null}
          </section>

          <form className="admin-card tech-assignment-form" onSubmit={createTask}>
            <div className="tech-section-heading"><div><h2>{t("Create work order")}</h2><p>{t("Assignment is saved directly to the selected technician’s My Work list.")}</p></div></div>
            <fieldset className="tech-form-section">
              <legend>{t("Customer and service location")}</legend>
              {isSuperAdmin ? <label><span>{t("Branch")}</span><select value={draft.branch} onChange={(event) => changeWorkOrderBranch(event.target.value)} required><option value="">{t("Select branch")}</option>{branchNames.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label> : <p className="tech-branch-note">{t("Branch:")} <strong>{homeBranch || "Your active branch"}</strong></p>}
              <CustomerCombobox
                customers={availableCustomers}
                value={draft.customerId}
                query={customerQuery}
                onQueryChange={updateCustomerQuery}
                onSelect={selectCustomer}
                disabled={isSuperAdmin && !draft.branch}
              />
              <label><span>{t("Service address")}</span><select value={draft.addressId} onChange={(event) => selectAddress(event.target.value)} disabled={!draft.customerId} required><option value="">{t("Select a saved address")}</option>{addressOptions.map((address) => <option key={address.id} value={address.id}>{address.label} · {address.address}</option>)}<option value={CUSTOM_ADDRESS_ID}>{t("+ Use another address")}</option></select></label>
              {draft.customAddress ? <label><span>{t("Custom service address")}</span><input value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} placeholder={t("Enter the complete service address")} required /></label> : null}
              <label><span>{t("Registered AC unit")} <small>{t("(optional)")}</small></span><select value={draft.unitId} onChange={(event) => selectUnit(event.target.value)} disabled={!draft.customerId || customerUnits.length === 0}><option value="">{t(customerUnits.length ? "No specific unit" : "No registered units for this customer")}</option>{customerUnits.map((unit) => <option key={unit.unitId} value={unit.unitId}>{unit.modelName}{unit.serialNumber ? ` · ${unit.serialNumber}` : ""}</option>)}</select></label>
            </fieldset>

            <fieldset className="tech-form-section">
              <legend>{t("Work details")}</legend>
              <label><span>{t("Work type")}</span><select value={draft.serviceTypeId} onChange={(event) => updateDraft("serviceTypeId", event.target.value)} required><option value="">{t("Select work type")}</option>{serviceOfferings.map((service) => <option key={service.id} value={service.id}>{t(service.title)}</option>)}</select></label>
              <label><span>{t("Instructions")} <small>{t("(optional)")}</small></span><textarea rows="3" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder={t("Add access notes or a short description of the work")} /></label>
            </fieldset>

            <fieldset className="tech-form-section">
              <legend>{t("Schedule and assignment")}</legend>
              <label><span>{t("Assign technician")}</span><select value={draft.technicianId} onChange={(event) => updateDraft("technicianId", event.target.value)} disabled={!draft.customerId} required><option value="">{t("Select an active technician")}</option>{availableForAssignment.map((technician) => {
                const conflict = technicianHasConflict(tasks, { technicianId: technician.id, scheduledDate: draft.scheduledDate, timeSlot: draft.timeSlot });
                return <option key={technician.id} value={technician.id} disabled={conflict}>{technician.name} · {openTasksByTechnician[String(technician.id)] || 0} {t("open")}{conflict ? ` · ${t("Schedule conflict")}` : ""}</option>;
              })}</select></label>
              <div className="tech-form-row"><label><span>{t("Scheduled date")}</span><input type="date" min={today()} value={draft.scheduledDate} onChange={(event) => updateDraft("scheduledDate", event.target.value)} required /></label><label><span>{t("Time slot")}</span><select value={draft.timeSlot} onChange={(event) => updateDraft("timeSlot", event.target.value)}>{TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label></div>
              <label><span>{t("Priority")}</span><select value={draft.priority} onChange={(event) => updateDraft("priority", event.target.value)}><option value="low">{t("Low")}</option><option value="medium">{t("Medium")}</option><option value="high">{t("High")}</option></select></label>
            </fieldset>
            <button className="tech-primary-button" type="submit" disabled={savingTask}>{t(savingTask ? "Creating work order…" : "Assign work order")}</button>
          </form>
        </div>

        <section className="admin-card tech-work-orders">
          <div className="tech-section-heading"><div><h2>{t("Recent work assignments")}</h2><p>{t("Search, filter, activate, or reassign work without scanning the entire history.")}</p></div><span className="tech-result-count">{filteredWorkAssignments.length} {t("of")} {tasks.length} {t("shown")}</span></div>
          <div className="tech-work-filters" aria-label={t("Work assignment filters")}>
            <label className="tech-work-search"><span>{t("Search assignments")}</span><input type="search" value={workSearch} onChange={(event) => setWorkSearch(event.target.value)} placeholder={t("Work order, customer, unit, branch…")} /></label>
            <label><span>{t("Status")}</span><select value={workStatusFilter} onChange={(event) => setWorkStatusFilter(event.target.value)}><option value="all">{t("All statuses")}</option><option value="pending">{t("Awaiting Admin")}</option><option value="in-progress">{t("In progress")}</option><option value="installing">{t("Installing")}</option><option value="on-hold">{t("On hold")}</option><option value="completed">{t("Completed")}</option></select></label>
            <label><span>{t("Assignment type")}</span><select value={workTypeFilter} onChange={(event) => setWorkTypeFilter(event.target.value)}><option value="all">{t("All work types")}</option><option value="service">{t("Service")}</option><option value="installation">{t("Installation")}</option></select></label>
            <label><span>{t("Technician")}</span><select value={workTechnicianFilter} onChange={(event) => setWorkTechnicianFilter(event.target.value)}><option value="all">{t("All technicians")}</option>{technicians.map((technician) => <option key={technician.id} value={String(technician.id)}>{technician.name}</option>)}</select></label>
            {hasWorkFilters ? <button type="button" className="tech-clear-filters" onClick={() => { setWorkSearch(""); setWorkStatusFilter("all"); setWorkTypeFilter("all"); setWorkTechnicianFilter("all"); }}>{t("Clear filters")}</button> : null}
          </div>
          {pageWorkAssignments.length === 0 ? <p className="tech-empty">{t(tasks.length ? "No work assignments match these filters." : "There are no work orders yet.")}</p> : <div className="tech-work-list">{pageWorkAssignments.map((task) => {
            const checkIn = taskCheckIn(task);
            const mapUrl = checkInMapUrl(checkIn);
            const installation = isInstallationTask(task);
            return <article key={task.id} id={`tech-work-${task.id}`} className="tech-work-item">
              <div className="tech-work-heading">
                <div><h3>{assignmentTitle(task)}</h3><small>{task.taskCode || t("Work order")}</small></div>
                <div className="tech-work-badges"><span className={`tech-task-status is-${String(task.status || "pending").replace(/[\s_]+/g, "-")}`}>{t(taskStatusLabel(task.status))}</span><span className={`tech-work-kind is-${installation ? "installation" : "service"}`}>{t(installation ? "Installation" : "Service")}</span></div>
              </div>
              <dl className="tech-work-meta">
                <div><dt>{t("Customer")}</dt><dd>{task.customerName || task.customer || t("Customer")}{task.unitName ? <small>{task.unitName}</small> : null}</dd></div>
                <div><dt>{t("Branch")}</dt><dd>{task.branch || t("No branch")}</dd></div>
                <div><dt>{t("Schedule")}</dt><dd>{t(formatScheduledDate(task.scheduledDate))}<small>{task.timeSlot || t("Time not set")}</small></dd></div>
                <div><dt>{t("Technician")}</dt><dd>{task.assignedTechnicianName || t("Not assigned")}</dd></div>
              </dl>
              <div className="tech-work-footer">
                {String(task.status || "").toLowerCase() === "pending" && !(task.orderId || task.orderCode || task.payload?.orderId || task.payload?.orderCode) ? <button type="button" className="tech-primary-button" disabled={updatingId === `task-${task.id}`} onClick={() => activateTask(task)}>{t(updatingId === `task-${task.id}` ? "Activating…" : "Activate work order")}</button> : null}
                {checkIn?.checkedInAt ? <div className="tech-check-in is-verified">
                  <strong>{t("GPS check-in verified")}</strong>
                  <span>{formatCheckInTime(checkIn.checkedInAt)}</span>
                  <span>{t(formatCheckInCoordinates(checkIn))}</span>
                  {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer">{t("Open check-in map")}</a> : null}
                </div> : <div className="tech-check-in"><strong>{t("Not checked in")}</strong><span>{t("The technician’s GPS arrival has not been recorded.")}</span></div>}
                {openTask(task) ? <label><span>{t("Assigned technician")}</span><select value={task.assignedTechnicianId || ""} disabled={updatingId === `task-${task.id}`} onChange={(event) => updateTaskAssignment(task, event.target.value)}><option value="">{t("Select technician")}</option>{technicians.filter((technician) => technician.accountStatus === "active" && (!task.branch || !technician.branch || technician.branch === task.branch)).map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}</select></label> : <p className="tech-completed-by"><span>{t("Completed by")}</span><strong>{task.assignedTechnicianName || t("Technician")}</strong></p>}
              </div>
            </article>;
          })}</div>}
          {filteredWorkAssignments.length > WORK_ASSIGNMENT_PAGE_SIZE ? <nav className="tech-pagination" aria-label={t("Recent work assignments pagination")}>
            <span>{t("Showing")} {(workPage - 1) * WORK_ASSIGNMENT_PAGE_SIZE + 1}–{Math.min(workPage * WORK_ASSIGNMENT_PAGE_SIZE, filteredWorkAssignments.length)} {t("of")} {filteredWorkAssignments.length}</span>
            <div><button type="button" onClick={() => setWorkPage((current) => Math.max(1, current - 1))} disabled={workPage === 1}>{t("Previous")}</button><span>{t("Page")} {workPage} {t("of")} {workTotalPages}</span><button type="button" onClick={() => setWorkPage((current) => Math.min(workTotalPages, current + 1))} disabled={workPage === workTotalPages}>{t("Next")}</button></div>
          </nav> : null}
        </section>
      </section>}
    </AdminLayout>
  );
};

export default AdminTechnician;
