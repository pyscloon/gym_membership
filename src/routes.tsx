import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLoginPage from "./pages/AdminLogin";
import AdminDashboardPage from "./pages/AdminDashboard";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import DashboardPage from "./pages/Dashboard";
import SubscriptionTierPage from "./pages/SubscriptionTier";
import AboutUsPage from "./pages/AboutUs";
import ProfilePage from "./pages/Profile";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import PaymentPanelPage from "./pages/PaymentPanel";
import WalkInPage from "./pages/WalkIn";
import TransactionHistory from "./pages/TransactionHistory";
import AnalyticsDashboard from "./components/AnalyticsDashboard";

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
        <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
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