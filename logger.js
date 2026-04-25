// middleware/logger.js
// Structured request logger – also writes to in-memory agent log

const { agentLogs, uuidv4 } = require("../data/store");

const logger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const entry = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`;
    console.log(entry);

    // Log API calls from agents to the agent log store
    if (req.originalUrl.startsWith("/api/agent")) {
      agentLogs.push({
        id: uuidv4(),
        agentId: req.headers["x-agent-id"] || "unknown-agent",
        action: "API_CALL",
        payload: { method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: duration },
        timestamp: new Date().toISOString(),
      });
    }
  });
  next();
};

module.exports = logger;
