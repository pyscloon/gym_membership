import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLoginPage from "./pages/AdminLogin.tsx";
import AdminDashboardPage from "./pages/AdminDashboard.tsx";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
const LandingPage = lazy(() => import("./pages/Landing.tsx"));
const LoginPage = lazy(() => import("./pages/Login.tsx"));
const RegisterPage = lazy(() => import("./pages/Register.tsx"));
const DashboardPage = lazy(() => import("./pages/Dashboard.tsx"));
const SubscriptionTierPage = lazy(() => import("./pages/SubscriptionTier.tsx"));
const PaymentPanelPage = lazy(() => import("./pages/PaymentPanel.tsx"));
const AboutUsPage = lazy(() => import("./pages/AboutUs.tsx"));
const ProfilePage = lazy(() => import("./pages/Profile.tsx"));
const WalkInPage = lazy(() => import("./pages/WalkIn.tsx"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory.tsx"));
const AnalyticsDashboard = lazy(() => import("./components/AnalyticsDashboard.tsx"));

function RouteFallback() {
  return (
    <div className="min-h-screen w-full animate-pulse bg-gradient-to-br from-white via-[#f0f7ff] to-[#e3f2fd] p-6 sm:p-10">
      <div className="mx-auto h-12 w-full max-w-7xl rounded-2xl bg-slate-200/70" />
      <div className="mx-auto mt-8 h-44 w-full max-w-7xl rounded-3xl bg-slate-200/60" />
      <div className="mx-auto mt-6 grid w-full max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-2xl bg-slate-200/60" />
        <div className="h-28 rounded-2xl bg-slate-200/60" />
        <div className="h-28 rounded-2xl bg-slate-200/60" />
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </BrowserRouter>
  );
}