'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import RecommendCard from '@/components/results/RecommendCard';
import SearchResultCard from '@/components/results/SearchResultCard';
import LoadingSkeleton from '@/components/results/LoadingSkeleton';
import EmptyState from '@/components/results/EmptyState';
import { getRecommendations, type RecommendCategory, type Ticket, type PreferenceWeights } from '@/lib/mock-data';
import { useCompareStore } from '@/stores/useCompareStore';
import { usePreferenceStore, PREFERENCE_WEIGHTS } from '@/stores/usePreferenceStore';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const compareList = useCompareStore((s) => s.list);
  const removeCompare = useCompareStore((s) => s.remove);
  const clearCompare = useCompareStore((s) => s.clear);
  const { selected: prefs, loadFromStorage } = usePreferenceStore();

  const origin = searchParams.get('origin') || '北京';
  const destination = searchParams.get('destination') || '上海';
  const date = searchParams.get('date') || '2026-06-08';
  const time = searchParams.get('time') || '09:00';

  const [categories, setCategories] = useState<RecommendCategory[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Load preferences from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Calculate merged preference weights
  const prefWeights: PreferenceWeights | undefined = prefs.length > 0
    ? (() => {
        const merged = { time: 0, price: 0, duration: 0, comfort: 0 };
        for (const key of prefs) {
          const w = PREFERENCE_WEIGHTS[key];
          merged.time += w.time;
          merged.price += w.price;
          merged.duration += w.duration;
          merged.comfort += w.comfort;
        }
        const total = merged.time + merged.price + merged.duration + merged.comfort;
        return {
          time: merged.time / total,
          price: merged.price / total,
          duration: merged.duration / total,
          comfort: merged.comfort / total,
        };
      })()
    : undefined;

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const result = getRecommendations(origin, destination, date, time, prefWeights);
      setCategories(result.categories);
      setAllTickets(result.allTickets);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [origin, destination, date, time, prefWeights?.time, prefWeights?.price, prefWeights?.duration, prefWeights?.comfort]);

  const filteredTickets = activeTab === 'all' ? allTickets : allTickets.filter((t) => t.type === activeTab);

  const tabs = [
    { key: 'all', label: `全部 (${allTickets.length})` },
    { key: 'high_speed', label: `高铁/动车 (${allTickets.filter((t) => t.type === 'high_speed').length})` },
    { key: 'flight', label: `飞机 (${allTickets.filter((t) => t.type === 'flight').length})` },
    { key: 'train', label: `火车 (${allTickets.filter((t) => t.type === 'train').length})` },
  ];

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="bg-gradient-to-br from-[#06091a] via-[#0d1b3a] to-[#162d5a] pt-20 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[120px] breathe" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.push('/')} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 mb-5 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            返回首页
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{origin}</h1>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{destination}</h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {date}
              </span>
              <span className="text-white/30">|</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {time} 出发
              </span>
            </div>
          </div>

          <button onClick={() => router.push('/')} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/15 transition-colors flex items-center gap-1.5 w-fit">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            修改搜索
          </button>
        </div>
      </div>

      {/* ═══════════════ CONTENT ═══════════════ */}
      {allTickets.length === 0 ? (
        <EmptyState origin={origin} destination={destination} />
      ) : (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10 pt-8 pb-16">
          {/* ─── AI Recommendations ─── */}
          {categories.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-2.5 mb-8">
                <div className="w-9 h-9 rounded-xl bg-ai-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-ai-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">AI 推荐方案</h2>
                  <p className="text-xs text-gray-500">基于时间·价格·耗时·舒适度 4 维度评分</p>
                </div>
                {prefs.length > 0 && (
                  <button
                    onClick={() => router.push('/profile/preferences')}
                    className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ai-50 border border-ai-200 text-ai-700 text-xs font-medium hover:bg-ai-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    已启用 {prefs.length} 项偏好
                  </button>
                )}
              </div>
              <div className="space-y-8">
                {categories.map((cat, i) => (
                  <RecommendCard key={cat.key} category={cat} index={i} inView={true} date={date} weights={prefWeights} />
                ))}
              </div>
            </section>
          )}

          {/* ─── All Tickets ─── */}
          <section>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">全部车次</h2>
                <p className="text-xs text-gray-500">{filteredTickets.length} 个结果</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto scroll-container pb-1">
              {tabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.key
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600 hover:shadow-sm'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Ticket list */}
            <div className="space-y-5">
              {filteredTickets.map((ticket, i) => (
                <SearchResultCard key={ticket.id} ticket={ticket} date={date} index={i} weights={prefWeights} />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ═══ Floating Compare Bar ═══ */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in-up">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
            <div className="bg-white rounded-2xl shadow-2xl shadow-gray-900/10 border border-gray-200 p-4 flex items-center gap-4">
              {/* 已选方案 */}
              <div className="flex-1 flex items-center gap-3 overflow-x-auto scroll-container">
                <span className="text-xs text-gray-400 flex-shrink-0">已选 {compareList.length}/4</span>
                {compareList.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg flex-shrink-0">
                    <span className="text-sm">{t.typeIcon}</span>
                    <span className="text-sm font-medium text-gray-700">{t.trainNo}</span>
                    <button
                      onClick={() => removeCompare(t.id)}
                      className="w-4 h-4 rounded-full bg-gray-200 text-gray-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-xs transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={clearCompare}
                  className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  清空
                </button>
                <button
                  onClick={() => router.push('/compare')}
                  className="px-5 py-2.5 bg-gradient-to-r from-ai-600 to-primary-600 text-white text-sm font-semibold rounded-xl hover:from-ai-700 hover:to-primary-700 hover:shadow-lg hover:shadow-ai-600/25 active:scale-[0.97] transition-all"
                >
                  开始对比 →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SearchContent />
    </Suspense>
  );
}
