'use client';

import { useRouter } from 'next/navigation';

interface Props {
  origin?: string;
  destination?: string;
}

export default function EmptyState({ origin, destination }: Props) {
  const router = useRouter();

  return (
    <div className="max-w-6xl mx-auto px-4 py-24 text-center">
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🚄</span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">未找到符合条件的行程</h3>
        <p className="text-sm text-gray-500 mb-2">
          {origin && destination
            ? `暂无 ${origin} → ${destination} 的行程数据`
            : '暂无匹配的行程数据'}
        </p>
        <p className="text-xs text-gray-400 mb-8">试试调整日期或出发时间</p>

        {/* Action */}
        <button
          onClick={() => router.push('/')}
          className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 active:scale-[0.97] transition-all shadow-lg shadow-primary-600/20 inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          重新搜索
        </button>
      </div>
    </div>
  );
}
