import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

import { COLORS, FONT, RADIUS, SPACING } from "../../constants/theme";
import { confirmAction } from "../../utils/confirmAction";
import BottomSheetSelect from "../ui/BottomSheetSelect";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import {
  changeOperationalServiceStatus,
  changeOperationalTaskStatus,
  changeStaffUserStatus,
  createReorderRequest,
  createStaffAccount,
  createStaffProduct,
  fetchAmpForecast,
  fetchAmpPipeline,
  fetchAmpReportUnits,
  fetchBranchCoverage,
  fetchOperationalServices,
  fetchOperationalTasks,
  fetchPartsRequests,
  fetchReorderRequests,
  fetchSalesReport,
  fetchStaffAuditLogs,
  fetchStaffDashboard,
  fetchStaffOrders,
  fetchStaffProducts,
  fetchStaffUsers,
  fetchWarrantyClaims,
  generateStaffAmpReport,
  processStaffOrder,
  restockStaffProduct,
  reviewReorderRequest,
  reviewWarrantyClaim,
  saveBranchCoverage,
  updatePartsRequest,
  updateStaffProduct,
  verifyStaffOrderPayment,
} from "../../services/staffApi";
import { STAFF_ACCENT, StaffDataRow, StaffGrid, StaffHero, StaffMessage, StaffPager, StaffSection, StaffStat } from "./StaffKit";

