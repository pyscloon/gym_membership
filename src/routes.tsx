import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/Landing.tsx";
import LoginPage from "./pages/Login.tsx";
import RegisterPage from "./pages/Register.tsx";
import DashboardPage from "./pages/Dashboard.tsx";
import SubscriptionTierPage from "./pages/SubscriptionTier.tsx";
import PaymentPanelPage from "./pages/PaymentPanel.tsx";
import AboutUsPage from "./pages/AboutUs.tsx";
import ProfilePage from "./pages/Profile.tsx";
import WalkInPage from "./pages/WalkIn.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLoginPage from "./pages/AdminLogin.tsx";
import AdminDashboardPage from "./pages/AdminDashboard.tsx";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import TransactionHistory from "./pages/TransactionHistory.tsx";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/walk-in" element={<WalkInPage />} />
        <Route path="/payment-panel" element={<PaymentPanelPage />} />
        <Route path="/about-us" element={<AboutUsPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription-tier"
          element={<SubscriptionTierPage />}
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboardPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/transaction-history" element={<TransactionHistory />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}