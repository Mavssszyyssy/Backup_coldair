import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";
import "./App.css";
import AdminAuditLogs from "./components/ADMIN/AuditLogs/AdminAuditLogs";
import AdminDashboard from "./components/ADMIN/Dashboard/AdminDashboard";
import AdminInventory from "./components/ADMIN/Inventory/AdminInventory";
import AdminMaintenance from "./components/ADMIN/Maintenance/AdminMaintenance";
import AdminOrders from "./components/ADMIN/Orders/AdminOrders";
import AdminProfile from "./components/ADMIN/Profile/AdminProfile";
import AdminReoder from "./components/ADMIN/Reorder/AdminReoder";
import AdminReports from "./components/ADMIN/Reports/AdminReports";
import AdminSerialQr from "./components/ADMIN/SerialQr/AdminSerialQr";
import AdminSettings from "./components/ADMIN/Settings/AdminSettings";
import AdminStoreOperations from "./components/ADMIN/Store/AdminStoreOperations";
import AdminTechnician from "./components/ADMIN/Technicians/AdminTechnician";
import AdminUnlockUsers from "./components/ADMIN/Users/AdminUnlockUsers";
import ManagerAmpDashboard from "./components/AMP/ManagerAmpDashboard";
import OwnerAmpDashboard from "./components/AMP/OwnerAmpDashboard";
import TechMainScreen from "./components/TECH/Dashboard/TechMainScreen";
import ProfileTechnicianScreen from "./components/TECH/Profile/ProfileTechnicianScreen";
import TechEditProfile from "./components/TECH/Profile/TechEditProfile";
import FieldServiceRegistration from "./components/TECH/Tasks/FieldServiceRegistration";
import TaskDetails from "./components/TECH/Tasks/TaskDetails";
import TaskScreens from "./components/TECH/Tasks/TaskScreens";
import SuperAdminAlerts from "./components/SUPERADMIN/Dashboard/SuperAdminAlerts";
import SuperAdminBranches from "./components/SUPERADMIN/Dashboard/SuperAdminBranches";
import SuperAdminDashboard from "./components/SUPERADMIN/Dashboard/SuperAdminDashboard";
import SuperAdminInventory from "./components/SUPERADMIN/Dashboard/SuperAdminInventory";
import SuperAdminSales from "./components/SUPERADMIN/Dashboard/SuperAdminSales";
import SuperAdminTasks from "./components/SUPERADMIN/Dashboard/SuperAdminTasks";
import CustomerChatbot from "./components/chatbot/CustomerChatbot";
import Checkout from "./components/checkout/Checkout";
import OrderConfirmation from "./components/checkout/OrderConfirmation";
import GlobalDialog from "./components/common/GlobalDialog";
import LoginPromptModal from "./components/common/LoginPromptModal";
import Contact from "./components/contact/Contact";
import FaqPage from "./components/faq/FaqPage";
import Home from "./components/home/Home";
import Login from "./components/login/Login";
import MyUnit from "./components/myunit/MyUnit";
import MyOrders from "./components/orders/MyOrders";
import ProfileCenter from "./components/profile/ProfileCenter";
import ReceiptView from "./components/receipt/ReceiptView";
import ForgotPassword from "./components/recover/ForgotPassword";
import ResetPassword from "./components/recover/ResetPassword";
import Register from "./components/register/Register";
import Services from "./components/services/Services";
import Settings from "./components/settings/Settings";
import Shop from "./components/shop/Shop";
import { AdminSettingsProvider } from "./context/AdminSettingsContext";
import { CartProvider } from "./context/CartContext";
import { UserProvider, useUser } from "./context/UserContext";

const getRoleHomePath = (role) => {
  switch (role) {
    case "technician":
      return "/tech/dashboard";
    case "manager":
      return "/manager/amp";
    case "owner":
      return "/owner/amp";
    case "admin":
      return "/admin/dashboard";
    case "superadmin":
      return "/superadmin/dashboard";
    default:
      return "/home";
  }
};

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
};

const RoleRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, loading, userRole } = useUser();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return allowedRoles.includes(userRole) ? (
    children
  ) : (
    <Navigate to="/home" replace />
  );
};

// Public Route wrapper (redirects to home if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, userRole } = useUser();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return !isAuthenticated ? (
    children
  ) : (
    <Navigate to={getRoleHomePath(userRole)} replace />
  );
};

