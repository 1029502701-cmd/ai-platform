import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'gray';
  icon?: string;
}

const COLOR_MAP: Record<string, { bg: string; text: string; iconBg: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
  green: { bg: 'bg-green-50', text: 'text-green-700', iconBg: 'bg-green-100' },
  red: { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-700', iconBg: 'bg-gray-100' },
};

export default function StatCard({ label, value, unit, color = 'blue', icon }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        {icon && <span className={inline-flex items-center justify-center w-8 h-8 rounded-lg  text-lg}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={	ext-2xl font-bold }>{typeof value === 'number' ? (value >= 10000 ? (value / 10000).toFixed(1) + 'w' : value.toLocaleString()) : value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}
