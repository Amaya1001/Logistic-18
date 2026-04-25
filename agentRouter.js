// routes/agentRouter.js
// Agent communication hub: receive messages, log actions, relay to dashboard

const express = require("express");
const router = express.Router();
const { agentLogs, deliveries, routes, notifications, uuidv4 } = require("../data/store");

// ── POST /api/agent/log ───────────────────────────────────────────────────────
// Any AI agent posts its action here for centralised logging
router.post("/log", (req, res) => {
  const { agentId, action, payload } = req.body;
  if (!agentId || !action) {
    return res.status(400).json({ success: false, message: "agentId and action are required" });
  }

  const entry = {
    id: uuidv4(),
    agentId,
    action,
    payload: payload || {},
    timestamp: new Date().toISOString(),
  };

  agentLogs.push(entry);

  // Broadcast log to dashboard clients
  const io = req.app.get("io");
  if (io) io.emit("agent:log", entry);

  res.status(201).json({ success: true, data: entry });
});

// ── GET /api/agent/logs ───────────────────────────────────────────────────────
router.get("/logs", (req, res) => {
  const { agentId, action, limit = 50 } = req.query;
  let result = [...agentLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (agentId) result = result.filter((l) => l.agentId === agentId);
  if (action) result = result.filter((l) => l.action === action);
  res.json({ success: true, count: result.length, data: result.slice(0, Number(limit)) });
});

// ── POST /api/agent/reroute-suggest ──────────────────────────────────────────
// Shipment tracking agent sends reroute suggestions; system notifies driver
router.post("/reroute-suggest", (req, res) => {
  const { deliveryId, suggestedRouteId, reason } = req.body;
  if (!deliveryId || !suggestedRouteId) {
    return res.status(400).json({ success: false, message: "deliveryId and suggestedRouteId required" });
  }

  const delivery = deliveries.find((d) => d.id === deliveryId);
  const newRoute  = routes.find((r) => r.id === suggestedRouteId && r.active);
  if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
  if (!newRoute)  return res.status(404).json({ success: false, message: "Suggested route not found or inactive" });

  // Log agent action
  agentLogs.push({
    id: uuidv4(),
    agentId: "shipment-tracking-agent",
    action: "REROUTE_SUGGESTION",
    payload: { deliveryId, fromRoute: delivery.routeId, toRoute: suggestedRouteId, reason },
    timestamp: new Date().toISOString(),
  });

  // Notify driver & manager
  const note = {
    id: uuidv4(),
    type: "reroute_suggestion",
    severity: "medium",
    deliveryId,
    message: `AI suggests rerouting ${deliveryId} to "${newRoute.name}". Reason: ${reason || "Risk reduction"}`,
    recipients: ["manager", `driver:${delivery.driverId}`],
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.push(note);

  const io = req.app.get("io");
  if (io) {
    io.emit("notification:new", note);
    io.emit("agent:reroute", { deliveryId, suggestedRoute: newRoute });
  }

  res.status(201).json({ success: true, message: "Reroute suggestion logged and notification sent", data: note });
});

// ── POST /api/agent/heartbeat ─────────────────────────────────────────────────
// Agents ping this to signal they are alive
router.post("/heartbeat", (req, res) => {
  const { agentId, status } = req.body;
  if (!agentId) return res.status(400).json({ success: false, message: "agentId required" });

  const io = req.app.get("io");
  if (io) io.emit("agent:heartbeat", { agentId, status: status || "ok", ts: new Date().toISOString() });

  res.json({ success: true, message: `Heartbeat received from ${agentId}` });
});

module.exports = router;
