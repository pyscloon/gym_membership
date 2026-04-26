import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "url";
import path from "path";

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";

dotenv.config({
  path: envFile,
});

const app = express();
const port = process.env.PORT || 4000;
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.use(express.json());

function formatHour(hour) {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${period}`;
}

function buildRangeLabel(startHour, endHour) {
  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}

function groupConsecutiveHours(entries) {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => a.hour - b.hour);
  const groups = [];
  let current = [];

  sorted.forEach((entry) => {
    if (current.length === 0) {
      current = [entry];
      return;
    }

    if (entry.hour === current[current.length - 1].hour + 1) {
      current.push(entry);
      return;
    }

    groups.push(current);
    current = [entry];
  });

  if (current.length > 0) {
    groups.push(current);
  }

  return groups.map((group) => {
    const startHour = group[0].hour;
    const endHour = (group[group.length - 1].hour + 1) % 24;
    const avgCrowd = group.reduce((sum, item) => sum + item.avgCrowd, 0) / group.length;
    return {
      startHour,
      endHour,
      label: buildRangeLabel(startHour, endHour),
      avgCrowd,
    };
  });
}

function buildMockSnapshots() {
  const now = new Date();
  const snapshots = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    for (let hour = 6; hour <= 21; hour += 1) {
      const point = new Date(now);
      point.setDate(now.getDate() - dayOffset);
      point.setHours(hour, 0, 0, 0);

      let activeUsers = 8;
      if (hour >= 6 && hour < 9) activeUsers = 14;
      if (hour >= 9 && hour < 12) activeUsers = 10;
      if (hour >= 12 && hour < 15) activeUsers = 18;
      if (hour >= 15 && hour < 17) activeUsers = 9;
      if (hour >= 17 && hour < 20) activeUsers = 28;
      if (hour >= 20) activeUsers = 12;

      snapshots.push({
        timestamp: point.toISOString(),
        activeUsers,
      });
    }
  }

  return snapshots;
}

function buildBestTimeResponse({ days = 7, topCount = 3, totalEquipment = 50 }) {
  const snapshots = buildMockSnapshots();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const filtered = snapshots.filter((snapshot) => new Date(snapshot.timestamp) >= cutoff);

  const hourlyMap = new Map();
  filtered.forEach((snapshot) => {
    const hour = new Date(snapshot.timestamp).getHours();
    const current = hourlyMap.get(hour) || { sumUsers: 0, count: 0 };
    hourlyMap.set(hour, {
      sumUsers: current.sumUsers + snapshot.activeUsers,
      count: current.count + 1,
    });
  });

  const hourlyAverages = Array.from(hourlyMap.entries())
    .map(([hour, aggregate]) => {
      const avgUsers = aggregate.sumUsers / aggregate.count;
      return {
        hour,
        avgUsers,
        avgCrowd: avgUsers / Math.max(totalEquipment, 1),
        sampleCount: aggregate.count,
      };
    })
    .sort((left, right) => left.hour - right.hour);

  if (hourlyAverages.length < 2) {
    return {
      best_time_ranges: [],
      worst_time_ranges: [],
      hourly_averages: hourlyAverages,
      message: "Not enough data yet",
      daysAnalyzed: days,
      generatedAt: new Date().toISOString(),
    };
  }

  const ranked = [...hourlyAverages].sort((a, b) => a.avgCrowd - b.avgCrowd);
  const count = Math.max(2, Math.min(topCount, Math.floor(ranked.length / 2) || 1));

  return {
    best_time_ranges: groupConsecutiveHours(ranked.slice(0, count)),
    worst_time_ranges: groupConsecutiveHours(ranked.slice(-count)),
    hourly_averages: hourlyAverages,
    daysAnalyzed: days,
    generatedAt: new Date().toISOString(),
  };
}

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    message: "Express server is running.",
    allowedOrigin,
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post("/api/login", (request, response) => {
  const { email, password } = request.body ?? {};

  if (!email || !password) {
    response.status(400).json({
      status: "error",
      message: "Please enter your email and password.",
    });
    return;
  }

  // Auth is handled by Supabase on the client — this endpoint is a passthrough
  // that confirms the request shape is valid.
  response.status(200).json({
    status: "ok",
    message: "Login request received.",
  });
});

app.post("/api/register", (request, response) => {
  const { email, password, name } = request.body ?? {};

  if (!email || !password || !name) {
    response.status(400).json({
      status: "error",
      message: "Please provide your name, email, and password.",
    });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    response.status(400).json({
      status: "error",
      message: "Please provide a valid email address.",
    });
    return;
  }

  if (String(password).length < 6) {
    response.status(400).json({
      status: "error",
      message: "Password must be at least 6 characters.",
    });
    return;
  }

  // Registration is handled by Supabase on the client — this endpoint confirms
  // the request shape is valid before the client calls Supabase directly.
  response.status(201).json({
    status: "ok",
    message: "Registration request received.",
  });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

app.post("/api/admin/login", (request, response) => {
  const { email, password } = request.body ?? {};

  if (!email || !password) {
    response.status(400).json({
      status: "error",
      message: "Please enter admin email and password.",
    });
    return;
  }

  const configuredAdminEmail = (
    process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || ""
  ).toLowerCase();

  if (!configuredAdminEmail) {
    response.status(500).json({
      status: "error",
      message: "VITE_ADMIN_EMAIL is missing in .env.",
    });
    return;
  }

  const normalizedEmail = String(email).toLowerCase();

  if (normalizedEmail !== configuredAdminEmail) {
    response.status(403).json({
      status: "error",
      message: "This account is not allowed to access the admin portal.",
    });
    return;
  }

  response.status(200).json({
    status: "ok",
    message: "Admin credentials accepted.",
    adminEmail: normalizedEmail,
  });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

app.get("/api/dashboard", (_request, response) => {
  response.status(200).json({
    status: "ok",
    message: "Dashboard data retrieved.",
    data: {
      user: {
        name: "John Doe",
        email: "member@example.com",
      },
      membership: {
        status: "active",
        expiryDate: "2026-12-31",
        plan: "Premium",
      },
      notifications: [
        {
          id: 1,
          message: "Welcome to Flex Republic",
        },
      ],
      streakCounter: 0,
    },
  });
});

// ── Crowd ─────────────────────────────────────────────────────────────────────

app.get("/api/crowd/best-times", (request, response) => {
  const parsedDays = Number.parseInt(String(request.query.days ?? "7"), 10);
  const parsedTopCount = Number.parseInt(String(request.query.topCount ?? "3"), 10);

  const days = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 7;
  const topCount = Number.isFinite(parsedTopCount) && parsedTopCount > 0 ? parsedTopCount : 3;

  response.status(200).json({
    status: "ok",
    message: "Best time suggestions generated.",
    data: buildBestTimeResponse({ days, topCount, totalEquipment: 50 }),
  });
});

// ── Frontend + catch-all ──────────────────────────────────────────────────────

app.use(express.static(path.resolve("dist")));

app.use((_req, res) => {
  res.sendFile(path.resolve("dist/index.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────

const currentFilePath = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] === currentFilePath;

if (isDirectRun) {
  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`);
  });
} else {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
