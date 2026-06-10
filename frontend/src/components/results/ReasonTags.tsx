'use client';

interface Props {
  reasons: string[];
  max?: number;
}

export default function ReasonTags({ reasons, max = 4 }: Props) {
  const displayed = reasons.slice(0, max);
  return (
    <div className="flex flex-wrap gap-2">
      {displayed.map((reason, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-xs font-medium text-emerald-700 border border-emerald-100">
          <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {reason}
        </span>
      ))}
    </div>
  );
}
