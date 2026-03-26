import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "url";

dotenv.config();

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

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    message: "Express server is running.",
    allowedOrigin,
  });
});

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

const currentFilePath = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] === currentFilePath;

if (isDirectRun) {
  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`);
  });
}

export default app;
