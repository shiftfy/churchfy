import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import { Dashboard } from "@/pages/dashboard/Dashboard";
import { Login } from "@/pages/auth/Login";
import { Signup } from "@/pages/auth/Signup";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import { Branches } from "@/pages/branches/Branches";
import { FormList } from "@/pages/visitors/FormList";
import FormBuilder from "@/pages/visitors/FormBuilder";
import { VisitorList } from "@/pages/visitors/VisitorList";
import { PublicForm } from "@/pages/public/PublicForm";
import { WhatsAppSettings } from "@/pages/whatsapp/WhatsAppSettings";
import { VisitorFlow } from "@/pages/visitors/VisitorFlow";
import { OrganizationSettings } from "@/pages/settings/OrganizationSettings";
import { ProfileSettings } from "@/pages/settings/ProfileSettings";
import { DisciplersList } from "@/pages/disciplers/DisciplersList";
import { SuperAdminDashboard } from "@/pages/admin/SuperAdminDashboard";
import { UserManagement } from "@/pages/admin/UserManagement";
import { OrganizationManagement } from "@/pages/admin/OrganizationManagement";
import { PersonProfile } from "@/pages/people/PersonProfile";
import { TagsAndFields } from "@/pages/settings/TagsAndFields";
import { AutomationList } from "@/pages/automations/AutomationList";
import { AutomationBuilder } from "@/pages/automations/AutomationBuilder";

import { Onboarding } from "@/pages/onboarding/Onboarding";

function App() {
  // Force re-render on location change to ensure Routes update - REMOVED as it causes unnecessary re-renders
  // useLocation();

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Signup />} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />

      {/* Public Form Routes */}
      <Route path="/:username/:slug" element={<PublicForm />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout>
              <Outlet />
            </AppLayout>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/formularios">
          <Route index element={<FormList />} />
          <Route path="novo" element={<FormBuilder />} />
          <Route path="editar/:id" element={<FormBuilder />} />
        </Route>
        <Route path="/visitantes">
          <Route index element={<Navigate to="/visitantes/todos" replace />} />
          <Route path="todos" element={<VisitorList />} />
          <Route path="fluxo" element={<VisitorFlow />} />
        </Route>
        <Route path="/pessoas/:id" element={<PersonProfile />} />
        <Route path="/whatsapp" element={<WhatsAppSettings />} />
        <Route path="/discipuladores" element={<DisciplersList />} />
        <Route path="/filiais" element={<Branches />} />
        <Route path="/configuracoes" element={<OrganizationSettings />} />
        <Route path="/configuracoes/tags-campos" element={<TagsAndFields />} />
        <Route path="/automacoes">
          <Route index element={<AutomationList />} />
          <Route path="nova" element={<AutomationBuilder />} />
          <Route path="editar/:id" element={<AutomationBuilder />} />
        </Route>
        <Route path="/perfil" element={<ProfileSettings />} />
      </Route>

      {/* Onboarding Routes - Protected but distinct layout */}
      {/* Onboarding Routes - Protected but distinct layout */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* Super Admin Routes */}
      <Route
        path="/super-admin"
        element={
          <SuperAdminRoute>
            <SuperAdminLayout>
              <Outlet />
            </SuperAdminLayout>
          </SuperAdminRoute>
        }
      >
        <Route index element={<SuperAdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="organizations" element={<OrganizationManagement />} />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Fallback for unknown routes */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
