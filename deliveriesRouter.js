// routes/deliveriesRouter.js
// Real-time delivery tracking + order-to-driver assignment

const express = require("express");
const router = express.Router();
const { deliveries, routes, notifications, uuidv4 } = require("../data/store");

// ── GET /api/deliveries ───────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const { status, driverId, routeId } = req.query;
  let result = [...deliveries];
  if (status)   result = result.filter((d) => d.status === status);
  if (driverId) result = result.filter((d) => d.driverId === driverId);
  if (routeId)  result = result.filter((d) => d.routeId === routeId);
  res.json({ success: true, count: result.length, data: result });
});

// ── GET /api/deliveries/:id ───────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const delivery = deliveries.find((d) => d.id === req.params.id);
  if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
  res.json({ success: true, data: delivery });
});

// ── POST /api/deliveries/assign ───────────────────────────────────────────────
// Assign an order to a driver on a specific route
router.post("/assign", (req, res) => {
  const { orderId, customerId, driverId, routeId } = req.body;
  if (!orderId || !customerId || !driverId || !routeId) {
    return res.status(400).json({ success: false, message: "orderId, customerId, driverId, routeId required" });
  }

  const route = routes.find((r) => r.id === routeId && r.active);
  if (!route) return res.status(404).json({ success: false, message: "Active route not found" });

  const newDelivery = {
    id: `DEL-${1000 + deliveries.length + 1}`,
    orderId,
    customerId,
    driverId,
    routeId,
    status: "pending",
    startTime: null,
    estimatedArrival: new Date(Date.now() + route.estimatedMinutes * 60000).toISOString(),
    actualArrival: null,
    progress: 0,
    currentLocation: route.waypoints[0],
    delayMinutes: 0,
    aiRiskFlag: route.riskLevel === "high",
  };

  deliveries.push(newDelivery);

  // Auto-notify if route is high-risk
  if (route.riskLevel === "high") {
    notifications.push({
      id: uuidv4(),
      type: "risk_alert",
      severity: "high",
      deliveryId: newDelivery.id,
      message: `New delivery ${newDelivery.id} assigned to a HIGH-RISK route (${route.name}). Review recommended.`,
      recipients: ["manager", `driver:${driverId}`],
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  const io = req.app.get("io");
  if (io) io.emit("delivery:new", newDelivery);

  res.status(201).json({ success: true, data: newDelivery });
});

// ── PATCH /api/deliveries/:id/status ─────────────────────────────────────────
// Update delivery status & progress (called by tracking agent)
router.patch("/:id/status", (req, res) => {
  const delivery = deliveries.find((d) => d.id === req.params.id);
  if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });

  const { status, progress, currentLocation, delayMinutes, aiRiskFlag } = req.body;

  if (status) delivery.status = status;
  if (progress !== undefined) delivery.progress = Math.min(100, Math.max(0, progress));
  if (currentLocation) delivery.currentLocation = currentLocation;
  if (delayMinutes !== undefined) delivery.delayMinutes = delayMinutes;
  if (aiRiskFlag !== undefined) delivery.aiRiskFlag = aiRiskFlag;

  if (status === "delivered") {
    delivery.actualArrival = new Date().toISOString();
    delivery.progress = 100;
    notifications.push({
      id: uuidv4(),
      type: "delivery_complete",
      severity: "info",
      deliveryId: delivery.id,
      message: `Delivery ${delivery.id} completed successfully at ${delivery.currentLocation}.`,
      recipients: ["manager"],
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  if (delayMinutes > 0) {
    notifications.push({
      id: uuidv4(),
      type: "delay_alert",
      severity: delayMinutes > 30 ? "high" : "medium",
      deliveryId: delivery.id,
      message: `Delivery ${delivery.id} is delayed by ${delayMinutes} minutes.`,
      recipients: ["manager", `driver:${delivery.driverId}`],
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  const io = req.app.get("io");
  if (io) io.emit("delivery:update", delivery);

  res.json({ success: true, data: delivery });
});

module.exports = router;
