import { Navigate, Route, Routes, Outlet } from "react-router";
import Layout from "./components/layout/Layout";
import AdminLayout from "./pages/admin/Layout";
import AdminDashboardPage from "./pages/admin/Dashboard";
import ChatPage from "./pages/Chat";
import IndexPage from "./pages/Index";
import LoginPage from "./pages/Login";
import PricingPage from "./pages/Pricing";
import RegisterPage from "./pages/Register";
import BeautyHomePage from "./pages/beauty/BeautyHome";
import PluginBeautyReportView from "../plugins/beauty/frontend/BeautyReportView";
import BeautySharePage from "./pages/beauty/BeautyShare";
import BeautyProfilePage from "./pages/beauty/BeautyProfile";
import MonitorPage from "./pages/Monitor";
// @ts-ignore
import AccountPage from "./pages/Account";
import DevelopersPage from "./pages/Developers";
import OpenApiPlayground from "./pages/OpenApiPlayground";
import MarketplacePage from "./pages/Marketplace";
import BeautyAdminPage from "./pages/admin/BeautyAdmin";
import IntegrationsPage from "./pages/Integrations";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/developers" element={<DevelopersPage />} />
        <Route path="/playground" element={<OpenApiPlayground />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/admin" element={<AdminLayout><Outlet /></AdminLayout>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<div className="p-6"><h1 className="text-xl font-bold">User Management</h1><p className="text-gray-500 mt-2">API: GET /api/admin/users/list</p></div>} />
          <Route path="models" element={<div className="p-6"><h1 className="text-xl font-bold">Model Management</h1><p className="text-gray-500 mt-2">API: GET /api/admin/models</p></div>} />
          <Route path="tasks" element={<div className="p-6"><h1 className="text-xl font-bold">Task Management</h1><p className="text-gray-500 mt-2">API: GET /api/admin/tasks | Retry: POST /api/admin/tasks/:id/retry</p></div>} />
          <Route path="queue" element={<div className="p-6"><h1 className="text-xl font-bold">Queue Monitor</h1><p className="text-gray-500 mt-2">API: GET /api/admin/monitor/tasks</p></div>} />
          <Route path="prompts" element={<div className="p-6"><h1 className="text-xl font-bold">Prompt Center</h1><p className="text-gray-500 mt-2">API: GET/POST /api/admin/prompts</p></div>} />
          <Route path="logs" element={<div className="p-6"><h1 className="text-xl font-bold">Log Center</h1><p className="text-gray-500 mt-2">API: GET /api/admin/logs</p></div>} />
          <Route path="settings" element={<div className="p-6"><h1 className="text-xl font-bold">System Settings</h1><p className="text-gray-500 mt-2">API: GET/PATCH /api/admin/settings</p></div>} />
          <Route path="developers" element={<div className="p-6"><h1 className="text-xl font-bold">Developer Management</h1><p className="text-gray-500 mt-2">API: GET /api/admin/developers</p></div>} />
          <Route path="beauty" element={<BeautyAdminPage /> } />
          <Route path="marketplace" element={<div className="p-6"><h1 className="text-xl font-bold">Marketplace Management</h1><p className="text-gray-500 mt-2">API: GET /api/admin/marketplace/apps</p></div>} />
        </Route>
        <Route path="/beauty" element={<BeautyHomePage />} />
        <Route path="/beauty/profile" element={<BeautyProfilePage />} />
        <Route path="/beauty/report" element={<PluginBeautyReportView />} />
        <Route path="/beauty/share/:id" element={<BeautySharePage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

