import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/Layout';
import AdminTable from '../components/Table';
import type { AdminUserItem } from '../types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [detailUser, setDetailUser] = useState<AdminUserItem | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    const params = filterType ? ?type= : '';
    fetch(/api/admin/users)
      .then(r => r.json())
      .then(d => { if (d.success) setUsers(d.data || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [filterType]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    await fetch(/api/admin/users//role, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole }) });
    fetchUsers();
  };

  const columns = [
    { key: 'id', label: '用户ID', width: 'w-48' },
    { key: 'nickname', label: '昵称' },
    { key: 'type', label: '类型' },
    { key: 'role', label: '角色' },
    { key: 'status', label: '状态' },
    { key: 'createdAt', label: '注册时间' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">全部类型</option>
            <option value="guest">游客</option>
            <option value="wechat">微信用户</option>
            <option value="user">注册用户</option>
          </select>
          <button onClick={fetchUsers} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">刷新</button>
        </div>

        {detailUser && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex justify-between">
              <h4 className="font-semibold text-blue-900">用户详情</h4>
              <button onClick={() => setDetailUser(null)} className="text-blue-600 hover:text-blue-800">✕</button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <p><strong>ID:</strong> {detailUser.id}</p>
              <p><strong>昵称:</strong> {detailUser.nickname || '-'}</p>
              <p><strong>类型:</strong> {detailUser.type}</p>
              <p><strong>角色:</strong> {detailUser.role}</p>
              <p><strong>状态:</strong> {detailUser.status}</p>
              <p><strong>注册时间:</strong> {detailUser.createdAt}</p>
            </div>
            <div className="mt-3 flex gap-2">
              <label className="text-sm text-gray-600">修改角色:</label>
              <select defaultValue={detailUser.role} onChange={e => handleRoleChange(detailUser.id, e.target.value)} className="border rounded px-2 py-1 text-sm">
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
                <option value="super_admin">超级管理员</option>
              </select>
            </div>
          </div>
        )}

        <AdminTable columns={columns} data={users} onRowClick={(row) => setDetailUser(row)} />
      </div>
    </AdminLayout>
  );
}
