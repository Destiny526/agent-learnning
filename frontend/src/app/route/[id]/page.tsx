'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { getTicketById, type Ticket, type ScoreDetail, type SeatClass } from '@/lib/mock-data';

// ── Types ──────────────────────────────────────────────────────────

interface SeatCardProps {
  seat: SeatClass;
  selected: boolean;
  isLowest: boolean;
  onClick: () => void;
}

interface SelectedSeatState {
  className: string;
  price: number;
  available: number;
}

// ── Components ─────────────────────────────────────────────────────

function ScoreBar({ detail }: { detail: ScoreDetail }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-16 pt-0.5">
        <span className="text-xs font-medium text-gray-600">{detail.label}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                detail.score >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                detail.score >= 60 ? 'bg-gradient-to-r from-primary-500 to-primary-400' :
                detail.score >= 40 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                'bg-gradient-to-r from-gray-400 to-gray-300'
              }`}
              style={{ width: `${detail.score}%` }}
            />
          </div>
          <span className="text-sm font-bold text-gray-900 tabular-nums w-8 text-right">{detail.score}</span>
        </div>
        <p className="text-xs text-gray-500">{detail.reason}</p>
      </div>
    </div>
  );
}

function SeatCard({ seat, selected, isLowest, onClick }: SeatCardProps) {
  const soldOut = seat.available === 0;

  return (
    <button
      onClick={soldOut ? undefined : onClick}
      disabled={soldOut}
      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 text-left ${
        soldOut
          ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
          : selected
            ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100 ring-1 ring-primary-200'
            : 'border-gray-100 bg-white hover:border-primary-200 hover:shadow-sm cursor-pointer'
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          {/* Radio indicator */}
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            selected ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
          }`}>
            {selected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm font-semibold text-gray-900">{seat.class}</span>
          {isLowest && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-600 text-white">最低价</span>}
          {selected && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-100 text-primary-700">已选</span>}
        </div>
        <div className="text-xs text-gray-500 mt-1 ml-7">
          {soldOut ? '已售罄' : `余 ${seat.available} 张`}
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-baseline gap-0.5">
          <span className="text-xs text-gray-400">¥</span>
          <span className={`text-xl font-extrabold tabular-nums ${selected ? 'text-primary-600' : 'text-gray-900'}`}>
            {seat.price}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────

export default function RouteDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params.id as string;
  const date = searchParams.get('date') || '2026-06-08';

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<SelectedSeatState | null>(null);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      const found = getTicketById(id);
      if (found) {
        setTicket(found);
        // Default: select lowest price seat
        const lowest = found.seatClasses.reduce((min, s) => s.price < min.price ? s : min, found.seatClasses[0]);
        setSelectedSeat({
          className: lowest.class,
          price: lowest.price,
          available: lowest.available,
        });
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [id]);

  const handleSeatSelect = (seat: SeatClass) => {
    setSelectedSeat({
      className: seat.class,
      price: seat.price,
      available: seat.available,
    });
  };

  const handleBook = () => {
    if (!ticket || !selectedSeat) return;
    const params = new URLSearchParams({
      ticketId: ticket.id,
      trainNo: ticket.trainNo,
      date,
      seat: selectedSeat.className,
      price: String(selectedSeat.price),
      origin: ticket.origin,
      destination: ticket.destination,
      departure: ticket.departureTime,
      arrival: ticket.arrivalTime,
    });
    router.push(`/order/confirm?${params.toString()}`);
  };

  const currentPrice = selectedSeat?.price ?? ticket?.lowestPrice ?? 0;
  const currentClassName = selectedSeat?.className ?? '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <p className="text-sm text-gray-500">加载方案详情...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">未找到该方案</h2>
          <button onClick={() => router.back()} className="px-6 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl">返回</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#06091a] via-[#0d1b3a] to-[#162d5a] pt-20 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[120px] breathe" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 mb-5 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            返回搜索结果
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{ticket.typeIcon}</span>
                <span className="text-lg font-bold text-white">{ticket.trainNo}</span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-xs font-medium text-white/70">{ticket.typeLabel}</span>
                <span className="text-sm text-white/50">{ticket.carrier}</span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-3xl font-bold text-white tabular-nums">{ticket.departureTime}</div>
                  <div className="text-sm text-white/50">{ticket.originStation}</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-xs text-white/40">{ticket.duration}</div>
                  <div className="w-24 h-px bg-white/20 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/40" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="text-[10px] text-white/30">{ticket.punctuality}% 准点</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white tabular-nums">{ticket.arrivalTime}</div>
                  <div className="text-sm text-white/50">{ticket.destinationStation}</div>
                </div>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="flex items-baseline gap-0.5 sm:justify-end">
                <span className="text-sm text-white/50">¥</span>
                <span className="text-4xl font-extrabold text-white tabular-nums">{currentPrice}</span>
              </div>
              <div className="text-sm text-white/40">{currentClassName || date}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10 pb-24">
        {/* AI Score */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-ai-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-ai-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">AI 综合评分</h2>
            <span className="ml-auto text-3xl font-extrabold text-gray-900 tabular-nums">{ticket.score}<span className="text-sm font-normal text-gray-400 ml-0.5">/100</span></span>
          </div>
          <div className="space-y-4">
            {ticket.scoreDetails.map((d) => <ScoreBar key={d.dimension} detail={d} />)}
          </div>
          <div className="mt-5 pt-5 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">AI 推荐理由</h4>
            <div className="flex flex-wrap gap-2">
              {ticket.reasons.map((r, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-xs text-emerald-700 border border-emerald-100">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Seat Selection */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-900">选择座位类型</h3>
            <span className="text-xs text-gray-400">{ticket.seatClasses.length} 种可选</span>
          </div>
          <div className="space-y-3">
            {ticket.seatClasses.map((seat) => (
              <SeatCard
                key={seat.class}
                seat={seat}
                selected={selectedSeat?.className === seat.class}
                isLowest={seat.price === ticket.lowestPrice}
                onClick={() => handleSeatSelect(seat)}
              />
            ))}
          </div>
        </div>

        {/* Trip Details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">行程详情</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '车次号', value: ticket.trainNo },
              { label: '出发站', value: ticket.originStation },
              { label: '到达站', value: ticket.destinationStation },
              { label: '总耗时', value: ticket.duration },
              { label: '出发日期', value: ticket.departureDate },
              { label: '出发时间', value: ticket.departureTime },
              { label: '到达时间', value: ticket.arrivalTime },
              { label: '准点率', value: `${ticket.punctuality}%` },
              ...(ticket.aircraft ? [{ label: '机型', value: ticket.aircraft }] : []),
              ...(ticket.stops !== undefined ? [{ label: '经停', value: ticket.stops === 0 ? '直飞' : `${ticket.stops} 次` }] : []),
            ].map((item) => (
              <div key={item.label}>
                <div className="text-xs text-gray-400 mb-0.5">{item.label}</div>
                <div className="text-sm font-semibold text-gray-900">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        {ticket.amenities.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">服务设施</h3>
            <div className="flex flex-wrap gap-2">
              {ticket.amenities.map((a) => (
                <span key={a} className="px-3 py-1.5 rounded-lg bg-gray-50 text-xs font-medium text-gray-700 border border-gray-100">{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 glass border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs text-gray-400">已选座位</div>
                  <div className="text-sm font-semibold text-gray-900">{currentClassName}</div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                  <div className="text-xs text-gray-400">车次</div>
                  <div className="text-sm font-semibold text-gray-900">{ticket.trainNo}</div>
                </div>
                <div className="w-px h-8 bg-gray-200 hidden sm:block" />
                <div className="hidden sm:block">
                  <div className="text-xs text-gray-400">行程</div>
                  <div className="text-sm font-semibold text-gray-900">{ticket.departureTime} → {ticket.arrivalTime}</div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <div className="text-xs text-gray-400">总价</div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xs text-gray-400">¥</span>
                    <span className="text-2xl font-extrabold text-primary-600 tabular-nums">{currentPrice}</span>
                  </div>
                </div>
                <button onClick={handleBook} className="px-10 py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold rounded-xl hover:from-primary-700 hover:to-primary-600 hover:shadow-lg hover:shadow-primary-600/25 active:scale-[0.97] transition-all text-base whitespace-nowrap">
                  立即预订
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
