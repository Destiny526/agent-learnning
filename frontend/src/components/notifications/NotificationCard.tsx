'use client';

import type { Notification, NotificationType } from '@/lib/notifications';

// ---------- 类型配置 ----------

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  order: {
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    color: 'text-primary-600',
    bg: 'bg-primary-50',
    label: '订单',
  },
  favorite: {
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    label: '收藏',
  },
  system: {
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    label: '系统',
  },
};

// ---------- 时间格式化 ----------

function formatTime(dateStr: string): string {
  const now = Date.now();
  const time = new Date(dateStr).getTime();
  const diff = now - time;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;

  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// ---------- 通知卡片组件 ----------

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  index?: number;
}

export default function NotificationCard({ notification, onMarkRead, onDelete, index = 0 }: NotificationCardProps) {
  const config = TYPE_CONFIG[notification.type];
  const isUnread = !notification.is_read;

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 animate-fade-in-up ${
        isUnread
          ? 'bg-white border-primary-100 shadow-md shadow-primary-50 hover:shadow-lg hover:shadow-primary-100/50'
          : 'bg-white border-gray-100 hover:shadow-md hover:border-gray-200'
      }`}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
    >
      {/* 未读标记 */}
      {isUnread && (
        <div className="absolute top-5 left-0 w-1 h-8 bg-primary-500 rounded-r-full" />
      )}

      <div className="p-5">
        <div className="flex gap-4">
          {/* 图标 */}
          <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
            {config.icon}
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className={`text-sm font-semibold truncate ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                  {notification.title}
                </h3>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
                {isUnread && (
                  <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                {formatTime(notification.created_at)}
              </span>
            </div>

            <p className={`text-sm leading-relaxed ${isUnread ? 'text-gray-600' : 'text-gray-400'}`}>
              {notification.content}
            </p>

            {/* 操作按钮 */}
            <div className="flex items-center gap-3 mt-3">
              {isUnread && (
                <button
                  onClick={() => onMarkRead(notification.id)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  标为已读
                </button>
              )}
              <button
                onClick={() => onDelete(notification.id)}
                className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
