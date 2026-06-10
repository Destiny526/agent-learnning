'use client';

import { useRouter } from 'next/navigation';
import { useCompareStore } from '@/stores/useCompareStore';
import { generateAIRecommendInfo } from '@/lib/mock-data';
import type { Ticket } from '@/lib/mock-data';

// ── 维度颜色 ────────────────────────────────────────────────────────
const SCORE_COLORS: Record<string, { bar: string; text: string }> = {
  high:   { bar: 'bg-emerald-500', text: 'text-emerald-600 font-bold' },
  mid:    { bar: 'bg-primary-500', text: 'text-primary-600' },
  low:    { bar: 'bg-amber-500',  text: 'text-amber-600' },
  vlow:   { bar: 'bg-gray-400',   text: 'text-gray-500' },
};

function scoreColor(score: number) {
  if (score >= 85) return SCORE_COLORS.high;
  if (score >= 65) return SCORE_COLORS.mid;
  if (score >= 45) return SCORE_COLORS.low;
  return SCORE_COLORS.vlow;
}

// ── 对比表格行组件 ──────────────────────────────────────────────────
function CompareRow({
  label,
  icon,
  tickets,
  getValue,
  getBar,
}: {
  label: string;
  icon: string;
  tickets: Ticket[];
  getValue: (t: Ticket) => string;
  getBar?: (t: Ticket) => number | null;
}) {
  const values = tickets.map(getValue);
  const bars = getBar ? tickets.map(getBar) : tickets.map(() => null);
  const best = getBar
    ? Math.max(...bars.filter((b): b is number => b !== null))
    : null;

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-4 pr-4 text-sm text-gray-500 whitespace-nowrap sticky left-0 bg-white z-10">
        <span className="mr-1.5">{icon}</span>
        {label}
      </td>
      {tickets.map((t, i) => {
        const bar = bars[i];
        const color = bar !== null ? scoreColor(bar) : null;
        const isBest = bar !== null && bar === best && tickets.length > 1;
        return (
          <td key={t.id} className="py-4 px-4 text-center min-w-[160px]">
            <div className="text-sm text-gray-900 font-medium">{values[i]}</div>
            {bar !== null && color && (
              <div className="mt-2 mx-auto max-w-[120px]">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${color.bar}`}
                    style={{ width: `${bar}%` }}
                  />
                </div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className={`text-xs tabular-nums ${color.text}`}>{bar}</span>
                  {isBest && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-semibold">
                      最优
                    </span>
                  )}
                </div>
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ── 主页面 ──────────────────────────────────────────────────────────
export default function ComparePage() {
  const router = useRouter();
  const { list, remove, clear } = useCompareStore();

  if (list.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-100 flex items-center justify-center">
            <span className="text-4xl">📊</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">暂无对比方案</h2>
          <p className="text-gray-500 mb-8">在搜索结果中点击"加入对比"添加方案</p>
          <button
            onClick={() => router.push('/search')}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all"
          >
            去搜索
          </button>
        </div>
      </div>
    );
  }

  // ── AI 对比结论 ──
  const scores = list.map((t) => ({
    ticket: t,
    info: generateAIRecommendInfo(t),
  }));
  const bestOverall = scores.sort((a, b) => b.info.score - a.info.score)[0];
  const bestTime = [...list].sort((a, b) => {
    const aS = a.scoreDetails.find((d) => d.dimension === 'time')?.score || 0;
    const bS = b.scoreDetails.find((d) => d.dimension === 'time')?.score || 0;
    return bS - aS;
  })[0];
  const bestPrice = [...list].sort((a, b) => a.lowestPrice - b.lowestPrice)[0];
  const bestDuration = [...list].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
  const bestComfort = [...list].sort((a, b) => {
    const aC = a.scoreDetails.find((d) => d.dimension === 'comfort')?.score || 0;
    const bC = b.scoreDetails.find((d) => d.dimension === 'comfort')?.score || 0;
    return bC - aC;
  })[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ═══ Header ═══ */}
      <div className="bg-gradient-to-br from-[#06091a] via-[#0d1b3a] to-[#162d5a] pt-20 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 mb-5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <span>📊</span> 方案对比
              </h1>
              <p className="text-sm text-white/50 mt-1">已选 {list.length} 个方案进行对比分析</p>
            </div>
            <button
              onClick={clear}
              className="px-4 py-2 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/15 transition-colors"
            >
              清空对比
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Compare Table ═══ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10 pt-8 pb-16">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* ─── 表头：方案卡片 ─── */}
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-5 px-4 text-left sticky left-0 bg-white z-10 w-[120px]" />
                  {list.map((t) => {
                    const info = generateAIRecommendInfo(t);
                    return (
                      <th key={t.id} className="py-5 px-4 min-w-[180px]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{t.typeIcon}</span>
                            <span className="text-base font-bold text-gray-900">{t.trainNo}</span>
                          </div>
                          <span className="text-xs text-gray-400">{t.carrier}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                              info.level === 'excellent' ? 'bg-emerald-600' :
                              info.level === 'great' ? 'bg-blue-600' :
                              info.level === 'good' ? 'bg-amber-600' : 'bg-gray-500'
                            }`}
                          >
                            AI {info.score}
                          </span>
                          <button
                            onClick={() => remove(t.id)}
                            className="text-gray-300 hover:text-red-400 text-xs transition-colors mt-1"
                          >
                            移除
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* ─── 表体 ─── */}
              <tbody>
                <CompareRow
                  label="出发时间"
                  icon="🕐"
                  tickets={list}
                  getValue={(t) => `${t.departureTime} → ${t.arrivalTime}`}
                />
                <CompareRow
                  label="行程耗时"
                  icon="⏱️"
                  tickets={list}
                  getValue={(t) => t.duration}
                  getBar={(t) => {
                    const max = Math.max(...list.map((x) => x.durationMinutes));
                    return max > 0 ? Math.round(((max - t.durationMinutes) / max) * 100) : 0;
                  }}
                />
                <CompareRow
                  label="最低价格"
                  icon="💰"
                  tickets={list}
                  getValue={(t) => `¥${t.lowestPrice}`}
                  getBar={(t) => {
                    const max = Math.max(...list.map((x) => x.lowestPrice));
                    return max > 0 ? Math.round(((max - t.lowestPrice) / max) * 100) : 0;
                  }}
                />
                <CompareRow
                  label="时间匹配"
                  icon="⏰"
                  tickets={list}
                  getValue={(t) => `${t.scoreDetails.find((d) => d.dimension === 'time')?.score || 0} 分`}
                  getBar={(t) => t.scoreDetails.find((d) => d.dimension === 'time')?.score || 0}
                />
                <CompareRow
                  label="价格优势"
                  icon="🏷️"
                  tickets={list}
                  getValue={(t) => `${t.scoreDetails.find((d) => d.dimension === 'price')?.score || 0} 分`}
                  getBar={(t) => t.scoreDetails.find((d) => d.dimension === 'price')?.score || 0}
                />
                <CompareRow
                  label="舒适度"
                  icon="🛋️"
                  tickets={list}
                  getValue={(t) => `${t.scoreDetails.find((d) => d.dimension === 'comfort')?.score || 0} 分`}
                  getBar={(t) => t.scoreDetails.find((d) => d.dimension === 'comfort')?.score || 0}
                />
                <CompareRow
                  label="准点率"
                  icon="🎯"
                  tickets={list}
                  getValue={(t) => `${t.punctuality}%`}
                  getBar={(t) => t.punctuality}
                />
                <CompareRow
                  label="AI 综合分"
                  icon="🤖"
                  tickets={list}
                  getValue={(t) => `${t.score} 分`}
                  getBar={(t) => t.score}
                />
                <CompareRow
                  label="座位类型"
                  icon="💺"
                  tickets={list}
                  getValue={(t) => t.seatClasses.map((s) => s.class).join(' / ')}
                />
                <CompareRow
                  label="余票数量"
                  icon="🎫"
                  tickets={list}
                  getValue={(t) => `${t.seatClasses.reduce((s, c) => s + c.available, 0)} 张`}
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ AI 推荐结论 ═══ */}
        <div className="mt-8 bg-gradient-to-r from-ai-50 to-primary-50 rounded-2xl border border-ai-100 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-ai-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-ai-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">AI 推荐结论</h3>
              <p className="text-xs text-gray-500">基于多维度综合分析</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 综合最优 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-400 mb-1">🏆 综合最优</div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{bestOverall.ticket.typeIcon}</span>
                <span className="text-base font-bold text-gray-900">{bestOverall.ticket.trainNo}</span>
              </div>
              <div className="text-sm text-ai-600 font-semibold mt-1">{bestOverall.info.score} 分</div>
            </div>

            {/* 时间最优 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-400 mb-1">⏰ 时间最优</div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{bestTime.typeIcon}</span>
                <span className="text-base font-bold text-gray-900">{bestTime.trainNo}</span>
              </div>
              <div className="text-sm text-primary-600 font-semibold mt-1">
                {bestTime.scoreDetails.find((d) => d.dimension === 'time')?.score || 0} 分
              </div>
            </div>

            {/* 价格最优 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-400 mb-1">💰 价格最优</div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{bestPrice.typeIcon}</span>
                <span className="text-base font-bold text-gray-900">{bestPrice.trainNo}</span>
              </div>
              <div className="text-sm text-emerald-600 font-semibold mt-1">¥{bestPrice.lowestPrice}</div>
            </div>

            {/* 耗时最短 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-400 mb-1">⚡ 耗时最短</div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{bestDuration.typeIcon}</span>
                <span className="text-base font-bold text-gray-900">{bestDuration.trainNo}</span>
              </div>
              <div className="text-sm text-amber-600 font-semibold mt-1">{bestDuration.duration}</div>
            </div>

            {/* 舒适度最高 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-400 mb-1">🛋️ 舒适度最高</div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{bestComfort.typeIcon}</span>
                <span className="text-base font-bold text-gray-900">{bestComfort.trainNo}</span>
              </div>
              <div className="text-sm text-blue-600 font-semibold mt-1">
                {bestComfort.scoreDetails.find((d) => d.dimension === 'comfort')?.score || 0} 分
              </div>
            </div>
          </div>

          {/* 最终推荐 */}
          <div className="mt-6 p-4 bg-white rounded-xl border border-ai-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">✨</span>
              <div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-bold text-ai-700">综合推荐 </span>
                  <span className="font-bold text-gray-900">{bestOverall.ticket.typeIcon} {bestOverall.ticket.trainNo}</span>
                  <span className="text-gray-500">（{bestOverall.ticket.carrier}）</span>
                  — {bestOverall.info.summary}。
                  {bestPrice.id !== bestOverall.ticket.id && (
                    <span> 如预算有限，可选 <span className="font-medium text-emerald-600">{bestPrice.trainNo}</span>（¥{bestPrice.lowestPrice}）。</span>
                  )}
                  {bestDuration.id !== bestOverall.ticket.id && (
                    <span> 如赶时间，推荐 <span className="font-medium text-amber-600">{bestDuration.trainNo}</span>（{bestDuration.duration}）。</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
