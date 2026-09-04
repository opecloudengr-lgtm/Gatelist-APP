import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthStore } from "./store/auth";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import StaffInvitePage from "./pages/auth/StaffInvitePage";

import EventsListPage from "./pages/events/EventsListPage";
import NewEventPage from "./pages/events/NewEventPage";
import EventDetailLayout from "./pages/events/EventDetailLayout";
import EventDashboardTab from "./pages/events/EventDashboardTab";
import EventGuestsTab from "./pages/events/EventGuestsTab";
import EventStaffTab from "./pages/events/EventStaffTab";
import EventSettingsTab from "./pages/events/EventSettingsTab";
import ScannerPage from "./pages/scanner/ScannerPage";

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user ? "/events" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/staff-invite/:token" element={<StaffInvitePage />} />

      <Route
        path="/events/:eventId/scan"
        element={
          <ProtectedRoute>
            <ScannerPage />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/events" element={<EventsListPage />} />
        <Route path="/events/new" element={<NewEventPage />} />
        <Route path="/events/:eventId" element={<EventDetailLayout />}>
          <Route index element={<EventDashboardTab />} />
          <Route path="guests" element={<EventGuestsTab />} />
          <Route path="staff" element={<EventStaffTab />} />
          <Route path="settings" element={<EventSettingsTab />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
