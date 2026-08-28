const app = require("../src/app");
const connectDb = require("../src/config/db");
const env = require("../src/config/env");
const { seedDemoUsers } = require("../src/seed/seedDemoUsers");
const { seedDashboardData } = require("../src/seed/seedDashboardData");

let initialization;

const applyHealthCors = (req, res) =>
  new Promise((resolve) => {
    const origin = req.headers?.origin;
    env.corsOrigin(origin, (error, allowedOrigin) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Vary", "Origin");
      if (!error && origin && allowedOrigin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
        res.setHeader(
          "Access-Control-Allow-Headers",
          req.headers?.["access-control-request-headers"] ||
            "Content-Type,Authorization",
        );
      }
      resolve();
    });
  });

const healthResponse = async (req, res) => {
  await applyHealthCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  return res.json({
    status: "ok",
    service: "aeropulse-api",
    environment: env.nodeEnv,
    release: String(process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7),
  });
};

const initialize = async () => {
  if (!initialization) {
    initialization = (async () => {
      await connectDb();
      // Production data must never wait for demo-data checks on a cold
      // serverless start. Local development keeps the convenient seed data
      // unless explicitly turned off.
      if (env.nodeEnv !== "production" && process.env.SEED_DEMO_DATA !== "false") {
        await seedDemoUsers();
        await seedDashboardData();
      }
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
  // Do not trust only the cold-start initialization promise. A warm Vercel
  // function can lose its Atlas socket hours later; connectDb validates and
  // renews it before every API request.
  return connectDb();
};

module.exports = async (req, res) => {
  try {
    // Vercel rewrites all API paths to this serverless function. Restore the
    // original Express path so routes such as /api/products/public work.
    const incomingUrl = new URL(req.url || "/", "http://localhost");
    const rewrittenRoute = incomingUrl.searchParams.get("__route");
    if (rewrittenRoute) {
      incomingUrl.searchParams.delete("__route");
      const normalizedRoute = String(rewrittenRoute).replace(/^\/+/, "");
      req.url = `/api/${normalizedRoute}${incomingUrl.search}`;
    }

    // Health must remain useful while Atlas is reconnecting. It is used by
    // the web app as a connectivity probe and should not wait behind a stale
    // database socket or a payment-provider request.
    const path = new URL(req.url || "/", "http://localhost").pathname;
    if (path === "/api/health") return healthResponse(req, res);

    await initialize();
    if (["/", "/api", "/api/index"].includes(path)) {
      return res.json({
        service: "aeropulse-api",
        status: "ok",
        health: "/api/health",
      });
    }
    return app(req, res);
  } catch (error) {
    console.error("Vercel API initialization failed:", error);
    return res.status(503).json({
      message: "Database is temporarily unavailable. Please retry shortly.",
    });
  }
};
