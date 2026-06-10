'use client';

import { useState } from 'react';

export interface AIRecommendInfo {
  score: number;           // AI 推荐指数 0-10
  level: 'excellent' | 'great' | 'good' | 'fair';  // 推荐等级
  tags: AIRecommendTag[];
  summary: string;         // 一句话总结
}

export interface AIRecommendTag {
  icon: string;
  label: string;
  highlight?: boolean;     // 是否为主要亮点
}

interface Props {
  info: AIRecommendInfo;
  compact?: boolean;
}

const LEVEL_CONFIG = {
  excellent: {
    label: '强烈推荐',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    ring: 'ring-emerald-100',
    scoreBg: 'from-emerald-500 to-emerald-400',
    glow: 'shadow-emerald-500/20',
    badge: 'bg-emerald-600',
  },
  great: {
    label: '优先推荐',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    ring: 'ring-blue-100',
    scoreBg: 'from-blue-500 to-blue-400',
    glow: 'shadow-blue-500/20',
    badge: 'bg-blue-600',
  },
  good: {
    label: '推荐',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    ring: 'ring-amber-100',
    scoreBg: 'from-amber-500 to-amber-400',
    glow: 'shadow-amber-500/20',
    badge: 'bg-amber-600',
  },
  fair: {
    label: '可选',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    ring: 'ring-gray-100',
    scoreBg: 'from-gray-500 to-gray-400',
    glow: 'shadow-gray-500/20',
    badge: 'bg-gray-500',
  },
};

function ScoreRing({ score, level }: { score: number; level: AIRecommendInfo['level'] }) {
  const config = LEVEL_CONFIG[level];
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 10) * circumference;

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
          className="text-gray-100" />
        <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4" strokeLinecap="round"
          className={`${level === 'excellent' ? 'stroke-emerald-500' : level === 'great' ? 'stroke-blue-500' : level === 'good' ? 'stroke-amber-500' : 'stroke-gray-400'}`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold text-gray-900 tabular-nums leading-none">{score}</span>
        <span className="text-[9px] text-gray-400 mt-0.5">推荐指数</span>
      </div>
    </div>
  );
}

function ReasonTag({ tag, highlight }: { tag: AIRecommendTag; highlight?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      highlight
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm shadow-emerald-100/50'
        : 'bg-gray-50 text-gray-600 border border-gray-100'
    }`}>
      <span className="text-sm leading-none">{tag.icon}</span>
      {tag.label}
    </span>
  );
}

export default function AIRecommendBadge({ info, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const config = LEVEL_CONFIG[info.level];
  const maxTags = compact ? 3 : 4;
  const showTags = expanded ? info.tags : info.tags.slice(0, maxTags);
  const hasMore = info.tags.length > maxTags;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${config.bg} border ${config.border} transition-all`}>
        <ScoreRing score={info.score} level={info.level} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs font-bold ${config.color} px-2 py-0.5 rounded-md ${config.badge} text-white`}>
              AI {config.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-1">{info.summary}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {showTags.map((tag, i) => (
              <ReasonTag key={i} tag={tag} highlight={tag.highlight} />
            ))}
            {hasMore && !expanded && (
              <button onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                +{info.tags.length - maxTags}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl ${config.bg} border ${config.border} p-5 ring-1 ${config.ring}`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <ScoreRing score={info.score} level={info.level} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold ${config.color} px-2.5 py-1 rounded-lg ${config.badge} text-white`}>
              AI {config.label}
            </span>
            <span className="text-[11px] text-gray-400">推荐指数 {info.score}/10</span>
          </div>
          <p className="text-sm text-gray-600">{info.summary}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {showTags.map((tag, i) => (
          <ReasonTag key={i} tag={tag} highlight={tag.highlight} />
        ))}
      </div>

      {hasMore && (
        <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
          {expanded ? '收起' : `展开全部 ${info.tags.length} 项`}
          <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}
