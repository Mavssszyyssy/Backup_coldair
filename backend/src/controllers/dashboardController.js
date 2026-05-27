const User = require("../models/User");
const Task = require("../models/Task");
const Order = require("../models/Order");
const ServiceRequest = require("../models/ServiceRequest");
const Product = require("../models/Product");

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const getDateRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
};

const getTechnicianDashboard = async (activeBranch = "") => {
  const taskQuery = { assignedRole: "technician" };
  if (activeBranch) {
    taskQuery.$or = [{ branch: activeBranch }, { branch: "" }, { branch: { $exists: false } }];
  }
  const tasks = await Task.find(taskQuery).sort({ createdAt: -1 }).limit(20);
  const today = startOfToday();

  return {
    stats: {
      pendingTasks: tasks.filter((t) => t.status === "pending").length,
      processingTasks: tasks.filter((t) => t.status === "pending").length,
      inProgressTasks: tasks.filter((t) => t.status === "in-progress").length,
      onHoldTasks: tasks.filter((t) => t.status === "on-hold").length,
      completedToday: tasks.filter((t) => t.completedAt && t.completedAt >= today).length,
      totalTasks: tasks.length,
      branchLabel: activeBranch || "All branches",
    },
    tasks: tasks.map((task) => task.toJSON()),
  };
};

/**
 * Calculate sales analytics: daily, monthly, quarterly
 */
const calculateSalesAnalytics = async (branch = "") => {
  const orderQuery = { 
    status: { $ne: "cancelled" },
    workflowStatus: { $ne: "cancelled" }
  };
  
  if (branch) {
    orderQuery.$or = [
      { customerBranch: branch },
      { stockSourceBranch: branch },
    ];
  }

  const orders = await Order.find(orderQuery);

  // Group by date
  const dailyData = {};
  const monthlyData = {};
  const quarterlyData = {};

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const dateStr = date.toISOString().split("T")[0];
    const month = date.toISOString().substring(0, 7);
    const quarter = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;

    dailyData[dateStr] = (dailyData[dateStr] || 0) + order.totalAmount;
    monthlyData[month] = (monthlyData[month] || 0) + order.totalAmount;
    quarterlyData[quarter] = (quarterlyData[quarter] || 0) + order.totalAmount;
  });

  return {
    daily: Object.entries(dailyData).map(([date, sales]) => ({ date, sales })),
    monthly: Object.entries(monthlyData).map(([month, sales]) => ({ month, sales })),
    quarterly: Object.entries(quarterlyData).map(([quarter, sales]) => ({ quarter, sales })),
  };
};

/**
 * Get top 5 selling products
 */
