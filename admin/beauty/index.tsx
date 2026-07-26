import React from 'react';
import AdminLayout from '../components/Layout';

export default function AdminBeautyPage() {
  return (
    <AdminLayout>
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">美妆管理（预留）</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['达人管理', '商品推荐', '分析报告'].map(item => (
            <div key={item} className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
              <span className="text-sm text-gray-400">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
