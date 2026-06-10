'use client';

import type { NotificationType } from '@/lib/notifications';

interface FilterTab {
  key: NotificationType | 'all';
  label: string;
  icon: string;
}

const FILTER_TABS: FilterTab[] = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'order', label: '订单通知', icon: '🎫' },
  { key: 'favorite', label: '收藏提醒', icon: '⭐' },
  { key: 'system', label: '系统通知', icon: '📢' },
];

interface NotificationFilterProps {
  active: NotificationType | 'all';
  counts: Record<NotificationType | 'all', number>;
  onChange: (filter: NotificationType | 'all') => void;
}

export default function NotificationFilter({ active, counts, onChange }: NotificationFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scroll-container pb-1">
      {FILTER_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
            active === tab.key
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600 hover:shadow-sm'
          }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
          {counts[tab.key] > 0 && (
            <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
              active === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {counts[tab.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
