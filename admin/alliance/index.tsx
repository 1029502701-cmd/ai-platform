import React from 'react';
import AdminLayout from '../components/Layout';

export default function AdminAlliancePage() {
  return (
    <AdminLayout>
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">联盟系统管理（预留）</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['商品库', '联盟链接', '佣金数据', '订单数据'].map(item => (
            <div key={item} className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
              <span className="text-sm text-gray-400">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
