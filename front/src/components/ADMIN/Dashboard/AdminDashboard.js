import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../../config/api";
import { useUser } from "../../../context/UserContext";
import AdminLayout from "../Common/AdminLayout";
import Charts from "./Charts";
import CustomerAcquisitionChart from "./CustomerAcquisitionChart";
import SalesAnalyticsChart from "./SalesAnalyticsChart";
import "./styles.css";
import TechnicianKPIs from "./TechnicianKPIs";
import TopProductsChart from "./TopProductsChart";
import icons from "../../common/icons";

const AdminDashboard = () => {
  const { user } = useUser();
  const activeBranch =
    localStorage.getItem("activeBranch") || user?.activeBranch || "";
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [selectedSalesPeriod, setSelectedSalesPeriod] = useState("monthly");
  const [report, setReport] = useState({ topProducts: [], monthlySeries: [] });

  useEffect(() => {
    const load = async () => {
      setStatsError("");
      try {
        const result = await apiRequest("/dashboard/me");
        setStats(result.stats || null);
        setAnalytics(result.analytics || null);
      } catch (e) {
        setStatsError(e.message);
      }
    };
    load();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadReport = async () => {
      try {
        const now = new Date();
        const fromTop = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const top = await apiRequest(
          `/reports/sales?interval=weekly&from=${encodeURIComponent(fromTop.toISOString())}&to=${encodeURIComponent(now.toISOString())}&topN=5`,
        );

        const fromMonthly = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        const monthly = await apiRequest(
          `/reports/sales?interval=monthly&from=${encodeURIComponent(fromMonthly.toISOString())}&to=${encodeURIComponent(now.toISOString())}&topN=5`,
        );

        if (!mounted) return;
        setReport({
          topProducts: Array.isArray(top.topProducts) ? top.topProducts : [],
          monthlySeries: Array.isArray(monthly.series) ? monthly.series : [],
        });
      } catch (_e) {
        if (!mounted) return;
        setReport({ topProducts: [], monthlySeries: [] });
      }
    };

    loadReport();
    const pollId = window.setInterval(loadReport, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadReport();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted = false;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const recentActivities = [
    {
      id: 1,
      text: "New order #1234 completed",
      time: "2 hours ago",
      icon: icons.cartShoppingFast,
    },
    {
      id: 2,
      text: "Technician John finished maintenance",
      time: "5 hours ago",
      icon: icons.tools,
    },
    {
      id: 3,
      text: "Inventory updated: Brake pads",
      time: "1 day ago",
      icon: icons.boxOpen,
    },
    {
      id: 4,
      text: "Service request #567 approved",
      time: "2 days ago",
      icon: icons.checkCircle,
    },
  ];

  const oversightItems = [
    {
      title: "Policy Review",
      description: "Review technician SLAs and completion rates weekly.",
    },
    {
      title: "Finance Validation",
      description:
        "Validate sales and refund reports before end-of-day closeout.",
    },
    {
      title: "Inventory Priority",
      description:
        "Prioritize reorders for critical spare parts below threshold.",
    },
  ];

  const quickActions = [
    {
      label: "Manage Inventory",
      action: () => navigate("/admin/inventory"),
      icon: icons.boxOpen,
    },
    {
      label: "View Profile",
      action: () => navigate("/admin/profile"),
      icon: icons.memberList,
    },
    {
      label: "Manage Technicians",
      action: () => navigate("/admin/technicians"),
      icon: icons.memberList,
    },
    {
      label: "Process Orders",
      action: () => navigate("/admin/orders"),
      icon: icons.clipboardList,
    },
    {
      label: "Reorder Stock",
      action: () => navigate("/admin/reorder"),
      icon: icons.cartShoppingFast,
    },
    {
      label: "Service Requests",
      action: () => navigate("/admin/maintenance"),
      icon: icons.tools,
    },
    {
      label: "Store Operations",
      action: () => navigate("/admin/store"),
      icon: icons.houseChimney,
    },
  ];

  const weeklySalesData = [42, 38, 55, 68, 72, 85, 78];

  const getSalesPeriodData = () => {
    if (!analytics?.sales) return [];
    return analytics.sales[selectedSalesPeriod] || [];
  };

  const monthComparison = (() => {
    const series = report.monthlySeries || [];
    if (series.length === 0) return null;
    const sorted = [...series].sort(
      (a, b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime(),
    );
    const current = sorted[sorted.length - 1];
    const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
    const currentUnits = Number(current?.unitsSold || 0);
    const prevUnits = Number(previous?.unitsSold || 0);
    const deltaUnits = currentUnits - prevUnits;
    const currentRevenue = Number(current?.revenue || 0);
    const prevRevenue = Number(previous?.revenue || 0);
    const deltaRevenue = currentRevenue - prevRevenue;
    return {
      currentUnits,
      prevUnits,
      deltaUnits,
      currentRevenue,
      prevRevenue,
      deltaRevenue,
    };
  })();

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle={`Monitor sales, inventory, technicians, and requests${activeBranch ? ` for ${activeBranch}` : ""}`}
    >
      <div className="admin-dashboard">
        <div className="welcome-section">
          <h2>Welcome back, {user?.name || "Admin"}</h2>
          <p>
            Monitor sales, inventory, technician activity, and service requests
            from one place.
          </p>
        </div>

        <div className="stats-grid">
          {statsError ? <p style={{ color: "#b91c1c" }}>{statsError}</p> : null}
          <div className="stat-card">
            <div className="stat-icon">
              <img
                src={icons.cartShoppingFast}
                alt=""
                className="inline-icon inline-icon--xl"
              />
            </div>
            <div className="stat-info">
              <h3>Total Sales</h3>
              <p>
                {"₱"}
                {Number(stats?.totalSales || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <img
                src={icons.clipboardList}
                alt=""
                className="inline-icon inline-icon--xl"
              />
            </div>
            <div className="stat-info">
              <h3>Total Orders</h3>
              <p>{stats?.totalOrders || 0}</p>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">
              <img
                src={icons.diamondExclamation}
                alt=""
                className="inline-icon inline-icon--xl"
              />
            </div>
            <div className="stat-info">
              <h3>Low Stock Items</h3>
              <p>{stats?.lowStockItems || 0}</p>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">
              <img
                src={icons.tools}
                alt=""
                className="inline-icon inline-icon--xl"
              />
            </div>
            <div className="stat-info">
              <h3>Active Technicians</h3>
              <p>{stats?.activeTechnicians || 0}</p>
            </div>
          </div>
        </div>

        <div className="chart-section">
          <Charts sales={weeklySalesData} />
        </div>

        {/* Sales Analytics Section */}
        {analytics?.sales && (
          <div className="analytics-section">
            <div className="section-card">
              <div className="section-header">
                <h3>Sales Analytics</h3>
                <div className="period-tabs">
                  <button
                    className={`period-tab ${selectedSalesPeriod === "daily" ? "active" : ""}`}
                    onClick={() => setSelectedSalesPeriod("daily")}
                  >
                    Daily
                  </button>
                  <button
                    className={`period-tab ${selectedSalesPeriod === "monthly" ? "active" : ""}`}
                    onClick={() => setSelectedSalesPeriod("monthly")}
                  >
                    Monthly
                  </button>
                  <button
                    className={`period-tab ${selectedSalesPeriod === "quarterly" ? "active" : ""}`}
                    onClick={() => setSelectedSalesPeriod("quarterly")}
                  >
                    Quarterly
                  </button>
                </div>
              </div>
              <div className="section-content">
                <SalesAnalyticsChart
                  period={selectedSalesPeriod}
                  data={getSalesPeriodData()}
                />
              </div>
            </div>
          </div>
        )}

        {/* Top Products Section */}
        {analytics?.topProducts && (
          <div className="analytics-section">
            <div className="section-card">
              <div className="section-header">
                <h3>Top 5 Selling Products</h3>
              </div>
              <div className="section-content">
                <TopProductsChart products={analytics.topProducts} />
              </div>
            </div>
          </div>
        )}

        {/* Customer Acquisition Section (for superadmin only) */}
        {user?.role === "superadmin" && analytics?.customerAcquisition && (
          <div className="analytics-section">
            <div className="section-card">
              <div className="section-header">
                <h3>Marketing Performance - Customer Acquisition by Source</h3>
              </div>
              <div className="section-content">
                <CustomerAcquisitionChart
                  sources={analytics.customerAcquisition}
                />
              </div>
            </div>
          </div>
        )}

        {/* Technician KPIs Section */}
        {analytics?.technicianKPIs && (
          <div className="analytics-section">
            <div className="section-card">
              <div className="section-header">
                <h3>Technician Performance KPIs</h3>
              </div>
              <div className="section-content">
                <TechnicianKPIs technicians={analytics.technicianKPIs} />
              </div>
            </div>
          </div>
        )}

        <div className="dashboard-two-column" style={{ marginTop: "16px" }}>
          <div className="recent-activity">
            <h3>Top Selling Items</h3>
            <div className="activity-list">
              {(report.topProducts || []).length === 0 ? (
                <div
                  style={{
                    padding: "12px",
                    color: "#6b7280",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  No sales data yet.
                </div>
              ) : (
                report.topProducts.slice(0, 5).map((item, index) => (
                  <div
                    key={`${item.productId || item.name}-${index}`}
                    className="activity-item"
                  >
                    <div className="activity-icon">
                      <img
                        src={icons.boxOpen}
                        alt=""
                        className="inline-icon inline-icon--md"
                      />
                    </div>
                    <div className="activity-content" style={{ width: "100%" }}>
                      <div
                        className="activity-text"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                        }}
                      >
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          #{index + 1} {item.name}
                        </span>
                        <span style={{ fontWeight: 800, color: "#1E88E5" }}>
                          {Number(item.unitsSold || 0)} units
                        </span>
                      </div>
                      <div className="time">
                        ₱{Number(item.revenue || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="admin-oversight">
            <h3>Monthly Comparison</h3>
            {monthComparison ? (
              <div className="oversight-list">
                <div className="oversight-item">
                  <div className="oversight-title">
                    Units sold (latest month)
                  </div>
                  <div className="oversight-desc">
                    {monthComparison.currentUnits} units
                    {Number.isFinite(monthComparison.deltaUnits) ? (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontWeight: 800,
                          color:
                            monthComparison.deltaUnits >= 0
                              ? "#166534"
                              : "#b91c1c",
                        }}
                      >
                        ({monthComparison.deltaUnits >= 0 ? "+" : ""}
                        {monthComparison.deltaUnits} vs prev)
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="oversight-item">
                  <div className="oversight-title">Revenue (latest month)</div>
                  <div className="oversight-desc">
                    ₱
                    {Number(
                      monthComparison.currentRevenue || 0,
                    ).toLocaleString()}
                    {Number.isFinite(monthComparison.deltaRevenue) ? (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontWeight: 800,
                          color:
                            monthComparison.deltaRevenue >= 0
                              ? "#166534"
                              : "#b91c1c",
                        }}
                      >
                        ({monthComparison.deltaRevenue >= 0 ? "+" : ""}₱
                        {Number(
                          monthComparison.deltaRevenue || 0,
                        ).toLocaleString()}{" "}
                        vs prev)
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="oversight-item">
                  <div className="oversight-title">Technician performance</div>
                  <div className="oversight-desc">
                    Coming soon: completion rate and average resolution time.
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "12px",
                  color: "#6b7280",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                No monthly data available yet.
              </div>
            )}
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            {quickActions.map((action, index) => (
              <button key={index} type="button" onClick={action.action}>
                <span className="action-icon">
                  <img
                    src={action.icon}
                    alt=""
                    className="inline-icon inline-icon--md"
                  />
                </span>
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="dashboard-two-column">
          <div className="recent-activity">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    <img
                      src={activity.icon}
                      alt=""
                      className="inline-icon inline-icon--md"
                    />
                  </div>
                  <div className="activity-content">
                    <div className="activity-text">{activity.text}</div>
                    <div className="time">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-oversight">
            <h3>Admin Oversight</h3>
            <div className="oversight-list">
              {oversightItems.map((item, index) => (
                <div key={index} className="oversight-item">
                  <div className="oversight-title">{item.title}</div>
                  <div className="oversight-desc">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
