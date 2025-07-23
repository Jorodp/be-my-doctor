import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route path="/search" element={<DoctorSearch />} />
            <Route path="/doctor/:id" element={<DoctorProfile />} />
            <Route 
              path="/book/:doctorId" 
              element={
                <ProtectedRoute role="patient">
                  <BookAppointment />
                </ProtectedRoute>
              } 
            />
            {/* Legacy routes - kept for backward compatibility only */}
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
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
