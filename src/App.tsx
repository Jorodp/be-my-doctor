// src/App.tsx

import CustomerSupport from "./pages/CustomerSupport";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import { PatientDashboard } from "./components/dashboard/PatientDashboard";
import { DoctorDashboard } from "./components/dashboard/DoctorDashboard";
import { AssistantDashboard } from "./components/dashboard/AssistantDashboard";
import { AdminDashboard } from "./components/dashboard/AdminDashboard";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import EmergencyLogout from "./pages/EmergencyLogout";
import DoctorSearch from "./pages/DoctorSearch";
import DoctorProfile from "./pages/DoctorProfile";
import BookAppointment from "./pages/BookAppointment";
import { CompleteDoctorProfile } from "./pages/CompleteDoctorProfile";
import { CompletePatientProfile } from "./pages/CompletePatientProfile";
import PendingVerification from "./pages/PendingVerification";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import AdminDoctorsPage from "./pages/admin/doctores/index";
import AdminDoctorDetailPage from "./pages/admin/doctores/detail";
import ResetPassword from "./pages/ResetPassword";
import EmailConfirmation from "./pages/EmailConfirmation";
import AuthCallback from "./pages/AuthCallback";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/email-confirmation" element={<EmailConfirmation />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/dashboard/patient"
              element={
                <ProtectedRoute role="patient">
                  <PatientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/doctor"
              element={
                <ProtectedRoute role="doctor">
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/assistant"
              element={
                <ProtectedRoute role="assistant">
                  <AssistantDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subscriptions"
              element={
                <ProtectedRoute role="admin">
                  <AdminSubscriptions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/doctores"
              element={
                <ProtectedRoute role="admin">
                  <AdminDoctorsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/doctores/:id"
              element={
                <ProtectedRoute role="admin">
                  <AdminDoctorDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="/search" element={<DoctorSearch />} />

            {/* Ahora el perfil del doctor está protegido para pacientes */}
            <Route
              path="/doctor/:id"
              element={
                <ProtectedRoute role="patient">
                  <DoctorProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/book/:doctorId"
              element={
                <ProtectedRoute role="patient">
                  <BookAppointment />
                </ProtectedRoute>
              }
            />

            {/* Legacy routes */}
            <Route
              path="/profile/doctor"
              element={
                <ProtectedRoute role="doctor">
                  <CompleteDoctorProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/patient"
              element={
                <ProtectedRoute role="patient">
                  <CompletePatientProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/complete-doctor-profile"
              element={
                <ProtectedRoute role="doctor">
                  <CompleteDoctorProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pending-verification"
              element={
                <ProtectedRoute role="doctor">
                  <PendingVerification />
                </ProtectedRoute>
              }
            />
            <Route path="/emergency-logout" element={<EmergencyLogout />} />
            <Route path="/customer-support" element={<CustomerSupport />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
