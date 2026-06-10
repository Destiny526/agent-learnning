'use client';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
      <div className="flex gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-32 h-4 bg-gray-200 rounded" />
            <div className="w-10 h-4 bg-gray-100 rounded" />
          </div>
          <div className="w-full h-3 bg-gray-100 rounded" />
          <div className="w-3/4 h-3 bg-gray-100 rounded" />
          <div className="flex gap-3">
            <div className="w-16 h-3 bg-gray-100 rounded" />
            <div className="w-10 h-3 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
