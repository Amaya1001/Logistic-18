// data/store.js
// In-memory data store (replace with a real DB in production)

const { v4: uuidv4 } = require("uuid");

// ── Routes ────────────────────────────────────────────────────────────────────
const routes = [
  {
    id: "R001",
    name: "Colombo – Gampaha",
    waypoints: ["Colombo Fort", "Kelaniya", "Wattala", "Gampaha"],
    distanceKm: 32,
    estimatedMinutes: 55,
    riskScore: 0.21,
    riskLevel: "low",
    active: true,
  },
  {
    id: "R002",
    name: "Colombo – Kandy (Expressway)",
    waypoints: ["Colombo", "Kadawatha", "Nittambuwa", "Kegalle", "Kandy"],
    distanceKm: 115,
    estimatedMinutes: 130,
    riskScore: 0.58,
    riskLevel: "medium",
    active: true,
  },
  {
    id: "R003",
    name: "Colombo – Galle (Coastal)",
    waypoints: ["Colombo", "Moratuwa", "Panadura", "Kalutara", "Galle"],
    distanceKm: 119,
    estimatedMinutes: 150,
    riskScore: 0.77,
    riskLevel: "high",
    active: true,
  },
  {
    id: "R004",
    name: "Colombo – Negombo",
    waypoints: ["Colombo", "Peliyagoda", "Ja-Ela", "Negombo"],
    distanceKm: 37,
    estimatedMinutes: 60,
    riskScore: 0.34,
    riskLevel: "low",
    active: true,
  },
];

// ── Deliveries ────────────────────────────────────────────────────────────────
const deliveries = [
  {
    id: "DEL-1001",
    orderId: "ORD-5521",
    customerId: "C001",
    driverId: "D003",
    routeId: "R001",
    status: "in_transit",
    startTime: new Date(Date.now() - 35 * 60000).toISOString(),
    estimatedArrival: new Date(Date.now() + 20 * 60000).toISOString(),
    actualArrival: null,
    progress: 62,
    currentLocation: "Kelaniya",
    delayMinutes: 0,
    aiRiskFlag: false,
  },
  {
    id: "DEL-1002",
    orderId: "ORD-5522",
    customerId: "C002",
    driverId: "D001",
    routeId: "R003",
    status: "delayed",
    startTime: new Date(Date.now() - 90 * 60000).toISOString(),
    estimatedArrival: new Date(Date.now() + 45 * 60000).toISOString(),
    actualArrival: null,
    progress: 41,
    currentLocation: "Kalutara",
    delayMinutes: 22,
    aiRiskFlag: true,
  },
  {
    id: "DEL-1003",
    orderId: "ORD-5523",
    customerId: "C003",
    driverId: "D002",
    routeId: "R004",
    status: "delivered",
    startTime: new Date(Date.now() - 120 * 60000).toISOString(),
    estimatedArrival: new Date(Date.now() - 65 * 60000).toISOString(),
    actualArrival: new Date(Date.now() - 60 * 60000).toISOString(),
    progress: 100,
    currentLocation: "Negombo",
    delayMinutes: 0,
    aiRiskFlag: false,
  },
  {
    id: "DEL-1004",
    orderId: "ORD-5524",
    customerId: "C004",
    driverId: "D004",
    routeId: "R002",
    status: "pending",
    startTime: null,
    estimatedArrival: new Date(Date.now() + 150 * 60000).toISOString(),
    actualArrival: null,
    progress: 0,
    currentLocation: "Colombo (Warehouse)",
    delayMinutes: 0,
    aiRiskFlag: false,
  },
];

// ── Notifications ─────────────────────────────────────────────────────────────
const notifications = [
  {
    id: uuidv4(),
    type: "delay_alert",
    severity: "high",
    deliveryId: "DEL-1002",
    message: "DEL-1002 is delayed by 22 minutes on the Galle coastal route.",
    recipients: ["manager", "driver:D001"],
    read: false,
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: uuidv4(),
    type: "risk_alert",
    severity: "high",
    deliveryId: "DEL-1002",
    message: "AI flagged high accident risk on R003 near Kalutara due to weather.",
    recipients: ["manager", "driver:D001"],
    read: false,
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
  },
  {
    id: uuidv4(),
    type: "delivery_complete",
    severity: "info",
    deliveryId: "DEL-1003",
    message: "DEL-1003 successfully delivered to Negombo.",
    recipients: ["manager"],
    read: true,
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
  },
];

// ── Agent Logs ────────────────────────────────────────────────────────────────
const agentLogs = [
  {
    id: uuidv4(),
    agentId: "route-risk-agent",
    action: "RISK_SCORE_UPDATE",
    payload: { routeId: "R003", newScore: 0.77, reason: "Heavy rain detected" },
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: uuidv4(),
    agentId: "delay-prediction-agent",
    action: "DELAY_DETECTED",
    payload: { deliveryId: "DEL-1002", predictedDelay: 22 },
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: uuidv4(),
    agentId: "notification-agent",
    action: "NOTIFICATION_SENT",
    payload: { recipients: ["manager", "driver:D001"], channel: "push" },
    timestamp: new Date(Date.now() - 9 * 60000).toISOString(),
  },
];

module.exports = { routes, deliveries, notifications, agentLogs, uuidv4 };
