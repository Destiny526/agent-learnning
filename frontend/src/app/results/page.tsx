'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { useResultStore } from '@/stores/useResultStore';
import { useSearchStore } from '@/stores/useSearchStore';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import PriceTag from '@/components/common/PriceTag';
import Loading from '@/components/common/Loading';
import Empty from '@/components/common/Empty';
import Button from '@/components/common/Button';

const TYPE_LABELS: Record<string, string> = {
  train: '🚂 火车',
  high_speed: '🚄 高铁',
  flight: '✈️ 飞机',
  hotel: '🏨 酒店',
  route: '🗺️ 路线',
};

const TYPE_ORDER = ['train', 'high_speed', 'flight', 'hotel', 'route'];

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { results, activeTab, loading, error, fetchAllRecommendations, setActiveTab, addToCompare, compareList } = useResultStore();
  const { origin, destination, departureDate } = useSearchStore();

  useEffect(() => {
    const o = searchParams.get('origin');
    const d = searchParams.get('destination');
    const dt = searchParams.get('date');
    if (o && d && dt) {
      fetchAllRecommendations({
        origin: o,
        destination: d,
        departure_date: dt,
        recommendation_type: searchParams.get('type') || 'optimal',
        budget_max: searchParams.get('budgetMax') ? Number(searchParams.get('budgetMax')) : undefined,
        preferred_time: searchParams.get('preferredTime') || undefined,
        max_results: 10,
      });
    }
  }, [searchParams, fetchAllRecommendations]);

  const tabs = ['all', ...TYPE_ORDER.filter((t) => results[t]?.length)];
  const displayResults = activeTab === 'all'
    ? Object.entries(results).flatMap(([type, items]) => items.map((item) => ({ ...item, _type: type })))
    : (results[activeTab] || []).map((item) => ({ ...item, _type: activeTab }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push('/search')} className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          返回搜索
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{origin || searchParams.get('origin')} → {destination || searchParams.get('destination')}</h1>
        <p className="text-gray-500 text-sm mt-1">{departureDate || searchParams.get('date')} 出行推荐</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${activeTab === tab ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}
          >
            {tab === 'all' ? '全部' : TYPE_LABELS[tab] || tab}
            {tab !== 'all' && results[tab] && <span className="ml-1.5 text-xs opacity-75">({results[tab].length})</span>}
          </button>
        ))}
      </div>

      {/* Compare bar */}
      {compareList.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span className="text-sm text-primary-700">已选 {compareList.length} 项进行对比</span>
          <Button size="sm" onClick={() => router.push('/results#compare')}>查看对比</Button>
        </div>
      )}

      {/* Loading / Error / Empty */}
      {loading && <Loading />}
      {error && <div className="text-center text-red-500 py-8">{error}</div>}
      {!loading && !error && displayResults.length === 0 && <Empty title="暂无推荐" description="试试调整搜索条件" />}

      {/* Result Cards */}
      <div className="space-y-4">
        {displayResults.map((item) => (
          <Card key={item.item_id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Left: info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="info">{TYPE_LABELS[item._type] || item._type}</Badge>
                  {item.score >= 0.9 && <Badge variant="success">推荐</Badge>}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 truncate">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                  {item.departure_time && <span>🕐 {item.departure_time}{item.arrival_time ? ` → ${item.arrival_time}` : ''}</span>}
                  {item.duration_minutes && <span>⏱ {Math.floor(item.duration_minutes / 60)}h{item.duration_minutes % 60}m</span>}
                  {item.seat_type && <span>💺 {item.seat_type}</span>}
                  <span>⭐ {item.score.toFixed(2)}</span>
                </div>
              </div>
              {/* Right: price + actions */}
              <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-2">
                <PriceTag price={item.price} size="lg" />
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => addToCompare(item)}>
                    对比
                  </Button>
                  <Button size="sm" onClick={() => alert('下单功能开发中')}>
                    预订
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Compare Panel */}
      {compareList.length > 0 && (
        <div id="compare" className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">对比 ({compareList.length})</h2>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
              {compareList.map((item) => (
                <Card key={item.item_id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="info">{TYPE_LABELS[item.item_type] || item.item_type}</Badge>
                    <button onClick={() => useResultStore.getState().removeFromCompare(item.item_id)} className="text-gray-400 hover:text-red-500 text-lg">&times;</button>
                  </div>
                  <h4 className="font-semibold text-gray-800 text-sm truncate">{item.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <div className="flex justify-between"><span>价格</span><PriceTag price={item.price} size="sm" /></div>
                    <div className="flex justify-between"><span>评分</span><span>{item.score.toFixed(2)}</span></div>
                    {item.duration_minutes && <div className="flex justify-between"><span>耗时</span><span>{Math.floor(item.duration_minutes / 60)}h{item.duration_minutes % 60}m</span></div>}
                    {item.departure_time && <div className="flex justify-between"><span>出发</span><span>{item.departure_time}</span></div>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return <Suspense fallback={<Loading />}><ResultContent /></Suspense>;
}
