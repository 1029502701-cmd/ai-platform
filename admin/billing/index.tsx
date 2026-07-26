import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/Layout';
import StatCard from '../components/StatCard';
import AdminTable from '../components/Table';

export default function AdminBillingPage() {
  const [overview, setOverview] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/billing/revenue').then(r => r.json()),
      fetch('/api/admin/billing/transactions?page=1').then(r => r.json()),
      fetch('/api/admin/billing/products').then(r => r.json()),
    ]).then(([oRes, tRes, pRes]) => {
      if (oRes.success) setOverview(oRes.data);
      if (tRes.success) setTransactions(tRes.data || []);
      if (pRes.success) setProducts(pRes.products || []);
    }).catch(e => console.error('Billing load error:', e)).finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Billing & Monetization</h2>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Today Revenue" value={"\u00a5" + (overview?.todayRevenue / 100).toFixed(2)} color="green" />
          <StatCard label="Month Revenue" value={"\u00a5" + (overview?.monthRevenue / 100).toFixed(2)} color="blue" />
          <StatCard label="Active Subscriptions" value={overview?.activeSubscriptions ?? 0} color="purple" />
          <StatCard label="Paid Orders Today" value={overview?.ordersByStatus?.paid ?? 0} color="orange" />
        </div>

        {/* Products */}
        <h3 className="text-base font-semibold">Products</h3>
        <AdminTable
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'priceCents', label: 'Price (cents)' },
            { key: 'creditsAmount', label: 'Credits' },
            { key: 'productType', label: 'Type' },
          ]}
          data={products}
        />

        {/* Recent Transactions */}
        <h3 className="text-base font-semibold">Recent Transactions</h3>
        <AdminTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'userId', label: 'User' },
            { key: 'type', label: 'Type' },
            { key: 'amountCents', label: 'Amount' },
            { key: 'reason', label: 'Reason' },
            { key: 'createdAt', label: 'Date' },
          ]}
          data={transactions}
        />
      </div>
    </AdminLayout>
  );
}
