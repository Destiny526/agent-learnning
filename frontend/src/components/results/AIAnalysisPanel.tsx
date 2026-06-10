'use client';

import { useState } from 'react';
import type { Ticket, ScoreDetail, PreferenceWeights } from '@/lib/mock-data';
import { generateAIRecommendInfo } from '@/lib/mock-data';

interface Props {
  ticket: Ticket;
  className?: string;
  weights?: PreferenceWeights;
}

// ── Analysis generators ─────────────────────────────────────────────

interface AnalysisItem {
  icon: string;
  label: string;
  score: number;
  summary: string;
  details: string[];
  highlight: boolean;
}

function analyzeTime(ticket: Ticket, detail: ScoreDetail): AnalysisItem {
  const score = detail.score;
  const details: string[] = [];

  details.push(`出发时间 ${ticket.departureTime}，到达时间 ${ticket.arrivalTime}`);
  details.push(`全程耗时 ${ticket.duration}（${ticket.durationMinutes} 分钟）`);

  if (score >= 85) {
    details.push('出发时间与期望高度匹配，无需早起或长时间等待');
  } else if (score >= 70) {
    details.push('出发时间较为合适，略有偏差但可接受');
  } else if (score >= 50) {
    details.push('出发时间有一定偏差，可能需要调整作息');
  } else {
    details.push('出发时间与期望差距较大，建议考虑其他车次');
  }

  if (ticket.type === 'high_speed' && ticket.durationMinutes < 300) {
    details.push('高铁短途出行，时间利用率高');
  }
  if (ticket.type === 'flight' && ticket.durationMinutes < 180) {
    details.push('航班耗时短，适合赶时间旅客');
  }

  return {
    icon: '⏰',
    label: '时间优势',
    score,
    summary: score >= 85 ? '时间非常合适' : score >= 70 ? '时间较为合适' : score >= 50 ? '时间尚可' : '时间不太理想',
    details,
    highlight: score >= 85,
  };
}

function analyzePrice(ticket: Ticket, detail: ScoreDetail): AnalysisItem {
  const score = detail.score;
  const details: string[] = [];

  details.push(`最低票价 ¥${ticket.lowestPrice}（${ticket.seatClasses[ticket.seatClasses.length - 1]?.class}）`);

  if (ticket.seatClasses.length > 1) {
    const allPrices = ticket.seatClasses.map((s) => `${s.class} ¥${s.price}`).join('、');
    details.push(`可选座位：${allPrices}`);
  }

  if (score >= 90) {
    details.push('价格极具竞争力，性价比极高');
  } else if (score >= 70) {
    details.push('价格合理，性价比良好');
  } else if (score >= 50) {
    details.push('价格适中，可根据预算选择');
  } else {
    details.push('价格偏高，建议关注折扣或选择其他方案');
  }

  const avgPrice = ticket.seatClasses.reduce((s, c) => s + c.price, 0) / ticket.seatClasses.length;
  if (avgPrice > 1000) {
    details.push('高端出行方案，适合商务或特殊需求');
  }

  return {
    icon: '💰',
    label: '价格优势',
    score,
    summary: score >= 90 ? '价格最优' : score >= 70 ? '价格合理' : score >= 50 ? '价格适中' : '价格偏高',
    details,
    highlight: score >= 90,
  };
}

function analyzePunctuality(ticket: Ticket): AnalysisItem {
  const p = ticket.punctuality;
  const details: string[] = [];

  details.push(`历史准点率 ${p}%`);

  if (p >= 95) {
    details.push('准点率极高，几乎不会延误');
    details.push('适合有重要行程的旅客');
  } else if (p >= 90) {
    details.push('准点率较高，延误概率很小');
    details.push('可以放心选择');
  } else if (p >= 85) {
    details.push('准点率一般，偶有延误情况');
    details.push('建议预留一定缓冲时间');
  } else {
    details.push('准点率偏低，延误风险较高');
    details.push('如行程紧凑，建议选择其他方案');
  }

  if (ticket.type === 'flight') {
    details.push('航班受天气影响较大，请关注出发日天气');
  }
  if (ticket.type === 'high_speed') {
    details.push('高铁准点率通常较高，受天气影响较小');
  }

  return {
    icon: '🎯',
    label: '准点率分析',
    score: p,
    summary: p >= 95 ? '准点率极高' : p >= 90 ? '准点率较高' : p >= 85 ? '准点率一般' : '准点率偏低',
    details,
    highlight: p >= 95,
  };
}

