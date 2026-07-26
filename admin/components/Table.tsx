import React from 'react';

interface TableProps {
  columns: Array<{ key: string; label: string; width?: string }>;
  data: Record<string, any>[];
  onRowClick?: (row: Record<string, any>) => void;
}

export default function AdminTable({ columns, data, onRowClick }: TableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-400 text-sm">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider }>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50 transition' : ''}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {col.key === 'status' ? getStatusBadge(row[col.key]) : row[col.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getStatusBadge(status: string): React.ReactNode {
  const map: Record<string, { label: string; color: string }> = {
    active: { label: '正常', color: 'bg-green-100 text-green-700' },
    suspended: { label: '禁用', color: 'bg-red-100 text-red-700' },
    deleted: { label: '已删除', color: 'bg-gray-100 text-gray-500' },
    pending: { label: '排队中', color: 'bg-yellow-100 text-yellow-700' },
    running: { label: '执行中', color: 'bg-blue-100 text-blue-700' },
    success: { label: '成功', color: 'bg-green-100 text-green-700' },
    failed: { label: '失败', color: 'bg-red-100 text-red-700' },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
    active_user: { label: '活跃', color: 'bg-green-100 text-green-700' },
    disabled: { label: '禁用', color: 'bg-red-100 text-red-700' },
  };
  const m = map[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium }>{m.label}</span>;
}
