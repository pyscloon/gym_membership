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

// ── Streak ───────────────────────────────────────────────────────────────────

/**
 * Calculate the daily login streak for a user
 * A streak increments if the user has at least one check-in per calendar day (UTC)
 * The streak resets to 0 if a full calendar day is missed
 * 
 * @param {Array<string>} checkInDates - Array of ISO timestamps from check_ins table
 * @returns {Object} { streak: number, last7Days: boolean[] }
 */
function calculateStreak(checkInDates) {
  if (!checkInDates || checkInDates.length === 0) {
    return { streak: 0, last7Days: Array(7).fill(false) };
  }

  // Convert timestamps to UTC dates (just the date part)
  const dateSet = new Set();
  checkInDates.forEach((timestamp) => {
    const date = new Date(timestamp);
    const utcDateString = date.toISOString().split("T")[0]; // YYYY-MM-DD
    dateSet.add(utcDateString);
  });

  // Get last 7 calendar days (UTC)
  const today = new Date();
  const last7Days = [];
  const dateArray = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    const dateString = date.toISOString().split("T")[0];
    dateArray.push(dateString);
    last7Days.push(dateSet.has(dateString));
  }

  // Calculate current streak (consecutive days from today backwards)
  let streak = 0;
  const todayString = today.toISOString().split("T")[0];
  
  for (let i = 0; i < 7; i++) {
    const checkDate = dateArray[6 - i]; // Start from today and go backwards
    if (dateSet.has(checkDate)) {
      streak += 1;
    } else {
      break; // Streak breaks if a day is missed
    }
  }

  return { streak, last7Days };
}

app.get("/api/streak", async (request, response) => {
  try {
    const { userId } = request.query;

    if (!userId) {
      return response.status(400).json({
        status: "error",
        message: "userId is required",
      });
    }

    // ⚠️ SECURITY NOTE: In production, verify the user ID matches the authenticated user
    // For now, we're accepting userId from query for development purposes.
    // This endpoint should verify auth token and only allow users to fetch their own streak.

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return response.status(500).json({
        status: "error",
        message: "Supabase configuration missing",
      });
    }

    // Use dynamic import for ES module
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Query check-ins for the last 30 days (for efficiency)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const { data: checkIns, error } = await supabase
      .from("check_ins")
      .select("check_in_time")
      .eq("user_id", userId)
      .gte("check_in_time", thirtyDaysAgo.toISOString())
      .order("check_in_time", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return response.status(500).json({
        status: "error",
        message: "Failed to fetch check-in data",
        error: error.message,
      });
    }

    // Extract timestamps and calculate streak
    const timestamps = checkIns.map((record) => record.check_in_time);
    const { streak, last7Days } = calculateStreak(timestamps);

    response.status(200).json({
      status: "ok",
      message: "Streak calculated successfully",
      data: {
        streak,
        last7Days,
        totalCheckIns: checkIns.length,
      },
    });
  } catch (err) {
    console.error("Streak endpoint error:", err);
    response.status(500).json({
      status: "error",
      message: "Internal server error",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
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
