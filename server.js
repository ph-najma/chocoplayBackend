const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const accessCodeRoutes = require("./src/routes/accessCodeRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chocoplay";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:4200";

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "chocoplay-api" });
});

app.use("/api/access", accessCodeRoutes);

// Optional static hosting for existing pages without UI changes.
app.use(express.static(path.resolve(__dirname, "..")));

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

start();
