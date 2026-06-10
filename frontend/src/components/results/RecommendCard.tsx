'use client';

import { useRouter } from 'next/navigation';
import type { RecommendCategory, PreferenceWeights } from '@/lib/mock-data';
import { generateAIRecommendInfo } from '@/lib/mock-data';
import { useCompareStore } from '@/stores/useCompareStore';
import ScorePanel from './ScorePanel';
import AIAnalysisPanel from './AIAnalysisPanel';

interface Props {
  category: RecommendCategory;
  index: number;
  inView: boolean;
  date?: string;
  weights?: PreferenceWeights;
}

export default function RecommendCard({ category, index, inView, date, weights }: Props) {
  const router = useRouter();
  const { ticket } = category;
  const aiInfo = generateAIRecommendInfo(ticket, weights);
  const addToCompare = useCompareStore((s) => s.add);
  const isCompared = useCompareStore((s) => s.has(ticket.id));

  const handleClick = () => {
    const params = new URLSearchParams({ date: date || ticket.departureDate });
    router.push(`/route/${ticket.id}?${params.toString()}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`group bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-gray-200/60 hover:border-gray-200 hover:-translate-y-1 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Gradient top bar */}
      <div className={`h-1.5 bg-gradient-to-r ${category.gradient}`} />

      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ═══ LEFT: Trip Info ═══ */}
          <div className="flex-1 min-w-0">
            {/* Category label */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{category.icon}</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{category.label}</h3>
                <p className="text-xs text-gray-500">{category.sublabel}</p>
              </div>
              <span className="ml-auto px-3 py-1 rounded-lg bg-gray-50 text-sm font-bold text-gray-700 tabular-nums">
                {ticket.score}分
              </span>
            </div>

            {/* Train info */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-lg">{ticket.typeIcon}</span>
              <span className="text-base font-bold text-gray-900">{ticket.trainNo}</span>
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-600">{ticket.typeLabel}</span>
              <span className="text-sm text-gray-400">{ticket.carrier}</span>
            </div>

            {/* Time line */}
            <div className="flex items-center gap-5 mb-5">
              <div className="text-center min-w-[80px]">
                <div className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{ticket.departureTime}</div>
                <div className="text-xs text-gray-500 mt-1">{ticket.originStation}</div>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1.5 py-1">
                <div className="text-sm font-medium text-primary-600">{ticket.duration}</div>
                <div className="w-full h-px bg-gray-200 relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white shadow-sm" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary-500 border-2 border-white shadow-sm" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="text-sm">{ticket.type === 'high_speed' ? '🚄' : ticket.type === 'flight' ? '✈️' : '🚂'}</span>
                  </div>
                </div>
                <div className="text-[11px] text-gray-400">{ticket.punctuality}% 准点率</div>
              </div>
              <div className="text-center min-w-[80px]">
                <div className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{ticket.arrivalTime}</div>
                <div className="text-xs text-gray-500 mt-1">{ticket.destinationStation}</div>
              </div>
            </div>

            {/* AI Analysis Panel */}
            <AIAnalysisPanel ticket={ticket} weights={weights} />
          </div>

          {/* ═══ RIGHT: Score + Price + CTA ═══ */}
          <div className="lg:w-64 flex-shrink-0 flex flex-row lg:flex-col items-center lg:items-end gap-5 lg:gap-4 pt-0 lg:pt-2 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-6">
            {/* Score */}
            <div className="flex-1 lg:w-full">
              <ScorePanel score={ticket.score} details={ticket.scoreDetails} compact />
            </div>

            {/* Price */}
            <div className="text-right">
              <div className="flex items-baseline gap-0.5">
                <span className="text-sm text-gray-400">¥</span>
                <span className="text-4xl font-bold text-primary-600 tabular-nums leading-none">{ticket.lowestPrice}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{ticket.seatClasses[ticket.seatClasses.length - 1]?.class}</div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 w-full lg:w-auto">
              <div className="w-full lg:w-44 px-5 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl group-hover:from-primary-700 group-hover:to-primary-600 group-hover:shadow-lg group-hover:shadow-primary-600/25 transition-all text-sm text-center">
                查看详情
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToCompare(ticket);
                }}
                className={`w-full lg:w-44 px-5 py-2.5 font-medium rounded-xl border active:scale-[0.97] transition-all text-sm text-center ${
                  isCompared
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-white text-primary-600 border-primary-200 hover:bg-primary-50 hover:border-primary-300'
                }`}
              >
                {isCompared ? '✓ 已加入' : '加入对比'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
