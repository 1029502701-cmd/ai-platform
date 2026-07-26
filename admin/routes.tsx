import React from 'react';
import { Route } from 'react-router';

import AdminDashboardPage from './dashboard';
import AdminUsersPage from './users';
import AdminModelsPage from './ai/models';
import AdminScenariosPage from './ai/scenarios';
import AdminTasksPage from './tasks';
import AdminBillingPage from './billing';
import AdminBeautyPage from './beauty';
import AdminAlliancePage from './alliance';
import AdminSystemPage from './system';
import AdminAgentsPage from './agents';
import AdminSecurityPage from './Security';
import AdminDevelopersPage from './Developers';
import PlatformAdminPage from '../src/pages/Platform';

export const adminRoutes: React.ReactElement = (
  <Route path="/admin/*" element={<div><AdminDashboardPage /></div>}>
    {/* Dashboard — default */}
    <Route index element={<AdminDashboardPage />} />
    {/* Users management */}
    <Route path="users" element={<AdminUsersPage />} />
    {/* AI management */}
    <Route path="ai/models" element={<AdminModelsPage />} />
    <Route path="ai/scenarios" element={<AdminScenariosPage />} />
    {/* Task monitoring */}
    <Route path="tasks" element={<AdminTasksPage />} />
    {/* Billing */}
    <Route path="billing" element={<AdminBillingPage />} />
    {/* Beauty (reserved) */}
    <Route path="beauty" element={<AdminBeautyPage />} />
    {/* Alliance (reserved) */}
    <Route path="alliance" element={<AdminAlliancePage />} />
    {/* Agents management */
    <Route path="agents" element={<AdminAgentsPage />} />
    {/* System settings */}}
    <Route path="system" element={<AdminSystemPage />} />
  
    {/* Platform Admin */}
    <Route path="platform" element={<PlatformAdminPage />} />

);
