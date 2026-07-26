import React, { useState, useEffect } from "react";

interface Product { id: number; code: string; name: string; priceCents: number; creditsAmount?: number; productType: string; status: string; }
interface Order { id: number; orderNo: string; amountCents: number; status: string; createdAt: string; productName?: string; }
interface RevenueStats { todayRevenue: number; monthRevenue: number; activeSubscriptions: number; ordersByStatus: Record<string, number>; }

export const BillingAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "orders" | "revenue">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => { loadOverview(); loadProducts(); loadOrders(); }, []);

  async function loadOverview() {
    try {
      const res = await fetch("/api/admin/billing/revenue");
      const data: any = await res.json();
      setStats(data as any);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function loadProducts() {
    try {
      const res = await fetch("/api/admin/billing/products");
      const data: any = await res.json();
      setProducts(data.products || []);
    } catch (e: any) {}
  }

  async function loadOrders() {
    try {
      const db = await fetch("/api/admin/billing/transactions");
      // Reuse existing admin billing transactions endpoint
    } catch {}
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Billing & Monetization</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[["overview", "Overview"], ["products", "Products"], ["revenue", "Revenue"]].map(([k, label]) => (
          <button key={k} onClick={() => setActiveTab(k as any)} className={`px-4 py-2 rounded-t-lg ${activeTab === k ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {activeTab === "overview" && stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Today Revenue", value: `\u00a5${(stats.todayRevenue / 100).toFixed(2)}` },
            { label: "Month Revenue", value: `\u00a5${(stats.monthRevenue / 100).toFixed(2)}` },
            { label: "Active Subscriptions", value: stats.activeSubscriptions },
            { label: "Paid Orders Today", value: stats.ordersByStatus?.paid || 0 },
          ].map((card, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <div className="text-sm text-gray-500">{card.label}</div>
              <div className="text-2xl font-bold mt-1">{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "products" && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price (\u00a5)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4 text-sm font-mono">{p.code}</td>
                  <td className="px-6 py-4 text-sm">{p.name}</td>
                  <td className="px-6 py-4 text-sm">\u00a5{(p.priceCents / 100).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">{p.creditsAmount ?? "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${p.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100"}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <div className="p-8 text-center text-gray-400">No products configured</div>}
        </div>
      )}

      {activeTab === "revenue" && stats && (
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h3 className="font-semibold mb-4">Daily Breakdown</h3>
          <div className="space-y-2">
            {((stats as any).dailyBreakdown || []).map((d, i) => (
              <div key={i} className="flex justify-between py-2 border-b">
                <span className="capitalize text-gray-700">{d.txType}: {d.count} transactions</span>
                <span className="font-mono">\u00a5{(d.totalCents / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

