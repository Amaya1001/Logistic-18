// routes/dashboardRouter.js
// Live dashboard data: summary KPIs, active deliveries, top alerts

const express = require("express");
const router = express.Router();
const { deliveries, routes, notifications, agentLogs } = require("../data/store");

// ── GET /api/dashboard/summary ────────────────────────────────────────────────
router.get("/summary", (req, res) => {
  const total      = deliveries.length;
  const inTransit  = deliveries.filter((d) => d.status === "in_transit").length;
  const delayed    = deliveries.filter((d) => d.status === "delayed").length;
  const delivered  = deliveries.filter((d) => d.status === "delivered").length;
  const pending    = deliveries.filter((d) => d.status === "pending").length;
  const highRisk   = deliveries.filter((d) => d.aiRiskFlag).length;
  const unreadAlerts = notifications.filter((n) => !n.read && n.severity !== "info").length;

  const onTimeRate = total > 0 ? Math.round(((delivered - delayed) / Math.max(delivered, 1)) * 100) : 0;

  const routeRiskBreakdown = {
    low:    routes.filter((r) => r.active && r.riskLevel === "low").length,
    medium: routes.filter((r) => r.active && r.riskLevel === "medium").length,
    high:   routes.filter((r) => r.active && r.riskLevel === "high").length,
  };

  res.json({
    success: true,
    data: {
      deliveries: { total, inTransit, delayed, delivered, pending, highRisk },
      onTimeRate,
      unreadAlerts,
      routeRiskBreakdown,
      lastUpdated: new Date().toISOString(),
    },
  });
});

// ── GET /api/dashboard/live ───────────────────────────────────────────────────
// Full live snapshot: active deliveries + recent alerts + agent activity
router.get("/live", (req, res) => {
  const activeDeliveries = deliveries
    .filter((d) => ["in_transit", "delayed"].includes(d.status))
    .map((d) => {
      const route = routes.find((r) => r.id === d.routeId);
      return { ...d, routeName: route?.name, routeRisk: route?.riskLevel };
    });

  const recentAlerts = [...notifications]
    .filter((n) => !n.read)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  const recentAgentActivity = [...agentLogs]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  res.json({
    success: true,
    data: { activeDeliveries, recentAlerts, recentAgentActivity },
  });
});

module.exports = router;