// ── Analysis Card ───────────────────────────────────────────────────

function AnalysisCard({ item, defaultOpen = false }: { item: AnalysisItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const color = item.score >= 85 ? 'emerald' : item.score >= 70 ? 'blue' : item.score >= 50 ? 'amber' : 'gray';

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      open
        ? `bg-${color}-50 border-${color}-200`
        : 'bg-white border-gray-100 hover:border-gray-200'
    }`}
      // Inline styles as fallback for dynamic Tailwind classes
      style={open ? {
        backgroundColor: color === 'emerald' ? '#ecfdf5' : color === 'blue' ? '#eff6ff' : color === 'amber' ? '#fffbeb' : '#f9fafb',
        borderColor: color === 'emerald' ? '#a7f3d0' : color === 'blue' ? '#bfdbfe' : color === 'amber' ? '#fde68a' : '#e5e7eb',
      } : undefined}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: color === 'emerald' ? '#d1fae5' : color === 'blue' ? '#dbeafe' : color === 'amber' ? '#fef3c7' : '#f3f4f6',
          }}
        >
          <span className="text-base">{item.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{item.label}</span>
            {item.highlight && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white"
                style={{
                  backgroundColor: color === 'emerald' ? '#059669' : color === 'blue' ? '#2563eb' : color === 'amber' ? '#d97706' : '#6b7280',
                }}
              >
                亮点
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{item.summary}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-base font-bold tabular-nums"
            style={{
              color: color === 'emerald' ? '#059669' : color === 'blue' ? '#2563eb' : color === 'amber' ? '#d97706' : '#6b7280',
            }}
          >
            {item.score}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-12 space-y-2">
            {item.details.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{
                    backgroundColor: color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : color === 'amber' ? '#f59e0b' : '#9ca3af',
                  }}
                />
                <span className="text-xs text-gray-600 leading-relaxed">{d}</span>
              </div>
            ))}
          </div>

          {/* Score bar */}
          <div className="ml-12 mt-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${item.score}%`,
                  backgroundColor: color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : color === 'amber' ? '#f59e0b' : '#9ca3af',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function AIAnalysisPanel({ ticket, className = '', weights }: Props) {
  const [expanded, setExpanded] = useState(false);
  const aiInfo = generateAIRecommendInfo(ticket, weights);

  const timeDetail = ticket.scoreDetails.find((d) => d.dimension === 'time')!;
  const priceDetail = ticket.scoreDetails.find((d) => d.dimension === 'price')!;

  const analyses: AnalysisItem[] = [
    analyzeTime(ticket, timeDetail),
    analyzePrice(ticket, priceDetail),
    analyzePunctuality(ticket),
  ];

  return (
    <div className={`rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ai-500 to-primary-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">AI 推荐分析</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white bg-ai-600">
              {aiInfo.score}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{aiInfo.summary}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-gray-400">{expanded ? '收起' : '展开'}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2.5 animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
          {/* Recommendation tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {aiInfo.tags.slice(0, 5).map((tag, i) => (
              <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                tag.highlight
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-white text-gray-600 border border-gray-100'
              }`}>
                <span>{tag.icon}</span>
                {tag.label}
              </span>
            ))}
          </div>

          {/* Analysis cards */}
          {analyses.map((item, i) => (
            <AnalysisCard key={i} item={item} defaultOpen={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
