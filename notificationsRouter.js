// routes/notificationsRouter.js
// Alert management: create, retrieve, mark-read, auto-notify drivers & managers

const express = require("express");
const router = express.Router();
const { notifications, uuidv4 } = require("../data/store");

// ── GET /api/notifications ────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const { recipient, read, severity } = req.query;
  let result = [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (recipient) result = result.filter((n) => n.recipients.includes(recipient));
  if (read !== undefined) result = result.filter((n) => n.read === (read === "true"));
  if (severity) result = result.filter((n) => n.severity === severity);

  res.json({ success: true, count: result.length, data: result });
});

// ── POST /api/notifications ───────────────────────────────────────────────────
// Agent or system creates a new notification/alert
router.post("/", (req, res) => {
  const { type, severity, deliveryId, message, recipients } = req.body;
  if (!message || !recipients || !Array.isArray(recipients)) {
    return res.status(400).json({ success: false, message: "message and recipients[] required" });
  }

  const notification = {
    id: uuidv4(),
    type: type || "info",
    severity: severity || "info",
    deliveryId: deliveryId || null,
    message,
    recipients,
    read: false,
    createdAt: new Date().toISOString(),
  };

  notifications.push(notification);

  // Broadcast to all connected dashboard clients
  const io = req.app.get("io");
  if (io) io.emit("notification:new", notification);

  res.status(201).json({ success: true, data: notification });
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
router.patch("/:id/read", (req, res) => {
  const notification = notifications.find((n) => n.id === req.params.id);
  if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
  notification.read = true;
  res.json({ success: true, data: notification });
});

// ── POST /api/notifications/read-all ─────────────────────────────────────────
router.post("/read-all", (req, res) => {
  const { recipient } = req.body;
  notifications
    .filter((n) => !recipient || n.recipients.includes(recipient))
    .forEach((n) => (n.read = true));
  res.json({ success: true, message: "All notifications marked as read" });
});

module.exports = router;
