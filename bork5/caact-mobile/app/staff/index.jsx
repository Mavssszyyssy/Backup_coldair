import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import {
  AccountModule,
  AmpModule,
  BranchesModule,
  DashboardModule,
  InventoryModule,
  OperationsModule,
  OrdersModule,
  PeopleModule,
  ReportsModule,
  ReviewsModule,
} from "../../components/staff/StaffModules";
import { StaffShell } from "../../components/staff/StaffKit";
import { useUserContext } from "../../context/UserContext";
import { confirmAction } from "../../utils/confirmAction";

const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard", icon: "grid-sharp", roles: ["admin", "superadmin"] },
  { key: "orders", label: "Orders", icon: "cart-sharp", roles: ["admin", "superadmin"] },
  { key: "inventory", label: "Inventory", icon: "cube-sharp", roles: ["admin", "superadmin"] },
  { key: "operations", label: "Service", icon: "build-sharp", roles: ["admin", "superadmin"] },
  { key: "people", label: "People", icon: "people-sharp", roles: ["admin", "superadmin"] },
  { key: "reviews", label: "Reviews", icon: "file-tray-full-sharp", roles: ["admin", "superadmin"] },
  { key: "reports", label: "Reports", icon: "analytics-sharp", roles: ["admin", "superadmin"] },
  { key: "branches", label: "Branches", icon: "map-sharp", roles: ["superadmin"] },
  { key: "amp", label: "AMP AI", icon: "pulse-sharp", roles: ["manager", "owner", "admin", "superadmin"] },
  { key: "account", label: "Account", icon: "person-circle-sharp", roles: ["manager", "owner", "admin", "superadmin"] },
];

const TITLES = {
  dashboard: ["Operations Dashboard", "Sales, people, and workload in one shared view"],
  orders: ["Customer Orders", "Process payments, dispatch, installation, and completion"],
  inventory: ["Inventory", "Current AC product stock across authorized branches"],
  operations: ["Service Operations", "Customer service requests and technician work orders"],
  people: ["People", "Manage customer and staff account access"],
  reviews: ["Review Center", "Warranty, parts requests, and inventory reorder decisions"],
  reports: ["Reports", "Sales performance and the operational audit trail"],
  branches: ["Branch Management", "Service coverage used for checkout and fulfillment routing"],
  amp: ["AeroPulse AMP", "Predictive maintenance, reports, and service forecasts"],
  account: ["My Account", "Session and role information"],
};

export default function StaffWorkspaceScreen() {
  const router = useRouter();
  const { current, token, logout } = useUserContext();
  const role = String(current?.role || "").toLowerCase();
  const modules = useMemo(() => ALL_MODULES.filter((module) => module.roles.includes(role)), [role]);
  const [activeModule, setActiveModule] = useState(modules[0]?.key || "account");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const title = TITLES[activeModule] || TITLES.account;

  const handleLogout = () => confirmAction({
    title: "Log out",
    message: "End this staff session on this device?",
    confirmText: "Log Out",
    destructive: true,
    onConfirm: async () => {
      setLoggingOut(true);
      await logout();
      router.replace("/sign-in");
    },
  });

  const common = { token, current, refreshKey };
  return (
    <StaffShell
      title={title[0]}
      subtitle={title[1]}
      modules={modules}
      activeModule={activeModule}
      onModuleChange={setActiveModule}
      onRefresh={activeModule === "account" ? null : () => setRefreshKey((value) => value + 1)}
    >
      {activeModule === "dashboard" ? <DashboardModule {...common} /> : null}
      {activeModule === "orders" ? <OrdersModule {...common} /> : null}
      {activeModule === "inventory" ? <InventoryModule {...common} /> : null}
      {activeModule === "operations" ? <OperationsModule {...common} /> : null}
      {activeModule === "people" ? <PeopleModule {...common} /> : null}
      {activeModule === "reviews" ? <ReviewsModule {...common} /> : null}
      {activeModule === "reports" ? <ReportsModule {...common} /> : null}
      {activeModule === "branches" ? <BranchesModule {...common} /> : null}
      {activeModule === "amp" ? <AmpModule {...common} /> : null}
      {activeModule === "account" ? <AccountModule current={current} onLogout={handleLogout} loggingOut={loggingOut} /> : null}
    </StaffShell>
  );
}
