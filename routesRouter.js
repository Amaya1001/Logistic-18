// routes/routesRouter.js
// Endpoints: delivery route definition & AI risk scoring

const express = require("express");
const router = express.Router();
const { routes, uuidv4 } = require("../data/store");

// ── GET /api/routes ───────────────────────────────────────────────────────────
// Return all delivery routes with current risk levels
router.get("/", (req, res) => {
  res.json({ success: true, data: routes });
});

// ── GET /api/routes/:id ───────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const route = routes.find((r) => r.id === req.params.id);
  if (!route) return res.status(404).json({ success: false, message: "Route not found" });
  res.json({ success: true, data: route });
});

// ── POST /api/routes ──────────────────────────────────────────────────────────
// Create a new delivery route
router.post("/", (req, res) => {
  const { name, waypoints, distanceKm, estimatedMinutes } = req.body;
  if (!name || !waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
    return res.status(400).json({ success: false, message: "name and at least 2 waypoints are required" });
  }
  const newRoute = {
    id: `R${String(routes.length + 1).padStart(3, "0")}`,
    name,
    waypoints,
    distanceKm: distanceKm || 0,
    estimatedMinutes: estimatedMinutes || 0,
    riskScore: 0.1,         // Default low risk; AI agent will update this
    riskLevel: "low",
    active: true,
  };
  routes.push(newRoute);
  res.status(201).json({ success: true, data: newRoute });
});

// ── PATCH /api/routes/:id/risk ────────────────────────────────────────────────
// AI agent updates a route's risk score
router.patch("/:id/risk", (req, res) => {
  const route = routes.find((r) => r.id === req.params.id);
  if (!route) return res.status(404).json({ success: false, message: "Route not found" });

  const { riskScore, reason } = req.body;
  if (riskScore === undefined || riskScore < 0 || riskScore > 1) {
    return res.status(400).json({ success: false, message: "riskScore must be between 0 and 1" });
  }

  route.riskScore = riskScore;
  route.riskLevel = riskScore >= 0.7 ? "high" : riskScore >= 0.4 ? "medium" : "low";
  route.lastRiskUpdate = { updatedAt: new Date().toISOString(), reason: reason || "Agent update" };

  // Emit live update via Socket.IO (attached to app later)
  const io = req.app.get("io");
  if (io) io.emit("route:risk_update", route);

  res.json({ success: true, data: route });
});

// ── DELETE /api/routes/:id ────────────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  const idx = routes.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Route not found" });
  routes[idx].active = false;   // Soft delete
  res.json({ success: true, message: `Route ${req.params.id} deactivated` });
});

module.exports = router;
