import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/Layout';
import AdminTable from '../components/Table';
import StatCard from '../components/StatCard';
import type { AdminTaskItem } from '../types';

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [taskStats, setTaskStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(selectedStatus ? '/api/admin/tasks/list?status=' + selectedStatus : '/api/admin/tasks/list'),
        fetch('/api/admin/tasks/stats'),
      ]);
      const tData = await tRes.json();
      const sData = await sRes.json();
      if (tData.success) setTasks(tData.data || []);
      if (sData.success) setTaskStats(sData.data || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selectedStatus]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="总计任务" value={taskStats.total ?? 0} color="blue" icon="S-KEYBOARD"/>
          <StatCard label="排队中" value={taskStats.pending ?? 0} color="amber" icon="S-TIME"/>
          <StatCard label="执行中" value={taskStats.running ?? 0} color="purple" icon="S-REFRESH"/>
          <StatCard label="成功" value={taskStats.success ?? 0} color="green" icon="S-CHECK"/>
          <StatCard label="失败" value={taskStats.failed ?? 0} color="red" icon="S-X"/>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">全部状态</option>
            <option value="pending">排队中</option>
            <option value="running">执行中</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
          </select>
          <button onClick={fetchData} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">刷新</button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : (
          <AdminTable
            columns={[
              { key: 'id', label: '任务ID', width: 'w-48' },
              { key: 'type', label: '类型' },
              { key: 'status', label: '状态' },
              { key: 'priority', label: '优先级' },
              { key: 'retry_count', label: '重试次数' },
              { key: 'created_at', label: '创建时间' },
              { key: 'finished_at', label: '完成时间' },
            ]}
            data={tasks}
            onRowClick={(row: any) => {
              if (row.last_error) alert('错误日志: ' + row.last_error);
              else if (row.result) alert('结果预览: ' + JSON.stringify(row.result).slice(0, 200));
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
