import { Navigate, Route, Routes } from "react-router";
import Layout from "./components/layout/Layout";
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

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/beauty" element={<BeautyHomePage />} />
        <Route path="/beauty/profile" element={<BeautyProfilePage />} />
        <Route path="/beauty/report" element={<PluginBeautyReportView />} />
        <Route path="/beauty/share/:id" element={<BeautySharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
