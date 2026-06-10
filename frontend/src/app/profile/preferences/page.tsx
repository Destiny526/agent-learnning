'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePreferenceStore, PREFERENCE_OPTIONS, PREFERENCE_WEIGHTS } from '@/stores/usePreferenceStore';
import type { PreferenceKey } from '@/stores/usePreferenceStore';

export default function PreferencesPage() {
  const router = useRouter();
  const { selected, toggle, clear, loadFromStorage } = usePreferenceStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ═══ Header ═══ */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-20" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 mb-5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回个人中心
          </button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">出行偏好设置</h1>
              <p className="text-sm text-white/50 mt-1">选择最多 3 项偏好，AI 将据此优化推荐</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-5 relative z-10 pb-16">

        {/* Selection counter */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">已选</span>
            <span className={`text-sm font-bold tabular-nums ${selected.length > 0 ? 'text-primary-600' : 'text-gray-400'}`}>
              {selected.length}
            </span>
            <span className="text-sm text-gray-500">/ 3 项</span>
          </div>
          {selected.length > 0 && (
            <button
              onClick={clear}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              清空选择
            </button>
          )}
        </div>

        {/* Preference Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {PREFERENCE_OPTIONS.map((pref) => {
            const isSelected = selected.includes(pref.key);
            const idx = selected.indexOf(pref.key);

            return (
              <button
                key={pref.key}
                onClick={() => toggle(pref.key)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                  isSelected
                    ? `${pref.bgColor} ${pref.borderColor} shadow-md`
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                {/* Selection badge */}
                {isSelected && (
                  <div className={`absolute top-3 right-3 w-6 h-6 rounded-full ${pref.borderColor} border-2 flex items-center justify-center`}>
                    <span className={`text-xs font-bold ${pref.color}`}>{idx + 1}</span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-white/80' : 'bg-gray-50'
                  }`}>
                    <span className="text-2xl">{pref.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold ${isSelected ? pref.color : 'text-gray-900'}`}>
                        {pref.label}
                      </span>
                      {isSelected && (
                        <svg className={`w-4 h-4 ${pref.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${isSelected ? 'text-gray-600' : 'text-gray-400'}`}>
                      {pref.description}
                    </p>
                  </div>
                </div>

                {/* Weight preview */}
                {isSelected && (
                  <div className="mt-4 pt-3 border-t border-gray-100/80">
                    <div className="flex gap-3">
                      {(['time', 'price', 'duration', 'comfort'] as const).map((dim) => {
                        const w = PREFERENCE_WEIGHTS[pref.key][dim];
                        const labels = { time: '时间', price: '价格', duration: '耗时', comfort: '舒适' };
                        return (
                          <div key={dim} className="flex-1 text-center">
                            <div className="text-[10px] text-gray-400 mb-1">{labels[dim]}</div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary-500 transition-all duration-300"
                                style={{ width: `${w * 100}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 tabular-nums">{Math.round(w * 100)}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* AI Weight Summary */}
        {selected.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-ai-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-ai-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">AI 综合权重</h3>
                <p className="text-xs text-gray-500">根据你的偏好自动调整评分权重</p>
              </div>
            </div>

            {(() => {
              // Calculate merged weights
              const merged = { time: 0, price: 0, duration: 0, comfort: 0 };
              for (const key of selected) {
                const w = PREFERENCE_WEIGHTS[key];
                merged.time += w.time;
                merged.price += w.price;
                merged.duration += w.duration;
                merged.comfort += w.comfort;
              }
              const total = merged.time + merged.price + merged.duration + merged.comfort;
              const normalized = {
                time: merged.time / total,
                price: merged.price / total,
                duration: merged.duration / total,
                comfort: merged.comfort / total,
              };

              const dims = [
                { key: 'time' as const, label: '时间匹配', icon: '⏰', color: '#3b82f6' },
                { key: 'price' as const, label: '价格优势', icon: '💰', color: '#10b981' },
                { key: 'duration' as const, label: '耗时最短', icon: '⚡', color: '#f59e0b' },
                { key: 'comfort' as const, label: '舒适度', icon: '🛋️', color: '#8b5cf6' },
              ];

              return (
                <div className="grid grid-cols-4 gap-4">
                  {dims.map((d) => (
                    <div key={d.key} className="text-center">
                      <div className="text-lg mb-1">{d.icon}</div>
                      <div className="text-xs text-gray-500 mb-2">{d.label}</div>
                      <div className="h-20 bg-gray-50 rounded-xl relative overflow-hidden flex items-end justify-center p-2">
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-500"
                          style={{
                            height: `${normalized[d.key] * 100}%`,
                            backgroundColor: d.color,
                            opacity: 0.2,
                          }}
                        />
                        <span className="relative text-sm font-bold tabular-nums" style={{ color: d.color }}>
                          {Math.round(normalized[d.key] * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <p className="text-xs text-gray-400 mt-4 text-center">
              权重将自动应用到搜索结果的 AI 推荐排序中
            </p>
          </div>
        )}

        {/* Save indicator */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            偏好设置自动保存到本地
          </p>
        </div>
      </div>
    </div>
  );
}