const PAGE_SIZE = 8;
const BRANCHES = ["Bulacan", "Cavite", "Laguna", "Bataan", "Pangasinan", "Ilocos"];
const peso = (value) => `PHP ${Number(value || 0).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
const displayName = (user = {}) => user.name || [user.name_first, user.name_last].filter(Boolean).join(" ") || user.alias || user.email || "User";
const taskColor = (status = "") => ["completed", "active"].includes(String(status).toLowerCase()) ? COLORS.success : ["cancelled", "failed", "inactive"].includes(String(status).toLowerCase()) ? COLORS.danger : COLORS.warning;
const pageSlice = (items, page) => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

function useModuleLoad(loader, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try { setData(await loader()); } catch (requestError) { setError(requestError?.message || "Unable to load this module."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, setData, loading, error, load };
}

export function DashboardModule({ token, current, refreshKey }) {
  const { data, loading, error, load } = useModuleLoad(() => fetchStaffDashboard(token), [token, refreshKey]);
  const stats = data?.stats || {};
  const analytics = data?.analytics || {};
  const role = String(current?.role || "staff").replace(/_/g, " ");
  return <>
    <StaffHero eyebrow={`${role.toUpperCase()} WORKSPACE`} title={`Welcome, ${displayName(current)}`} subtitle={stats.branchLabel ? `${stats.branchLabel} · Live operational data from the shared backend` : "Live operational data from the shared backend"} icon="grid-sharp" />
    <StaffMessage loading={loading} error={error} />
    {!loading && !error ? <>
      <StaffGrid>
        {current?.role === "superadmin" ? <><StaffStat label="Total users" value={stats.totalUsers} icon="people-sharp" /><StaffStat label="Admins" value={stats.admins} icon="shield-sharp" /><StaffStat label="Technicians" value={stats.technicians} icon="construct-sharp" /><StaffStat label="Customers" value={stats.customers} icon="person-sharp" /></> : null}
        {current?.role === "admin" ? <><StaffStat label="Pending tasks" value={stats.pendingTasks} icon="clipboard-sharp" color={COLORS.warning} /><StaffStat label="Technicians" value={stats.activeTechnicians} icon="construct-sharp" /><StaffStat label="Customers" value={stats.totalCustomers} icon="people-sharp" /><StaffStat label="Service requests" value={stats.serviceRequests} icon="build-sharp" /></> : null}
        {["admin", "superadmin"].includes(current?.role) ? <><StaffStat label="Total orders" value={stats.totalOrders} icon="cart-sharp" /><StaffStat label="Paid orders" value={stats.paidOrders} icon="checkmark-circle-sharp" color={COLORS.success} /><StaffStat label="Sales" value={peso(stats.totalSales)} icon="cash-sharp" color={COLORS.success} /><StaffStat label="Average order" value={peso(stats.averageOrderValue)} icon="trending-up-sharp" /></> : null}
      </StaffGrid>
      {!!analytics.orderStages?.length && <StaffSection title="Order Pipeline" subtitle="Current workload by fulfillment stage" icon="git-branch-sharp">{analytics.orderStages.map((stage) => <StaffDataRow key={stage.key} title={stage.label} subtitle={`${stage.count} order(s)`} meta={`${peso(stage.revenue)} paid revenue`} status={String(stage.count)} />)}</StaffSection>}
      {!!analytics.topProducts?.length && <StaffSection title="Top Products" subtitle="Sales based on completed payments" icon="podium-sharp">{analytics.topProducts.map((item) => <StaffDataRow key={item.product} title={item.product} subtitle={`${item.unitsSold} unit(s) sold`} meta={peso(item.sales)} />)}</StaffSection>}
    </> : null}
    {!!error && <Button title="Try Again" onPress={load} accentColor={STAFF_ACCENT} />}
  </>;
}

const ORDER_ACTIONS = {
  to_pay: { label: "Approve Payment", action: "approve" },
  to_deliver: { label: "Mark Dispatched", action: "dispatch" },
  to_install: { label: "Mark Complete", action: "complete" },
};

export function OrdersModule({ token, refreshKey }) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [assignments, setAssignments] = useState({});
  const { data, loading, error, load } = useModuleLoad(async () => {
    const [orderResult, userResult] = await Promise.all([fetchStaffOrders(token), fetchStaffUsers(token)]);
    setTechnicians((userResult.users || []).filter((user) => user.role === "technician" && String(user.status || user.accountStatus || "active").toLowerCase() === "active"));
    return orderResult;
  }, [token, refreshKey]);
  const orders = data?.orders || [];
  const filtered = useMemo(() => orders.filter((order) => [order.orderCode, order.customerName, order.customerEmail, order.workflowStatus, ...(order.items || []).map((item) => item.name)].filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase())), [orders, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => setPage(1), [query]);

  const runAction = async (order, config) => {
    const technician = technicians.find((item) => String(item.id) === String(assignments[order.id]));
    if (config.action === "dispatch" && !technician) return Alert.alert("Technician required", "Select a technician before dispatching this order.");
    setBusy(`${order.id}:${config.action}`);
    try {
      await processStaffOrder(token, order.id, { action: config.action, assignedTechnicianId: technician?.id || "", assignedTechnicianName: technician ? displayName(technician) : "" });
      await load();
    } catch (actionError) { Alert.alert("Unable to update order", actionError.message); }
    finally { setBusy(""); }
  };
  return <>
    <StaffSection title="Customer Orders" subtitle="Shared order lifecycle for web and mobile" icon="cart-sharp">
      <TextField label="Search orders" value={query} onChangeText={setQuery} placeholder="Order, customer, product, or status" />
      <StaffMessage loading={loading} error={error} empty={!filtered.length} emptyText="No orders match the current search." />
      {pageSlice(filtered, page).map((order) => {
        const action = ORDER_ACTIONS[order.workflowStatus];
        const selected = technicians.find((item) => String(item.id) === String(assignments[order.id]));
        const itemSummary = (order.items || []).map((item) => `${item.quantity || 1}× ${item.name || "AC Unit"}${item.horsepower ? ` (${item.horsepower} HP)` : ""}`).join(", ");
        return <StaffDataRow key={order.id} title={order.orderCode || order.id} subtitle={`${order.customerName || order.customerEmail || "Customer"} · ${itemSummary || "No items"}`} meta={`${peso(order.totalAmount)} · ${order.paymentMethod || "Payment not recorded"}`} status={order.workflowLabel || String(order.workflowStatus || "").replace(/_/g, " ")} statusColor={taskColor(order.workflowStatus)}>
          {order.workflowStatus === "to_deliver" ? <BottomSheetSelect label="Assigned Technician" value={selected ? displayName(selected) : order.assignedTechnician || ""} placeholder="Select technician" items={technicians} getKey={(item) => String(item.id)} getLabel={displayName} itemIcon="construct-sharp" accentColor={STAFF_ACCENT} onSelect={(item) => setAssignments((current) => ({ ...current, [order.id]: item.id }))} /> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            {!!action && <Button title={busy === `${order.id}:${action.action}` ? "Saving…" : action.label} size="sm" loading={busy === `${order.id}:${action.action}`} onPress={() => runAction(order, action)} accentColor={STAFF_ACCENT} style={{ flexGrow: 1 }} />}
            {String(order.paymentProvider || "").toLowerCase() === "paymongo" && String(order.paymentStatus || "").toLowerCase() === "pending" ? <Button title="Verify PayMongo" size="sm" variant="secondary" loading={busy === `${order.id}:verify`} onPress={async () => { setBusy(`${order.id}:verify`); try { await verifyStaffOrderPayment(token, order.id); await load(); } catch (verifyError) { Alert.alert("Verification failed", verifyError.message); } finally { setBusy(""); } }} accentColor={STAFF_ACCENT} style={{ flexGrow: 1 }} /> : null}
            {["to_pay", "to_deliver"].includes(order.workflowStatus) ? <Button title="Cancel" size="sm" variant="danger" loading={busy === `${order.id}:cancel`} onPress={() => confirmAction({ title: "Cancel order", message: `Cancel ${order.orderCode || order.id}?`, confirmText: "Cancel Order", destructive: true, onConfirm: () => runAction(order, { action: "cancel" }) })} style={{ flexGrow: 1 }} /> : null}
          </View>
        </StaffDataRow>;
      })}
      <StaffPager page={page} totalPages={totalPages} onChange={setPage} />
    </StaffSection>
  </>;
}

export function InventoryModule({ token, current, refreshKey }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [amounts, setAmounts] = useState({});
  const [branches, setBranches] = useState({});
  const [busy, setBusy] = useState("");
  const [createForm, setCreateForm] = useState({ name: "", sku: "", brand: "", category: "split", specs: "", price: "", threshold: "", branch: "Cavite", stock: "" });
  const [edits, setEdits] = useState({});
  const { data, loading, error, load } = useModuleLoad(() => fetchStaffProducts(token), [token, refreshKey]);
  const products = data?.products || [];
  const filtered = useMemo(() => products.filter((product) => [product.name, product.sku, product.brand, product.specs].filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase())), [products, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => setPage(1), [query]);
  const restock = async (product) => {
    const quantity = Number(amounts[product.id]);
    if (!Number.isFinite(quantity) || quantity <= 0) return Alert.alert("Invalid quantity", "Enter a positive restock quantity.");
    setBusy(product.id);
    try { await restockStaffProduct(token, product.id, { quantity, branch: branches[product.id] || current?.activeBranch || current?.assignedBranch || "" }); setAmounts((value) => ({ ...value, [product.id]: "" })); await load(); }
    catch (restockError) { Alert.alert("Restock failed", restockError.message); } finally { setBusy(""); }
  };
  const createProduct = async () => {
    const stock = Number(createForm.stock || 0);
    if (!createForm.name.trim() || !createForm.sku.trim()) return Alert.alert("Name and SKU required", "Enter a unique product name and SKU.");
    setBusy("create-product");
    try {
      await createStaffProduct(token, {
        name: createForm.name.trim(), sku: createForm.sku.trim(), brand: createForm.brand.trim(), category: createForm.category,
        specs: createForm.specs.trim(), price: Number(createForm.price || 0), threshold: Number(createForm.threshold || 0),
        branchStock: BRANCHES.reduce((result, branch) => ({ ...result, [branch]: branch === createForm.branch ? stock : 0 }), {}),
      });
      setCreateForm({ name: "", sku: "", brand: "", category: "split", specs: "", price: "", threshold: "", branch: "Cavite", stock: "" });
      await load();
    } catch (createError) { Alert.alert("Product could not be created", createError.message); }
    finally { setBusy(""); }
  };
  const saveProduct = async (product) => {
    const id = product.id || product._id;
    const edit = edits[id] || {};
    setBusy(`edit:${id}`);
    try { await updateStaffProduct(token, id, { price: Number(edit.price ?? product.price ?? 0), threshold: Number(edit.threshold ?? product.threshold ?? 0) }); setEdits((value) => ({ ...value, [id]: undefined })); await load(); }
    catch (updateError) { Alert.alert("Product could not be updated", updateError.message); }
    finally { setBusy(""); }
  };
  return <>
  {current?.role === "superadmin" ? <StaffSection title="Add AC Product" subtitle="Create one catalogue item with its initial branch stock" icon="add-circle-sharp" tone="accent">
    <TextField label="Product Name" value={createForm.name} onChangeText={(value) => setCreateForm((form) => ({ ...form, name: value }))} placeholder="e.g. Carrier Aura Split Type" />
    <TextField label="SKU" value={createForm.sku} onChangeText={(value) => setCreateForm((form) => ({ ...form, sku: value }))} placeholder="Unique stock code" autoCapitalize="characters" />
    <TextField label="Brand" value={createForm.brand} onChangeText={(value) => setCreateForm((form) => ({ ...form, brand: value }))} placeholder="Brand" />
    <BottomSheetSelect label="Category" value={createForm.category} items={["split", "window", "floor"].map((name) => ({ name }))} onSelect={(item) => setCreateForm((form) => ({ ...form, category: item.name }))} accentColor={STAFF_ACCENT} />
    <TextField label="Specifications / Horsepower" value={createForm.specs} onChangeText={(value) => setCreateForm((form) => ({ ...form, specs: value }))} placeholder="e.g. 1.5 HP" />
    <View style={{ flexDirection: "row", gap: SPACING.sm }}><View style={{ flex: 1 }}><TextField label="Price" value={createForm.price} onChangeText={(value) => setCreateForm((form) => ({ ...form, price: value.replace(/[^\d.]/g, "") }))} keyboardType="decimal-pad" placeholder="0" /></View><View style={{ flex: 1 }}><TextField label="Low-stock level" value={createForm.threshold} onChangeText={(value) => setCreateForm((form) => ({ ...form, threshold: value.replace(/\D/g, "") }))} keyboardType="number-pad" placeholder="0" /></View></View>
    <BottomSheetSelect label="Initial Stock Branch" value={createForm.branch} items={BRANCHES.map((name) => ({ name }))} onSelect={(item) => setCreateForm((form) => ({ ...form, branch: item.name }))} accentColor={STAFF_ACCENT} />
    <TextField label="Initial Quantity" value={createForm.stock} onChangeText={(value) => setCreateForm((form) => ({ ...form, stock: value.replace(/\D/g, "") }))} keyboardType="number-pad" placeholder="0" />
    <Button title="Create Product" loading={busy === "create-product"} onPress={createProduct} accentColor={STAFF_ACCENT} />
  </StaffSection> : null}
  <StaffSection title="Inventory Management" subtitle={current?.role === "superadmin" ? "All-branch stock and serial-backed inventory" : "Read-only stock for your active branch"} icon="cube-sharp">
    <TextField label="Search inventory" value={query} onChangeText={setQuery} placeholder="Product, SKU, brand, or model" />
    <StaffMessage loading={loading} error={error} empty={!filtered.length} emptyText="No inventory products match." />
    {pageSlice(filtered, page).map((product) => { const id = product.id || product._id; return <StaffDataRow key={id} title={product.name} subtitle={`${product.brand || "Brand not set"} · ${product.specs || product.sku}`} meta={`${peso(product.price)} · Threshold ${product.threshold || 0}`} status={`${Number(product.stock || 0)} available`} statusColor={Number(product.stock || 0) <= Number(product.threshold || 0) ? COLORS.danger : COLORS.success}>
      {current?.role === "superadmin" ? <View>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}><View style={{ flex: 1 }}><TextField label="Price" value={String(edits[id]?.price ?? product.price ?? "")} onChangeText={(value) => setEdits((currentValue) => ({ ...currentValue, [id]: { ...(currentValue[id] || {}), price: value.replace(/[^\d.]/g, "") } }))} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><TextField label="Low-stock level" value={String(edits[id]?.threshold ?? product.threshold ?? "")} onChangeText={(value) => setEdits((currentValue) => ({ ...currentValue, [id]: { ...(currentValue[id] || {}), threshold: value.replace(/\D/g, "") } }))} keyboardType="number-pad" /></View></View>
        <Button title="Save Product Details" size="sm" variant="secondary" loading={busy === `edit:${id}`} onPress={() => saveProduct(product)} accentColor={STAFF_ACCENT} />
        <BottomSheetSelect label="Restock Branch" value={branches[id] || ""} placeholder="Choose branch" items={BRANCHES.map((name) => ({ name }))} onSelect={(item) => setBranches((value) => ({ ...value, [id]: item.name }))} accentColor={STAFF_ACCENT} />
        <TextField label="Quantity to add" value={String(amounts[id] || "")} onChangeText={(value) => setAmounts((currentValue) => ({ ...currentValue, [id]: value.replace(/\D/g, "") }))} keyboardType="number-pad" placeholder="0" />
        <Button title="Add Stock" size="sm" loading={busy === id} onPress={() => restock({ ...product, id })} accentColor={STAFF_ACCENT} />
      </View> : null}
    </StaffDataRow>; })}
    <StaffPager page={page} totalPages={totalPages} onChange={setPage} />
  </StaffSection></>;
}

const SERVICE_TRANSITIONS = {
  Pending: ["Pending", "Reviewed", "Assigned", "In Progress", "Cancelled"],
  Submitted: ["Submitted", "Reviewed", "Assigned", "In Progress", "Cancelled"],
  Reviewed: ["Reviewed", "Assigned", "In Progress", "Cancelled"],
  Assigned: ["Assigned", "In Progress", "Cancelled"],
  "In Progress": ["In Progress", "Completed", "Cancelled"],
  Completed: ["Completed"],
  Cancelled: ["Cancelled"],
};
const TASK_TRANSITIONS = ["pending", "accepted", "on-the-way", "arrived", "installing", "in-progress", "on-hold", "failed", "rescheduled", "completed"];

export function OperationsModule({ token, current, refreshKey }) {
  const [view, setView] = useState("services");
  const [busy, setBusy] = useState("");
  const { data, loading, error, load } = useModuleLoad(async () => {
    const [serviceResult, taskResult] = await Promise.all([fetchOperationalServices(token), fetchOperationalTasks(token)]);
    return { services: serviceResult.requests || [], tasks: taskResult.tasks || [] };
  }, [token, refreshKey]);
  const records = view === "services" ? data?.services || [] : data?.tasks || [];
  const changeStatus = async (record, status) => {
    setBusy(record.id);
    try { view === "services" ? await changeOperationalServiceStatus(token, record.id, status) : await changeOperationalTaskStatus(token, record.id, status); await load(); }
    catch (statusError) { Alert.alert("Status update failed", statusError.message); } finally { setBusy(""); }
  };
  const views = current?.role === "superadmin" ? ["services"] : ["services", "tasks"];
  return <StaffSection title="Service Operations" subtitle={current?.role === "superadmin" ? "Review customer service requests without technician processing controls" : "Customer requests and technician work orders share one workflow"} icon="build-sharp">
    {views.length > 1 ? <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md }}>{views.map((key) => <TouchableOpacity key={key} onPress={() => setView(key)} style={{ flex: 1, minHeight: 44, borderRadius: RADIUS.md, backgroundColor: view === key ? STAFF_ACCENT : COLORS.surfaceAlt, borderWidth: 1, borderColor: view === key ? STAFF_ACCENT : COLORS.border, alignItems: "center", justifyContent: "center" }}><Text style={{ color: view === key ? "#FFF" : COLORS.textSecondary, fontWeight: FONT.black }}>{key === "services" ? "Service Requests" : "Tech Work Orders"}</Text></TouchableOpacity>)}</View> : null}
    <StaffMessage loading={loading} error={error} empty={!records.length} emptyText={`No ${view} records found.`} />
    {records.slice(0, 50).map((record) => { const statusOptions = view === "services" ? (SERVICE_TRANSITIONS[record.status] || [record.status || "Pending"]) : TASK_TRANSITIONS; return <StaffDataRow key={record.id} title={record.taskCode || record.issueType || record.issue || record.title || "Service request"} subtitle={`${record.customerName || record.customer || "Customer"} · ${record.address || "No address"}`} meta={`${record.branch || "No branch"}${record.assignedTechnicianName ? ` · ${record.assignedTechnicianName}` : ""}`} status={record.status} statusColor={taskColor(record.status)}>
      <BottomSheetSelect label="Update Status" value={record.status || ""} placeholder="Choose status" items={statusOptions.map((name) => ({ name }))} getKey={(item) => item.name} getLabel={(item) => item.name} itemIcon="git-commit-sharp" accentColor={STAFF_ACCENT} disabled={busy === record.id || statusOptions.length === 1} onSelect={(item) => changeStatus(record, item.name)} />
    </StaffDataRow>; })}
  </StaffSection>;
}

export function PeopleModule({ token, current, refreshKey }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [created, setCreated] = useState(null);
  const [form, setForm] = useState({ name_first: "", name_last: "", role: "technician", branch: "Cavite", loginName: "", email: "" });
  const { data, loading, error, load } = useModuleLoad(() => fetchStaffUsers(token), [token, refreshKey]);
  const users = (data?.users || []).filter((user) => [displayName(user), user.email, user.alias, user.role, user.assignedBranch].filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  const create = async () => {
    setBusy("create"); setCreated(null);
    try { const result = await createStaffAccount(token, form); setCreated(result); setForm((value) => ({ ...value, name_first: "", name_last: "", loginName: "", email: "" })); await load(); }
    catch (createError) { Alert.alert("Unable to create staff", createError.message); } finally { setBusy(""); }
  };
  return <>
    {current?.role === "superadmin" ? <StaffSection title="Add Staff Account" subtitle="Technicians use branch-based IDs; admins use email" icon="person-add-sharp" tone="accent">
      <TextField label="First Name" value={form.name_first} onChangeText={(value) => setForm((currentValue) => ({ ...currentValue, name_first: value }))} placeholder="First name" />
      <TextField label="Last Name" value={form.name_last} onChangeText={(value) => setForm((currentValue) => ({ ...currentValue, name_last: value }))} placeholder="Last name" />
      <BottomSheetSelect label="Role" value={form.role === "technician" ? "Technician" : "Admin"} items={[{ name: "Technician", key: "technician" }, { name: "Admin", key: "admin" }]} getKey={(item) => item.key} onSelect={(item) => setForm((value) => ({ ...value, role: item.key }))} accentColor={STAFF_ACCENT} />
      <BottomSheetSelect label="Branch" value={form.branch} items={BRANCHES.map((name) => ({ name }))} onSelect={(item) => setForm((value) => ({ ...value, branch: item.name }))} accentColor={STAFF_ACCENT} />
      {form.role === "technician" ? <TextField label="Technician Login Name" value={form.loginName} onChangeText={(value) => setForm((currentValue) => ({ ...currentValue, loginName: value.replace(/[^a-zA-Z0-9._-]/g, "") }))} placeholder="e.g. juan" autoCapitalize="none" /> : <TextField label="Admin Email" value={form.email} onChangeText={(value) => setForm((currentValue) => ({ ...currentValue, email: value.trim().toLowerCase() }))} placeholder="admin@example.com" keyboardType="email-address" autoCapitalize="none" />}
      {form.role === "technician" ? <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>Login preview: tech.{form.branch.toLowerCase()}.{form.loginName.toLowerCase() || "name"} · Default password: {form.branch.toLowerCase()}.{form.loginName.toLowerCase() || "name"}</Text> : null}
      <Button title="Create Staff Account" loading={busy === "create"} disabled={!form.name_first.trim() || !form.name_last.trim() || (form.role === "technician" ? form.loginName.trim().length < 2 : !form.email.includes("@"))} onPress={create} accentColor={STAFF_ACCENT} />
      {created ? <View style={{ backgroundColor: COLORS.successLight, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md }}><Text selectable style={{ color: COLORS.success, fontWeight: FONT.black }}>Account created</Text><Text selectable style={{ color: COLORS.textPrimary, marginTop: 4 }}>Login: {created.loginIdentifier || created.user?.email}</Text>{created.tempPassword ? <Text selectable style={{ color: COLORS.textPrimary, marginTop: 4 }}>Temporary password: {created.tempPassword}</Text> : null}</View> : null}
    </StaffSection> : null}
    <StaffSection title="People Directory" subtitle="Customers, technicians, and operational staff" icon="people-sharp">
      <TextField label="Search people" value={query} onChangeText={setQuery} placeholder="Name, login, email, role, or branch" />
      <StaffMessage loading={loading} error={error} empty={!users.length} emptyText="No users match." />
      {users.slice(0, 80).map((user) => { const status = String(user.status || user.accountStatus || "active").toLowerCase(); return <StaffDataRow key={user.id} title={displayName(user)} subtitle={`${user.role || "user"} · ${user.alias || user.email || "No login shown"}`} meta={user.assignedBranch || user.activeBranch || "No branch"} status={status} statusColor={taskColor(status)}>{["admin", "superadmin"].includes(current?.role) && user.id !== current?.id ? <Button title={status === "active" ? "Deactivate" : "Activate"} size="sm" variant={status === "active" ? "danger" : "secondary"} loading={busy === user.id} accentColor={STAFF_ACCENT} onPress={() => confirmAction({ title: `${status === "active" ? "Deactivate" : "Activate"} account`, message: `${displayName(user)} will ${status === "active" ? "lose" : "regain"} access.`, destructive: status === "active", onConfirm: async () => { setBusy(user.id); try { await changeStaffUserStatus(token, user.id, status === "active" ? "inactive" : "active"); await load(); } catch (statusError) { Alert.alert("Unable to update account", statusError.message); } finally { setBusy(""); } } })} /> : null}</StaffDataRow>; })}
    </StaffSection>
  </>;
}

export function AmpModule({ token, current, refreshKey }) {
  const [unitId, setUnitId] = useState("");
  const [reportType, setReportType] = useState("predictive_maintenance");
  const [report, setReport] = useState(null);
  const [provider, setProvider] = useState("");
  const [generating, setGenerating] = useState(false);
  const { data, loading, error } = useModuleLoad(async () => {
    const requests = [fetchAmpPipeline(token), fetchAmpReportUnits(token)];
    if (["owner", "superadmin"].includes(current?.role)) requests.push(fetchAmpForecast(token));
    const [pipeline, units, forecast] = await Promise.all(requests);
    return { pipeline, units: units.units || [], forecast: forecast || null };
  }, [token, current?.role, refreshKey]);
  const pipeline = data?.pipeline || {};
  const aggregate = pipeline.aggregate || {};
  const forecast = data?.forecast || {};
  const selectedUnit = (data?.units || []).find((unit) => String(unit.unitId || unit.id) === String(unitId));
  const generate = async () => {
    if (!unitId) return Alert.alert("Select an AC unit", "Choose an installed unit before generating the report.");
    setGenerating(true);
    try { const result = await generateStaffAmpReport(token, { unitId, reportType }); setReport(result.report || null); setProvider(result.provider || "system"); }
    catch (reportError) { Alert.alert("AMP report failed", reportError.message); } finally { setGenerating(false); }
  };
  const maintenance = report?.maintenance || {};
  return <>
    <StaffHero eyebrow="AEROPULSE AMP" title="Predictive Maintenance Intelligence" subtitle="History-based planning remains functional without an AI key and gains assisted interpretation when the server key is added." icon="pulse-sharp" />
    <StaffMessage loading={loading} error={error} />
    {!loading && !error ? <>
      <StaffGrid><StaffStat label="Installed units" value={aggregate.installedUnits || data?.units?.length || 0} icon="snow-sharp" /><StaffStat label="Due soon" value={aggregate.dueSoon || pipeline.dueSoon?.length || 0} icon="time-sharp" color={COLORS.warning} /><StaffStat label="Overdue" value={aggregate.overdue || pipeline.overdue?.length || 0} icon="warning-sharp" color={COLORS.danger} />{forecast?.totalForecastedServices !== undefined ? <StaffStat label="12-month services" value={forecast.totalForecastedServices} icon="trending-up-sharp" /> : null}</StaffGrid>
      <StaffSection title="AMP Report Center" subtitle="The OpenAI key stays on the backend and is never bundled into Expo" icon="sparkles-sharp" tone="accent">
        <BottomSheetSelect label="Installed AC Unit" value={selectedUnit ? `${selectedUnit.modelName || selectedUnit.model || "AC Unit"} · ${selectedUnit.serialNumber || selectedUnit.unitId}` : ""} placeholder="Select a unit" items={data?.units || []} getKey={(unit) => String(unit.unitId || unit.id)} getLabel={(unit) => `${unit.modelName || unit.model || "AC Unit"} · ${unit.serialNumber || unit.unitId || unit.id}`} itemIcon="snow-sharp" accentColor={STAFF_ACCENT} onSelect={(unit) => setUnitId(unit.unitId || unit.id)} />
        <BottomSheetSelect label="Report Type" value={reportType.replace(/_/g, " ")} items={[{ name: "Predictive maintenance", key: "predictive_maintenance" }, { name: "Maintenance summary", key: "maintenance_summary" }, ...(["admin", "superadmin", "owner", "manager"].includes(current?.role) ? [{ name: "Inventory reliability analysis", key: "inventory_reliability_analysis" }] : [])]} getKey={(item) => item.key} onSelect={(item) => setReportType(item.key)} accentColor={STAFF_ACCENT} />
        <Button title="Generate AMP Report" loading={generating} onPress={generate} accentColor={STAFF_ACCENT} />
      </StaffSection>
      {report ? <StaffSection title={report.reportLabel || report.title || "AMP Report"} subtitle={`${report.reportId || "Report"} · ${provider === "openai" ? "OpenAI-assisted interpretation" : "System recommendation"}`} icon="document-text-sharp">
        <StaffDataRow title="Best serviced by" subtitle={maintenance.bestServicedBy ? new Date(maintenance.bestServicedBy).toLocaleDateString() : "Not available"} />
        <StaffDataRow title="Recommended service" subtitle={maintenance.recommendedServiceLabel || String(maintenance.recommendedService || "regular cleaning").replace(/_/g, " ")} />
        <StaffDataRow title="Room size vs horsepower" subtitle={maintenance.capacityAssessment?.summary || maintenance.capacityAssessment?.status || "Not assessed"} />
        <Text style={{ color: COLORS.textPrimary, lineHeight: 22 }}>{maintenance.interpretation || maintenance.recommendationBasis || report.note}</Text>
      </StaffSection> : null}
      {!!forecast?.forecast?.length && <StaffSection title="12-Month Forecast" subtitle={`${peso(forecast.totalProjectedRevenue)} projected revenue`} icon="bar-chart-sharp">{forecast.forecast.map((item) => <StaffDataRow key={item.month} title={item.label} subtitle={`${item.serviceVolume} forecasted service(s)`} meta={peso(item.projectedRevenue)} />)}</StaffSection>}
    </> : null}
  </>;
}

export function BranchesModule({ token, refreshKey }) {
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState("");
  const { data, loading, error, load } = useModuleLoad(() => fetchBranchCoverage(token), [token, refreshKey]);
  const branches = data?.branches || [];
  const save = async (branch) => {
    const coverageAreas = String(drafts[branch.name] ?? (branch.coverageAreas || []).join(", ")).split(",").map((value) => value.trim()).filter(Boolean);
    if (!coverageAreas.length) return Alert.alert("Coverage required", "Add at least one city, province, or service area.");
    setBusy(branch.name);
    try { await saveBranchCoverage(token, branch.name, { coverageAreas, nearbyBranches: branch.nearbyBranches || [], active: branch.active !== false }); await load(); }
    catch (saveError) { Alert.alert("Unable to save branch", saveError.message); } finally { setBusy(""); }
  };
  return <StaffSection title="Branch Coverage" subtitle="Address routing and service areas used by checkout" icon="map-sharp">
    <StaffMessage loading={loading} error={error} empty={!branches.length} emptyText="No branch coverage is configured." />
    {branches.map((branch) => <StaffDataRow key={branch.name} title={branch.name} subtitle={`${(branch.coverageAreas || []).length} service area(s)`} status={branch.active === false ? "inactive" : "active"} statusColor={branch.active === false ? COLORS.danger : COLORS.success}>
      <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sm, marginBottom: SPACING.xs }}>Coverage areas (comma-separated)</Text>
      <TextInput multiline value={drafts[branch.name] ?? (branch.coverageAreas || []).join(", ")} onChangeText={(value) => setDrafts((current) => ({ ...current, [branch.name]: value }))} style={{ minHeight: 80, textAlignVertical: "top", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderInput, borderRadius: RADIUS.md, padding: SPACING.sm + 4, color: COLORS.textPrimary }} />
      <Button title="Save Coverage" size="sm" loading={busy === branch.name} onPress={() => save(branch)} accentColor={STAFF_ACCENT} />
    </StaffDataRow>)}
  </StaffSection>;
}

const REVIEW_VIEWS = [
  { key: "warranty", label: "Warranty" },
  { key: "parts", label: "Parts" },
  { key: "reorders", label: "Reorders" },
];

export function ReviewsModule({ token, current, refreshKey }) {
  const [view, setView] = useState("warranty");
  const [busy, setBusy] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const { data, loading, error, load } = useModuleLoad(async () => {
    const [warranty, parts, reorders, products] = await Promise.all([
      fetchWarrantyClaims(token),
      fetchPartsRequests(token),
      fetchReorderRequests(token),
      fetchStaffProducts(token),
    ]);
    return {
      warranty: warranty.claims || [],
      parts: parts.requests || [],
      reorders: reorders.reorders || [],
      products: products.products || [],
    };
  }, [token, refreshKey]);
  const records = data?.[view] || [];
  const selectedProduct = (data?.products || []).find((product) => String(product.id || product._id) === String(productId));

  const run = async (key, request) => {
    setBusy(key);
    try { await request(); await load(); }
    catch (actionError) { Alert.alert("Review could not be saved", actionError.message); }
    finally { setBusy(""); }
  };

  const submitReorder = async () => {
    const requestedQuantity = Number(quantity);
    if (!productId || !Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      return Alert.alert("Product and quantity required", "Select a product and enter a whole quantity greater than zero.");
    }
    await run("create-reorder", async () => {
      await createReorderRequest(token, { productId, quantity: requestedQuantity, notes });
      setProductId(""); setQuantity(""); setNotes("");
    });
  };

  return <>
    {current?.role === "admin" && view === "reorders" ? <StaffSection title="Request Inventory Reorder" subtitle="Submit a branch-scoped stock request for SuperAdmin review" icon="add-circle-sharp" tone="accent">
      <BottomSheetSelect label="Product" value={selectedProduct?.name || ""} placeholder="Select inventory product" items={data?.products || []} getKey={(product) => String(product.id || product._id)} getLabel={(product) => `${product.name} · ${Number(product.stock || 0)} available`} itemIcon="cube-sharp" accentColor={STAFF_ACCENT} onSelect={(product) => setProductId(product.id || product._id)} />
      <TextField label="Requested quantity" value={quantity} onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="0" />
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Reason for this reorder" />
      <Button title="Submit Reorder Request" loading={busy === "create-reorder"} onPress={submitReorder} accentColor={STAFF_ACCENT} />
    </StaffSection> : null}
    <StaffSection title="Review Center" subtitle="Warranty, technician parts, and inventory approvals in one queue" icon="file-tray-full-sharp">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.md }}>{REVIEW_VIEWS.map((item) => <TouchableOpacity key={item.key} onPress={() => setView(item.key)} style={{ flexGrow: 1, minHeight: 42, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, backgroundColor: view === item.key ? STAFF_ACCENT : COLORS.surfaceAlt, borderWidth: 1, borderColor: view === item.key ? STAFF_ACCENT : COLORS.border, alignItems: "center", justifyContent: "center" }}><Text style={{ color: view === item.key ? "#FFF" : COLORS.textSecondary, fontWeight: FONT.black }}>{item.label}</Text></TouchableOpacity>)}</View>
      <StaffMessage loading={loading} error={error} empty={!records.length} emptyText={`No ${view} records require attention.`} />
      {view === "warranty" ? records.map((claim) => { const key = `${claim.unitId}:${claim.claimId}`; return <StaffDataRow key={key} title={claim.claimId || "Warranty claim"} subtitle={`${claim.customerName || "Customer"} · ${claim.unitName || claim.serialNumber || "AC Unit"}`} meta={`${claim.branch || "No branch"} · ${claim.issue || "No issue description"}`} status={String(claim.status || "submitted").replace(/_/g, " ")} statusColor={taskColor(claim.status)}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>{["under_review", "approved", "rejected"].map((status) => <Button key={status} title={status.replace(/_/g, " ")} size="sm" variant={status === "rejected" ? "danger" : status === "approved" ? "secondary" : "outline"} loading={busy === `${key}:${status}`} onPress={() => run(`${key}:${status}`, () => reviewWarrantyClaim(token, claim.unitId, claim.claimId, { status }))} accentColor={STAFF_ACCENT} style={{ flexGrow: 1 }} />)}</View>
      </StaffDataRow>; }) : null}
      {view === "parts" ? records.map((request) => { const id = request.id || request._id; return <StaffDataRow key={id} title={`${request.quantity || 1}× ${request.partName || "Requested part"}`} subtitle={`${request.technicianName || "Technician"} · ${request.branch || "No branch"}`} meta={`${request.priority || "Normal"} · ${request.reason || "No reason"}`} status={request.status || "Submitted"} statusColor={taskColor(request.status)}>
        <BottomSheetSelect label="Update Request" value={request.status || "Submitted"} items={["Submitted", "Reviewed", "Assigned", "Completed", "Cancelled"].map((name) => ({ name }))} getKey={(item) => item.name} getLabel={(item) => item.name} accentColor={STAFF_ACCENT} disabled={busy === id} onSelect={(item) => run(id, () => updatePartsRequest(token, id, { status: item.name }))} />
      </StaffDataRow>; }) : null}
      {view === "reorders" ? records.map((request) => { const id = request.id || request._id; const pending = request.status === "submitted"; return <StaffDataRow key={id} title={request.product?.name || "Inventory reorder"} subtitle={`${request.quantity || 0} unit(s) · ${request.branch || "No branch"}`} meta={request.notes || "No notes"} status={request.status || "submitted"} statusColor={taskColor(request.status)}>
        {current?.role === "superadmin" && pending ? <View style={{ flexDirection: "row", gap: SPACING.sm }}><Button title="Approve & Add Stock" size="sm" variant="secondary" loading={busy === `${id}:approved`} onPress={() => run(`${id}:approved`, () => reviewReorderRequest(token, id, { status: "approved" }))} accentColor={STAFF_ACCENT} style={{ flex: 1 }} /><Button title="Reject" size="sm" variant="danger" loading={busy === `${id}:rejected`} onPress={() => run(`${id}:rejected`, () => reviewReorderRequest(token, id, { status: "rejected" }))} style={{ flex: 1 }} /></View> : null}
      </StaffDataRow>; }) : null}
    </StaffSection>
  </>;
}

export function ReportsModule({ token, refreshKey }) {
  const [page, setPage] = useState(1);
  const { data, loading, error, load } = useModuleLoad(async () => {
    const [sales, audit] = await Promise.all([fetchSalesReport(token), fetchStaffAuditLogs(token)]);
    return { sales, audit };
  }, [token, refreshKey]);
  const series = data?.sales?.series || [];
  const products = data?.sales?.topProducts || [];
  const logs = data?.audit?.logs || [];
  const revenue = series.reduce((total, item) => total + Number(item.revenue || 0), 0);
  const units = series.reduce((total, item) => total + Number(item.unitsSold || 0), 0);
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  return <>
    <StaffHero eyebrow="REPORTING" title="Sales and Audit Reports" subtitle="The same live business records are used on web and mobile" icon="analytics-sharp" />
    <StaffMessage loading={loading} error={error} />
    {!loading && !error ? <>
      <StaffGrid><StaffStat label="30-day revenue" value={peso(revenue)} icon="cash-sharp" color={COLORS.success} /><StaffStat label="Units sold" value={units} icon="cube-sharp" /><StaffStat label="Audit events" value={data?.audit?.total ?? logs.length} icon="shield-checkmark-sharp" /></StaffGrid>
      <StaffSection title="Top Products" subtitle={`Paid sales · ${data?.sales?.branch || "all"} branch scope`} icon="podium-sharp">{products.length ? products.map((product) => <StaffDataRow key={product.productId || product.name} title={product.name || "AC Unit"} subtitle={`${product.unitsSold || 0} unit(s) sold`} meta={peso(product.revenue)} />) : <StaffMessage empty emptyText="No paid sales were recorded in this period." />}</StaffSection>
      <StaffSection title="Audit Trail" subtitle="Recent account and operational changes" icon="document-lock-sharp">{pageSlice(logs, page).map((log) => <StaffDataRow key={log.id} title={String(log.action || "Activity").replace(/_/g, " ")} subtitle={log.description || `${log.entityType || "Record"} updated`} meta={`${log.user || "Unknown user"} · ${log.branch || "Global"}`} status={log.timestamp ? new Date(log.timestamp).toLocaleDateString() : ""} />)}<StaffPager page={page} totalPages={totalPages} onChange={setPage} /></StaffSection>
    </> : null}
    {!!error && <Button title="Try Again" onPress={load} accentColor={STAFF_ACCENT} />}
  </>;
}

export function AccountModule({ current, onLogout, loggingOut }) {
  return <>
    <StaffHero eyebrow="ACCOUNT" title={displayName(current)} subtitle={`${String(current?.role || "staff").replace(/_/g, " ")} · ${current?.activeBranch || current?.assignedBranch || "All branches"}`} icon="person-circle-sharp" />
    <StaffSection title="Signed-in Account" subtitle="This session is shared by Expo web, Android, and iOS" icon="shield-checkmark-sharp">
      <StaffDataRow title="Login" subtitle={current?.alias || current?.email || "Not shown"} />
      <StaffDataRow title="Role" subtitle={String(current?.role || "staff").replace(/_/g, " ")} />
      <StaffDataRow title="Branch" subtitle={current?.activeBranch || current?.assignedBranch || "Global access"} />
      <Button title="Log Out" variant="danger" loading={loggingOut} onPress={onLogout} />
    </StaffSection>
  </>;
}