const getTopSellingProducts = async (branch = "", limit = 5) => {
  const orderQuery = { 
    status: { $ne: "cancelled" },
    workflowStatus: { $ne: "cancelled" }
  };
  
  if (branch) {
    orderQuery.$or = [
      { customerBranch: branch },
      { stockSourceBranch: branch },
    ];
  }

  const orders = await Order.find(orderQuery);
  const productSales = {};

  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const key = item.productId || item.name;
      productSales[key] = (productSales[key] || 0) + (item.quantity * item.price);
    });
  });

  return Object.entries(productSales)
    .map(([product, sales]) => ({ product, sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
};

/**
 * Get customer acquisition by source
 */
const getCustomerAcquisitionBySource = async () => {
  const customers = await User.find({ role: "customer" });
  
  const sourceData = {
    social_media: 0,
    google: 0,
    friend_referral: 0,
    walk_in: 0,
    other: 0,
  };

  customers.forEach((customer) => {
    const source = customer.sourceOfAcquisition || "other";
    sourceData[source] = (sourceData[source] || 0) + 1;
  });

  return Object.entries(sourceData).map(([source, count]) => ({
    source: source.replace(/_/g, " ").toUpperCase(),
    count,
  }));
};

/**
 * Get technician KPIs
 */
const getTechnicianKPIs = async (activeBranch = "") => {
  const techQuery = { role: "technician" };
  if (activeBranch) {
    techQuery.$or = [{ assignedBranch: activeBranch }, { assignedBranch: "" }];
  }

  const technicians = await User.find(techQuery);
  const today = startOfToday();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const techKPIs = await Promise.all(
    technicians.map(async (tech) => {
      const completedToday = await Task.countDocuments({
        assignedTo: tech._id,
        status: "completed",
        completedAt: { $gte: today },
      });

      const completedWeek = await Task.countDocuments({
        assignedTo: tech._id,
        status: "completed",
        completedAt: { $gte: weekStart },
      });

      const completedMonth = await Task.countDocuments({
        assignedTo: tech._id,
        status: "completed",
        completedAt: { $gte: monthStart },
      });

      return {
        name: tech.name,
        completedToday,
        completedWeek,
        completedMonth,
      };
    })
  );

  return techKPIs.sort((a, b) => b.completedMonth - a.completedMonth);
};

const getAdminDashboard = async (activeBranch = "") => {
  const orderQuery = {
    status: { $ne: "cancelled" },
    workflowStatus: { $ne: "cancelled" },
  };
  if (activeBranch) {
    orderQuery.$or = [
      { customerBranch: activeBranch },
      { stockSourceBranch: activeBranch },
    ];
  }
  const taskQuery = { status: { $in: ["pending", "in-progress"] } };
  const techQuery = { role: "technician" };
  const customerQuery = { role: "customer" };
  const serviceQuery = {};
  if (activeBranch) {
    taskQuery.$or = [{ branch: activeBranch }, { branch: "" }, { branch: { $exists: false } }];
    techQuery.$or = [{ assignedBranch: activeBranch }, { assignedBranch: "" }, { assignedBranch: { $exists: false } }];
    customerQuery.$or = [{ activeBranch }, { activeBranch: "" }, { activeBranch: { $exists: false } }];
    serviceQuery.$or = [{ branch: activeBranch }, { branch: "" }, { branch: { $exists: false } }];
  }

  const [orders, pendingTasks, activeTechnicians, totalCustomers, serviceRequests] = await Promise.all([
    Order.find(orderQuery),
    Task.countDocuments(taskQuery),
    User.countDocuments(techQuery),
    User.countDocuments(customerQuery),
    ServiceRequest.countDocuments(serviceQuery),
  ]);

  const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  // Get enhanced analytics
  const [salesAnalytics, topProducts, techKPIs] = await Promise.all([
    calculateSalesAnalytics(activeBranch),
    getTopSellingProducts(activeBranch),
    getTechnicianKPIs(activeBranch),
  ]);

  return {
    stats: {
      totalSales,
      totalOrders: orders.length,
      lowStockItems: 0,
      activeTechnicians,
      pendingTasks,
      totalCustomers,
      serviceRequests,
      branchLabel: activeBranch || "All branches",
    },
    analytics: {
      sales: salesAnalytics,
      topProducts,
      technicianKPIs: techKPIs.slice(0, 10),
    },
  };
};

const getSuperAdminDashboard = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totalUsers, admins, technicians, customers, recentlyActiveUsers] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: { $in: ["admin", "superadmin"] } }),
    User.countDocuments({ role: "technician" }),
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ lastLogin: { $gte: oneDayAgo } }),
  ]);

  // Get global analytics
  const [salesAnalytics, topProducts, customerAcquisition, techKPIs] = await Promise.all([
    calculateSalesAnalytics(),
    getTopSellingProducts(),
    getCustomerAcquisitionBySource(),
    getTechnicianKPIs(),
  ]);

  return {
    stats: {
      totalUsers,
      admins,
      technicians,
      customers,
      recentlyActiveUsers,
    },
    analytics: {
      sales: salesAnalytics,
      topProducts,
      customerAcquisition,
      technicianKPIs: techKPIs.slice(0, 10),
    },
  };
};

const getMyDashboard = async (req, res) => {
  try {
    const role = req.authUser.role;

    if (role === "technician") {
      return res.json({ role, ...(await getTechnicianDashboard(req.activeBranch)) });
    }

    if (role === "admin") {
      return res.json({ role, ...(await getAdminDashboard(req.activeBranch)) });
    }

    if (role === "superadmin") {
      return res.json({ role, ...(await getSuperAdminDashboard()) });
    }

    return res.json({
      role,
      stats: {
        message: "Customer dashboard uses storefront pages.",
      },
    });
  } catch (error) {
    console.error("Failed to load dashboard:", error);
    return res.status(500).json({ message: "Unable to load dashboard right now." });
  }
};

module.exports = { getMyDashboard };
