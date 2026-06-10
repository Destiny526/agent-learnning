'use client';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
        <span className="text-4xl">🔔</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无通知</h3>
      <p className="text-sm text-gray-500 max-w-xs">
        当有新的订单、收藏提醒或系统消息时，会在这里显示
      </p>
    </div>
  );
}
