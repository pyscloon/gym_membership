import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Login.tsx";
import RegisterPage from "./pages/Register.tsx";
import DashboardPage from "./pages/Dashboard.tsx";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}