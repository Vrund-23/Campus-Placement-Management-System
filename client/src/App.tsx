import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";

import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/JobsPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import ProfilePage from "./pages/ProfilePage";
import VerifyStudentsPage from "./pages/VerifyStudentsPage";
import ManageJobsPage from "./pages/ManageJobsPage";
import JobCandidatesPage from "./pages/JobCandidatesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CompaniesPage from "./pages/CompaniesPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import PlacementReportPage from "./pages/PlacementReportPage";
import ManageTPCPage from "./pages/ManageTPCPage";
import ManageTPFPage from "./pages/ManageTPFPage";
import ManageStudentsPage from "./pages/ManageStudentsPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotFound from "./pages/NotFound";
import DepartmentOverviewPage from "./pages/DepartmentOverviewPage";
import { PlacementStatsProvider } from "@/contexts/PlacementStatsContext";

import { AcademicYearProvider } from "@/contexts/AcademicYearContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AcademicYearProvider>
        <PlacementStatsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />

              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/verify-students" element={<VerifyStudentsPage />} />
              <Route path="/approvals" element={<VerifyStudentsPage />} />
              <Route path="/final-verification" element={<VerifyStudentsPage />} />
              <Route path="/students" element={<VerifyStudentsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/departments" element={<DepartmentOverviewPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/manage-jobs" element={<ManageJobsPage />} />
              <Route path="/manage-jobs/:jobId/candidates" element={<JobCandidatesPage />} />
              <Route path="/settings" element={<AdminSettingsPage />} />
              <Route path="/placement-report" element={<PlacementReportPage />} />
              <Route path="/manage-tpcs" element={<ManageTPCPage />} />
              <Route path="/manage-tpfs" element={<ManageTPFPage />} />

              <Route path="/manage-students" element={<ManageStudentsPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PlacementStatsProvider>
    </AcademicYearProvider>
  </AuthProvider>
</QueryClientProvider>
);

export default App;