// Home Route - Accessible to both authenticated and unauthenticated users
const HomeRoute = ({ children }) => {
  const { loading } = useUser();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return children;
};

// Main App content with routes
function AppContent() {
  const {
    isAuthenticated,
    loading,
    userRole,
    showLoginPrompt,
    loginPromptMessage,
    hideAuthRequiredPrompt,
  } = useUser();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  const hiddenChatbotRoutes = ["/login", "/register", "/forgot-password"];
  const isResetPasswordRoute = location.pathname.startsWith("/reset-password/");
  const shouldShowCustomerChatbot =
    isAuthenticated &&
    userRole === "customer" &&
    !hiddenChatbotRoutes.includes(location.pathname) &&
    !isResetPasswordRoute;

  return (
    <>
      <Routes>
        {/* Root path redirects to home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        {/* Home route - accessible to both authenticated and unauthenticated users */}
        <Route
          path="/home"
          element={
            <HomeRoute>
              <Home />
            </HomeRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/myunit"
          element={
            <ProtectedRoute>
              <MyUnit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shop"
          element={
            <HomeRoute>
              <Shop />
            </HomeRoute>
          }
        />
        <Route
          path="/contact"
          element={
            <ProtectedRoute>
              <Contact />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <Services />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-confirmation/:orderId"
          element={
            <ProtectedRoute>
              <OrderConfirmation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-orders"
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          }
        />{" "}
        <Route
          path="/receipt/:orderId"
          element={
            <ProtectedRoute>
              <ReceiptView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faq"
          element={
            <ProtectedRoute>
              <FaqPage />
            </ProtectedRoute>
          }
        />
        {/* Role-based dashboards */}
        <Route
          path="/admin/dashboard"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminInventory />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/maintenance"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminMaintenance />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/technicians"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminTechnician />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/reorder"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminReoder />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminReports />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/serial-qrs"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminSerialQr />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminSettings />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminAuditLogs />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminProfile />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/unlock-users"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminUnlockUsers />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminOrders />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/store"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminStoreOperations />
            </RoleRoute>
          }
        />
        <Route
          path="/tech/dashboard"
          element={
            <RoleRoute allowedRoles={["technician"]}>
              <TechMainScreen />
            </RoleRoute>
          }
        />
        <Route
          path="/tech/tasks"
          element={
            <RoleRoute allowedRoles={["technician"]}>
              <TaskScreens />
            </RoleRoute>
          }
        />
        <Route
          path="/tech/tasks/:taskId"
          element={
            <RoleRoute allowedRoles={["technician"]}>
              <TaskDetails />
            </RoleRoute>
          }
        />
        <Route
          path="/tech/field-registration"
          element={
            <RoleRoute allowedRoles={["technician"]}>
              <FieldServiceRegistration />
            </RoleRoute>
          }
        />
        <Route
          path="/tech/profile"
          element={
            <RoleRoute allowedRoles={["technician"]}>
              <ProfileTechnicianScreen />
            </RoleRoute>
          }
        />
        <Route
          path="/tech/profile/edit"
          element={
            <RoleRoute allowedRoles={["technician"]}>
              <TechEditProfile />
            </RoleRoute>
          }
        />
        <Route
          path="/manager/amp"
          element={
            <RoleRoute allowedRoles={["manager", "owner", "admin", "superadmin"]}>
              <ManagerAmpDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/owner/amp"
          element={
            <RoleRoute allowedRoles={["owner", "superadmin"]}>
              <OwnerAmpDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/dashboard"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <SuperAdminDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/branches"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <SuperAdminBranches />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/sales"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <SuperAdminSales />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/inventory"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <SuperAdminInventory />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/tasks"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <SuperAdminTasks />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/alerts"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <SuperAdminAlerts />
            </RoleRoute>
          }
        />
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      {shouldShowCustomerChatbot && <CustomerChatbot />}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={hideAuthRequiredPrompt}
        message={loginPromptMessage}
      />
    </>
  );
}

// Main App component with providers
function App() {
  return (
    <UserProvider>
      <AdminSettingsProvider>
        <CartProvider>
          <Router>
            <div className="App">
              <AppContent />
              <GlobalDialog />
            </div>
          </Router>
        </CartProvider>
      </AdminSettingsProvider>
    </UserProvider>
  );
}

export default App;
