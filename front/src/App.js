import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import "./App.css";
const AdminDashboard = lazy(() => import("./components/ADMIN/Dashboard/AdminDashboard"));
const AdminInventory = lazy(() => import("./components/ADMIN/Inventory/AdminInventory"));
const AdminProfile = lazy(() => import("./components/ADMIN/Profile/AdminProfile"));
const AdminReports = lazy(() => import("./components/ADMIN/Reports/AdminReports"));
const AdminServices = lazy(() => import("./components/ADMIN/Services/AdminServices"));
const AdminSettings = lazy(() => import("./components/ADMIN/Settings/AdminSettings"));
const ManagerAmpDashboard = lazy(() => import("./components/AMP/ManagerAmpDashboard"));
const OwnerAmpDashboard = lazy(() => import("./components/AMP/OwnerAmpDashboard"));
const TechMainScreen = lazy(() => import("./components/TECH/Dashboard/TechMainScreen"));
const ProfileTechnicianScreen = lazy(() => import("./components/TECH/Profile/ProfileTechnicianScreen"));
const TechEditProfile = lazy(() => import("./components/TECH/Profile/TechEditProfile"));
const FieldServiceRegistration = lazy(() => import("./components/TECH/Tasks/FieldServiceRegistration"));
const TaskDetails = lazy(() => import("./components/TECH/Tasks/TaskDetails"));
const TaskScreens = lazy(() => import("./components/TECH/Tasks/TaskScreens"));
const SuperAdminAlerts = lazy(() => import("./components/SUPERADMIN/Dashboard/SuperAdminAlerts"));
const SuperAdminBranches = lazy(() => import("./components/SUPERADMIN/Dashboard/SuperAdminBranches"));
const SuperAdminDashboard = lazy(() => import("./components/SUPERADMIN/Dashboard/SuperAdminDashboard"));
const SuperAdminInventory = lazy(() => import("./components/SUPERADMIN/Dashboard/SuperAdminInventory"));
const SuperAdminSales = lazy(() => import("./components/SUPERADMIN/Dashboard/SuperAdminSales"));
const SuperAdminServices = lazy(() => import("./components/SUPERADMIN/Dashboard/SuperAdminServices"));
const SuperAdminSettings = lazy(() => import("./components/SUPERADMIN/Dashboard/SuperAdminSettings"));
const SuperAdminProfile = lazy(() => import("./components/SUPERADMIN/Dashboard/SuperAdminProfile"));
import CustomerChatbot from "./components/chatbot/CustomerChatbot";
import Checkout from "./components/checkout/Checkout";
import OrderConfirmation from "./components/checkout/OrderConfirmation";
import GlobalDialog from "./components/common/GlobalDialog";
import BackendConnectionBanner from "./components/common/BackendConnectionBanner";
import LoadingLogo from "./components/common/LoadingLogo";
import LoginPromptModal from "./components/common/LoginPromptModal";
import Contact from "./components/contact/Contact";
import FaqPage from "./components/faq/FaqPage";
import Home from "./components/home/Home";
import Login from "./components/login/Login";
import MyUnit from "./components/myunit/MyUnit";
import MyOrders from "./components/orders/MyOrders";
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
      return "/shop";
  }
};

const RoleRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, loading, userRole } = useUser();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen"><LoadingLogo /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return allowedRoles.includes(userRole) ? (
    children
  ) : (
    <Navigate to={getRoleHomePath(userRole)} replace />
  );
};

// Public Route wrapper redirects signed-in customers to the catalogue.
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, userRole } = useUser();

  if (loading) {
    return <div className="loading-screen"><LoadingLogo /></div>;
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
    return <div className="loading-screen"><LoadingLogo /></div>;
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
    return <div className="loading-screen"><LoadingLogo /></div>;
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
      <Suspense fallback={<div className="loading-screen"><LoadingLogo /></div>}>
      <Routes>
        {/* Shopping is the primary customer entry point. */}
        <Route path="/" element={<Navigate to="/shop" replace />} />
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
            <RoleRoute allowedRoles={["customer"]}>
              <Navigate to="/settings?tab=profile" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleRoute allowedRoles={["customer"]}>
              <Settings />
            </RoleRoute>
          }
        />
        <Route
          path="/myunit"
          element={
            <RoleRoute allowedRoles={["customer"]}>
              <MyUnit />
            </RoleRoute>
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
            <RoleRoute allowedRoles={["customer"]}>
              <Contact />
            </RoleRoute>
          }
        />
        <Route
          path="/services"
          element={
            <RoleRoute allowedRoles={["customer"]}>
              <Services />
            </RoleRoute>
          }
        />
        <Route path="/get-the-app" element={<Navigate to="/services" replace />} />
        <Route
          path="/checkout"
          element={
            <RoleRoute allowedRoles={["customer"]}>
              <Checkout />
            </RoleRoute>
          }
        />
        <Route
          path="/order-confirmation/:orderId"
          element={
            <RoleRoute allowedRoles={["customer"]}>
              <OrderConfirmation />
            </RoleRoute>
          }
        />
        <Route
          path="/my-orders"
          element={
            <RoleRoute allowedRoles={["customer"]}>
              <MyOrders />
            </RoleRoute>
          }
        />{" "}
        <Route
          path="/receipt/:orderId"
          element={
            <RoleRoute allowedRoles={["customer"]}>
              <ReceiptView />
            </RoleRoute>
          }
        />
        <Route
          path="/faq"
          element={
            <HomeRoute>
              <FaqPage />
            </HomeRoute>
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
          path="/admin/services"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminServices />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/reorder"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Navigate to="/admin/inventory?tab=reorder" replace />
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
              <Navigate to="/admin/inventory?tab=serial-qr" replace />
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
          path="/admin/profile"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminProfile />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/services/orders"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Navigate to="/admin/services" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/services/technicians"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Navigate to="/admin/services?tab=technicians" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/store"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Navigate to="/admin/inventory" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/technicians"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Navigate to="/admin/services?tab=technicians" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Navigate to="/admin/services" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/maintenance"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Navigate to="/admin/services?tab=service-requests" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/service-requests"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Navigate to="/admin/services?tab=service-requests" replace />
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
          path="/admin/services/service-requests"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Navigate to="/admin/services?tab=service-requests" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/reorders"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <Navigate to="/superadmin/inventory?tab=reorders" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/services"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <SuperAdminServices />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/orders"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <Navigate to="/superadmin/services?tab=orders" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/maintenance"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <Navigate to="/superadmin/services?tab=service-requests" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/technicians"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <Navigate to="/superadmin/services?tab=technicians" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/serial-qrs"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <Navigate to="/superadmin/inventory?tab=serial-qr" replace />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/reports"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <AdminReports />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/settings"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <SuperAdminSettings />
            </RoleRoute>
          }
        />
        <Route
          path="/superadmin/profile"
          element={
            <RoleRoute allowedRoles={["superadmin"]}>
              <SuperAdminProfile />
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
        {/* Catch all - redirect to the customer catalogue */}
        <Route path="*" element={<Navigate to="/shop" replace />} />
      </Routes>
      </Suspense>
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
              <BackendConnectionBanner />
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
