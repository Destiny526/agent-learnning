'use client';

export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-gradient-to-br from-[#06091a] via-[#0d1b3a] to-[#162d5a] pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-4 w-16 bg-white/10 rounded mb-5 animate-pulse" />
          <div className="flex items-center gap-3 mb-5">
            <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
            <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10 pt-8 pb-16">
        {/* Loading indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-white rounded-2xl shadow-sm border border-gray-100">
            <svg className="w-5 h-5 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-gray-900">AI 正在分析最优方案...</div>
              <div className="text-xs text-gray-500">正在从 12306 获取实时数据并计算推荐</div>
            </div>
          </div>
        </div>

        {/* Recommendation card skeletons */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-5 w-24 bg-gray-100 rounded animate-pulse" />
        </div>

        <div className="space-y-8 mb-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              {/* Top bar */}
              <div className="h-1 w-full bg-gray-100 rounded mb-5" />

              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Left */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded" />
                    <div className="space-y-1">
                      <div className="h-4 w-28 bg-gray-100 rounded" />
                      <div className="h-3 w-40 bg-gray-50 rounded" />
                    </div>
                    <div className="ml-auto h-6 w-12 bg-gray-100 rounded-lg" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-10 bg-gray-100 rounded" />
                    <div className="h-4 w-8 bg-gray-50 rounded" />
                    <div className="h-4 w-16 bg-gray-50 rounded" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-16 bg-gray-100 rounded" />
                    <div className="flex-1 h-px bg-gray-100" />
                    <div className="h-8 w-16 bg-gray-100 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-7 w-28 bg-gray-50 rounded-lg" />
                    <div className="h-7 w-32 bg-gray-50 rounded-lg" />
                    <div className="h-7 w-24 bg-gray-50 rounded-lg" />
                  </div>
                </div>

                {/* Right */}
                <div className="lg:w-60 space-y-3">
                  <div className="flex justify-end">
                    <div className="h-10 w-12 bg-gray-100 rounded" />
                  </div>
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="h-3 w-10 bg-gray-50 rounded" />
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full" />
                      <div className="h-3 w-5 bg-gray-50 rounded" />
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <div className="h-4 w-10 bg-gray-100 rounded" />
                  </div>
                  <div className="h-10 w-full bg-gray-100 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab skeleton */}
        <div className="flex gap-2 mb-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* List skeletons */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-20 bg-gray-100 rounded" />
                  <div className="h-3 w-32 bg-gray-50 rounded" />
                </div>
                <div className="h-8 w-16 bg-gray-100 rounded" />
                <div className="flex-1 h-px bg-gray-100" />
                <div className="h-8 w-16 bg-gray-100 rounded" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
                <div className="h-6 w-12 bg-gray-100 rounded" />
                <div className="h-10 w-16 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
