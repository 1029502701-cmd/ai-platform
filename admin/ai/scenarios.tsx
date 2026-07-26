import React from 'react';
import AdminLayout from '../components/Layout';

export default function AdminScenariosPage() {
  return (
    <AdminLayout>
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">场景管理</h3>
        <p className="text-sm text-gray-500">管理 AI 场景配置：默认模型、System Prompt、Temperature、变量约束。</p>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <span className="text-gray-400">场景数据从 D1 ai_scenarios 表加载</span>
        </div>
      </div>
    </AdminLayout>
  );
}
