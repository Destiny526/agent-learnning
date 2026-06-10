'use client';

import type { ScoreDetail } from '@/lib/mock-data';

interface Props {
  score: number;
  details: ScoreDetail[];
  compact?: boolean;
}

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score / 20);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= stars ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ScorePanel({ score, details, compact = false }: Props) {
  return (
    <div className={compact ? '' : 'lg:w-60 flex-shrink-0'}>
      {/* Big score */}
      <div className={`flex ${compact ? 'items-center gap-2' : 'flex-col items-center lg:items-end gap-1'} mb-3`}>
        <div className={`${compact ? 'text-2xl' : 'text-4xl'} font-extrabold text-primary-600 tabular-nums leading-none`}>
          {score}
        </div>
        <div className={compact ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>AI 评分</div>
        <StarRating score={score} />
      </div>

      {/* Score bars */}
      <div className={`space-y-2 ${compact ? '' : 'w-full'}`}>
        {details.map((d) => (
          <div key={d.dimension} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-10 flex-shrink-0">{d.label}</span>
            <div className={`flex-1 ${compact ? 'h-2' : 'h-2.5'} bg-gray-100 rounded-full overflow-hidden`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  d.score >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                  d.score >= 60 ? 'bg-gradient-to-r from-primary-500 to-primary-400' :
                  d.score >= 40 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                  'bg-gradient-to-r from-gray-400 to-gray-300'
                }`}
                style={{ width: `${d.score}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-6 text-right tabular-nums">{d.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
