// server.js – Route Tracking & Notification System
// IT2021 AIML Project | IT24103283 Umayanthi R.G.A.A.

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const cors       = require("cors");
const path       = require("path");

const logger              = require("./middleware/logger");
const routesRouter        = require("./routes/routesRouter");
const deliveriesRouter    = require("./routes/deliveriesRouter");
const notificationsRouter = require("./routes/notificationsRouter");
const agentRouter         = require("./routes/agentRouter");
const dashboardRouter     = require("./routes/dashboardRouter");
const { deliveries, routes, agentLogs, uuidv4 } = require("./data/store");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

// ── Share Socket.IO with routes ───────────────────────────────────────────────
app.set("io", io);

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(logger);
app.use(express.static(path.join(__dirname, "frontend")));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/routes",        routesRouter);
app.use("/api/deliveries",    deliveriesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/agent",         agentRouter);
app.use("/api/dashboard",     dashboardRouter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    module: "Route Tracking & Notification System",
    student: "IT24103283 – Umayanthi R.G.A.A.",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Socket.IO – Real-time Layer ───────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Send current snapshot on connect
  socket.emit("init", {
    deliveries: deliveries.filter((d) => ["in_transit", "delayed"].includes(d.status)),
    routes,
  });

  socket.on("disconnect", () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ── Simulation: Update delivery progress every 15 s ──────────────────────────
setInterval(() => {
  deliveries
    .filter((d) => d.status === "in_transit" || d.status === "delayed")
    .forEach((delivery) => {
      const route = routes.find((r) => r.id === delivery.routeId);

      // Advance progress by 3–7%
      delivery.progress = Math.min(100, delivery.progress + Math.floor(Math.random() * 5) + 3);

      // Update current location to next waypoint when progress crosses threshold
      if (route) {
        const waypointIdx = Math.floor((delivery.progress / 100) * (route.waypoints.length - 1));
        delivery.currentLocation = route.waypoints[waypointIdx];
      }

      // Simulate occasional delay
      if (Math.random() < 0.1 && delivery.status === "in_transit") {
        delivery.delayMinutes = Math.floor(Math.random() * 15) + 5;
        delivery.status = "delayed";
      }

      // Auto-complete when 100%
      if (delivery.progress >= 100) {
        delivery.status = "delivered";
        delivery.actualArrival = new Date().toISOString();
      }

      io.emit("delivery:update", delivery);

      // Log simulation tick
      agentLogs.push({
        id: uuidv4(),
        agentId: "simulation-engine",
        action: "PROGRESS_TICK",
        payload: { deliveryId: delivery.id, progress: delivery.progress, location: delivery.currentLocation },
        timestamp: new Date().toISOString(),
      });
    });
}, 15000);

// ── Start Server ──────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║   Route Tracking & Notification System             ║");
  console.log("║   IT24103283 – Umayanthi R.G.A.A.                  ║");
  console.log(`║   Server running → http://localhost:${PORT}           ║`);
  console.log("╚════════════════════════════════════════════════════╝");
});
