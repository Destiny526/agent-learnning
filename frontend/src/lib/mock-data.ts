// ── Mock Data — MySQL-Compatible Schema ─────────────────────────────
// Tables: tickets, recommend_logs, seat_classes, score_details

import type { AIRecommendInfo, AIRecommendTag } from '@/components/results/AIRecommendBadge';

export interface SeatClass {
  class: string;        // e.g. "二等座", "经济舱", "硬座"
  price: number;
  available: number;
}

export interface ScoreDetail {
  dimension: string;    // "time" | "price" | "duration" | "comfort"
  label: string;
  score: number;        // 0-100
  weight: number;       // 0.0-1.0
  reason: string;
}

export interface Ticket {
  id: string;                 // MySQL PK
  type: 'train' | 'high_speed' | 'flight';
  typeLabel: string;
  typeIcon: string;
  trainNo: string;
  carrier: string;            // 航空公司 or 铁路局
  origin: string;
  originStation: string;
  destination: string;
  destinationStation: string;
  departureDate: string;      // YYYY-MM-DD
  departureTime: string;      // HH:mm
  arrivalDate: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  seatClasses: SeatClass[];
  lowestPrice: number;
  punctuality: number;        // 准点率 0-100
  score: number;              // AI 综合分 0-100
  scoreDetails: ScoreDetail[];
  reasons: string[];
  amenities: string[];        // WiFi, 餐饮, 充电...
  aircraft?: string;
  stops?: number;             // 经停数
}

// ── AI Recommend Info Generator ─────────────────────────────────────

const DIMENSION_TAG_MAP: Record<string, (detail: ScoreDetail, ticket: Ticket) => AIRecommendTag | null> = {
  time: (d, t) => {
    if (d.score >= 85) return { icon: '⏰', label: '时间最优', highlight: true };
    if (d.score >= 70) return { icon: '🕐', label: '时间合适' };
    if (d.score >= 50) return { icon: '⏱️', label: '时间尚可' };
    return null;
  },
  price: (d, t) => {
    if (d.score >= 90) return { icon: '💰', label: '价格最优', highlight: true };
    if (d.score >= 70) return { icon: '🏷️', label: '价格合理' };
    if (d.score >= 50) return { icon: '💵', label: '价格适中' };
    return null;
  },
  duration: (d, t) => {
    if (d.score >= 90) return { icon: '⚡', label: '耗时最短', highlight: true };
    if (d.score >= 70) return { icon: '🚄', label: '耗时较短' };
    if (d.score >= 50) return { icon: '🕐', label: '耗时适中' };
    return null;
  },
  comfort: (d, t) => {
    if (d.score >= 85) return { icon: '✨', label: '舒适度高', highlight: true };
    if (d.score >= 65) return { icon: '🛋️', label: '舒适度较高' };
    if (d.score >= 45) return { icon: '💺', label: '舒适度一般' };
    return null;
  },
};

const EXTRA_TAG_RULES: Array<(ticket: Ticket) => AIRecommendTag | null> = [
  (t) => t.punctuality >= 95 ? { icon: '🎯', label: `准点率 ${t.punctuality}%`, highlight: true } : null,
  (t) => t.punctuality >= 90 && t.punctuality < 95 ? { icon: '✅', label: `准点率 ${t.punctuality}%` } : null,
  (t) => t.amenities.includes('WiFi') ? { icon: '📶', label: '含WiFi' } : null,
  (t) => t.amenities.includes('免费餐食') || t.amenities.includes('餐饮服务') ? { icon: '🍱', label: '含餐饮' } : null,
  (t) => t.amenities.includes('充电插座') ? { icon: '🔌', label: '有充电' } : null,
  (t) => t.type === 'flight' && t.stops === 0 ? { icon: '✈️', label: '直飞' } : null,
  (t) => t.type === 'high_speed' && t.score >= 85 ? { icon: '🚄', label: '高铁首选' } : null,
  (t) => t.lowestPrice <= 200 ? { icon: '🏷️', label: '超值低价', highlight: true } : null,
];

const SUMMARY_TEMPLATES: Record<string, (ticket: Ticket) => string> = {
  excellent: (t) => `该方案在时间、价格、耗时、舒适度方面综合表现优异，AI 强烈推荐`,
  great: (t) => `该方案综合评分较高，${t.scoreDetails.filter(d => d.score >= 80).map(d => d.label).join('、')}表现突出`,
  good: (t) => `该方案整体表现均衡，适合${t.type === 'flight' ? '追求效率' : '注重性价比'}的旅客`,
  fair: (t) => `该方案价格较低但${t.scoreDetails.find(d => d.score < 40)?.label || '部分维度'}表现一般`,
};

export interface PreferenceWeights {
  time: number;
  price: number;
  duration: number;
  comfort: number;
}

/**
 * Calculate weighted score based on user preferences.
 * Returns a 0-100 score.
 */
export function calculateWeightedScore(ticket: Ticket, weights?: PreferenceWeights): number {
  if (!weights) return ticket.score;

  const dimScores: Record<string, number> = {};
  for (const d of ticket.scoreDetails) {
    dimScores[d.dimension] = d.score;
  }

  const weighted =
    (dimScores['time'] || 0) * weights.time +
    (dimScores['price'] || 0) * weights.price +
    (dimScores['duration'] || 0) * weights.duration +
    (dimScores['comfort'] || 0) * weights.comfort;

  return Math.round(weighted);
}

/**
 * Sort tickets by preference-weighted score.
 */
export function sortTicketsByPreference(tickets: Ticket[], weights?: PreferenceWeights): Ticket[] {
  if (!weights) return [...tickets].sort((a, b) => b.score - a.score);
  return [...tickets].sort((a, b) => calculateWeightedScore(b, weights) - calculateWeightedScore(a, weights));
}

export function generateAIRecommendInfo(ticket: Ticket, weights?: PreferenceWeights): AIRecommendInfo {
  const weightedScore = calculateWeightedScore(ticket, weights);
  const displayScore = weights ? +(weightedScore / 10).toFixed(1) : +(ticket.score / 10).toFixed(1);

  const level: AIRecommendInfo['level'] =
    displayScore >= 9.0 ? 'excellent' :
    displayScore >= 8.0 ? 'great' :
    displayScore >= 6.5 ? 'good' : 'fair';

  const tags: AIRecommendTag[] = [];

  // Tags from score dimensions
  for (const detail of ticket.scoreDetails) {
    const generator = DIMENSION_TAG_MAP[detail.dimension];
    if (generator) {
      const tag = generator(detail, ticket);
      if (tag) tags.push(tag);
    }
  }

  // Extra tags from ticket attributes
  for (const rule of EXTRA_TAG_RULES) {
    const tag = rule(ticket);
    if (tag && !tags.some(t => t.label === tag.label)) {
      tags.push(tag);
    }
  }

  // Ensure at least one highlight
  if (!tags.some(t => t.highlight) && tags.length > 0) {
    tags[0].highlight = true;
  }

  // Adjust summary based on preferences
  let summary = SUMMARY_TEMPLATES[level](ticket);
  if (weights) {
    const topDim = Object.entries(weights).sort(([, a], [, b]) => b - a)[0][0] as keyof PreferenceWeights;
    const prefLabels: Record<string, string> = {
      time: '时间匹配', price: '价格优势', duration: '耗时最短', comfort: '舒适度',
    };
    if (weights[topDim] >= 0.35) {
      summary += `，符合您的「${prefLabels[topDim]}」偏好`;
    }
  }

  return { score: displayScore, level, tags, summary };
}

export interface RecommendCategory {
  key: string;
  label: string;
  sublabel: string;
  icon: string;
  gradient: string;
  ticket: Ticket;
}

// ── Mock Tickets ───────────────────────────────────────────────────

const TICKETS: Ticket[] = [
  {
    id: 'G11_20260608',
    type: 'high_speed',
    typeLabel: '高铁',
    typeIcon: '🚄',
    trainNo: 'G11',
    carrier: '中国铁路',
    origin: '北京',
    originStation: '北京南站',
    destination: '上海',
    destinationStation: '上海虹桥站',
    departureDate: '2026-06-08',
    departureTime: '09:00',
    arrivalDate: '2026-06-08',
    arrivalTime: '13:43',
    duration: '4h43m',
    durationMinutes: 283,
    seatClasses: [
      { class: '商务座', price: 1748, available: 5 },
      { class: '一等座', price: 933, available: 22 },
      { class: '二等座', price: 553, available: 88 },
    ],
    lowestPrice: 553,
    punctuality: 96,
    score: 92,
    scoreDetails: [
      { dimension: 'time', label: '时间匹配', score: 95, weight: 0.35, reason: '出发时间 09:00 与期望时间完全一致' },
      { dimension: 'price', label: '价格优势', score: 85, weight: 0.25, reason: '二等座 ¥553，性价比高' },
      { dimension: 'duration', label: '耗时最短', score: 90, weight: 0.25, reason: '全程 4h43m，高铁中最快' },
      { dimension: 'comfort', label: '舒适度', score: 88, weight: 0.15, reason: '高铁座位宽敞，准点率 96%' },
    ],
    reasons: ['出发时间与期望完全一致', '高铁中耗时最短', '性价比最高', '准点率 96%'],
    amenities: ['WiFi', '充电插座', '餐饮服务', '行李架'],
  },
  {
    id: 'G3_20260608',
    type: 'high_speed',
    typeLabel: '高铁',
    typeIcon: '🚄',
    trainNo: 'G3',
    carrier: '中国铁路',
    origin: '北京',
    originStation: '北京南站',
    destination: '上海',
    destinationStation: '上海虹桥站',
    departureDate: '2026-06-08',
    departureTime: '06:52',
    arrivalDate: '2026-06-08',
    arrivalTime: '11:33',
    duration: '4h41m',
    durationMinutes: 281,
    seatClasses: [
      { class: '商务座', price: 1748, available: 3 },
      { class: '一等座', price: 933, available: 15 },
      { class: '二等座', price: 553, available: 95 },
    ],
    lowestPrice: 553,
    punctuality: 97,
    score: 88,
    scoreDetails: [
      { dimension: 'time', label: '时间匹配', score: 70, weight: 0.35, reason: '出发时间 06:52，比期望早 2 小时' },
      { dimension: 'price', label: '价格优势', score: 85, weight: 0.25, reason: '二等座 ¥553，价格合理' },
      { dimension: 'duration', label: '耗时最短', score: 95, weight: 0.25, reason: '全程 4h41m，所有车次中最短' },
      { dimension: 'comfort', label: '舒适度', score: 90, weight: 0.15, reason: '准点率 97%，座位舒适' },
    ],
    reasons: ['所有车次中耗时最短', '准点率最高 97%', '价格合理'],
    amenities: ['WiFi', '充电插座', '餐饮服务'],
  },
  {
    id: 'G1_20260608',
    type: 'high_speed',
    typeLabel: '高铁',
    typeIcon: '🚄',
    trainNo: 'G1',
    carrier: '中国铁路',
    origin: '北京',
    originStation: '北京南站',
    destination: '上海',
    destinationStation: '上海虹桥站',
    departureDate: '2026-06-08',
    departureTime: '06:30',
    arrivalDate: '2026-06-08',
    arrivalTime: '11:24',
    duration: '4h54m',
    durationMinutes: 294,
    seatClasses: [
      { class: '商务座', price: 1748, available: 8 },
      { class: '一等座', price: 933, available: 30 },
      { class: '二等座', price: 553, available: 128 },
    ],
    lowestPrice: 553,
    punctuality: 95,
    score: 82,
    scoreDetails: [
      { dimension: 'time', label: '时间匹配', score: 60, weight: 0.35, reason: '出发时间 06:30，比期望早 2.5 小时' },
      { dimension: 'price', label: '价格优势', score: 85, weight: 0.25, reason: '二等座 ¥553' },
      { dimension: 'duration', label: '耗时最短', score: 82, weight: 0.25, reason: '4h54m，耗时适中' },
      { dimension: 'comfort', label: '舒适度', score: 85, weight: 0.15, reason: '余票充足，准点率 95%' },
    ],
    reasons: ['余票充足', '早班次到达时间合适'],
    amenities: ['WiFi', '充电插座', '餐饮服务'],
  },
  {
    id: 'CA1501_20260608',
    type: 'flight',
    typeLabel: '飞机',
    typeIcon: '✈️',
    trainNo: 'CA1501',
    carrier: '中国国航',
    origin: '北京',
    originStation: '首都国际机场 T3',
    destination: '上海',
    destinationStation: '虹桥国际机场 T2',
    departureDate: '2026-06-08',
    departureTime: '07:00',
    arrivalDate: '2026-06-08',
    arrivalTime: '09:15',
    duration: '2h15m',
    durationMinutes: 135,
    seatClasses: [
      { class: '头等舱', price: 4280, available: 2 },
      { class: '公务舱', price: 2680, available: 5 },
      { class: '经济舱', price: 1395, available: 45 },
    ],
    lowestPrice: 1395,
    punctuality: 88,
    score: 85,
    scoreDetails: [
      { dimension: 'time', label: '时间匹配', score: 65, weight: 0.35, reason: '出发 07:00，比期望早 2 小时' },
      { dimension: 'price', label: '价格优势', score: 50, weight: 0.25, reason: '经济舱 ¥1395，价格较高' },
      { dimension: 'duration', label: '耗时最短', score: 100, weight: 0.25, reason: '2h15m，所有方案中最快' },
      { dimension: 'comfort', label: '舒适度', score: 95, weight: 0.15, reason: '飞机舒适度高，含餐食' },
    ],
    reasons: ['耗时最短 2h15m', '适合商务出行', '含免费餐食'],
    amenities: ['机上WiFi', '免费餐食', '行李托运', '娱乐系统'],
    aircraft: 'Airbus A330',
    stops: 0,
  },
  {
    id: 'MU5101_20260608',
    type: 'flight',
    typeLabel: '飞机',
    typeIcon: '✈️',
    trainNo: 'MU5101',
    carrier: '东方航空',
    origin: '北京',
    originStation: '大兴国际机场',
    destination: '上海',
    destinationStation: '浦东国际机场 T1',
    departureDate: '2026-06-08',
    departureTime: '08:30',
    arrivalDate: '2026-06-08',
    arrivalTime: '10:50',
    duration: '2h20m',
    durationMinutes: 140,
    seatClasses: [
      { class: '公务舱', price: 2380, available: 3 },
      { class: '经济舱', price: 1280, available: 32 },
    ],
    lowestPrice: 1280,
    punctuality: 85,
    score: 78,
    scoreDetails: [
      { dimension: 'time', label: '时间匹配', score: 72, weight: 0.35, reason: '出发 08:30，接近期望时间' },
      { dimension: 'price', label: '价格优势', score: 55, weight: 0.25, reason: '经济舱 ¥1280' },
      { dimension: 'duration', label: '耗时最短', score: 98, weight: 0.25, reason: '2h20m，非常快' },
      { dimension: 'comfort', label: '舒适度', score: 82, weight: 0.15, reason: '大兴机场体验好' },
    ],
    reasons: ['大兴机场出发，设施新', '价格比国航便宜', '耗时短'],
    amenities: ['机上WiFi', '免费餐食', '行李托运'],
    aircraft: 'Boeing 737-800',
    stops: 0,
  },
  {
    id: 'CZ6519_20260608',
    type: 'flight',
    typeLabel: '飞机',
    typeIcon: '✈️',
    trainNo: 'CZ6519',
    carrier: '南方航空',
    origin: '北京',
    originStation: '大兴国际机场',
    destination: '上海',
    destinationStation: '虹桥国际机场 T1',
    departureDate: '2026-06-08',
    departureTime: '10:00',
    arrivalDate: '2026-06-08',
    arrivalTime: '12:20',
    duration: '2h20m',
    durationMinutes: 140,
    seatClasses: [
      { class: '公务舱', price: 2180, available: 4 },
      { class: '经济舱', price: 1150, available: 68 },
    ],
    lowestPrice: 1150,
    punctuality: 86,
    score: 80,
    scoreDetails: [
      { dimension: 'time', label: '时间匹配', score: 90, weight: 0.35, reason: '出发 10:00，接近期望' },
      { dimension: 'price', label: '价格优势', score: 60, weight: 0.25, reason: '经济舱 ¥1150，航班中最便宜' },
      { dimension: 'duration', label: '耗时最短', score: 98, weight: 0.25, reason: '2h20m' },
      { dimension: 'comfort', label: '舒适度', score: 78, weight: 0.15, reason: '经济舱座位间距一般' },
    ],
    reasons: ['航班中价格最低', '出发时间合适', '到达虹桥交通方便'],
    amenities: ['免费餐食', '行李托运'],
    aircraft: 'Airbus A320',
    stops: 0,
  },
  {
    id: '1461_20260608',
    type: 'train',
    typeLabel: '普快',
    typeIcon: '🚂',
    trainNo: '1461',
    carrier: '中国铁路',
    origin: '北京',
    originStation: '北京站',
    destination: '上海',
    destinationStation: '上海站',
    departureDate: '2026-06-08',
    departureTime: '11:59',
    arrivalDate: '2026-06-09',
    arrivalTime: '06:45',
    duration: '18h46m',
    durationMinutes: 1126,
    seatClasses: [
      { class: '硬卧', price: 328, available: 45 },
      { class: '硬座', price: 178, available: 320 },
    ],
    lowestPrice: 178,
    punctuality: 82,
    score: 55,
    scoreDetails: [
      { dimension: 'time', label: '时间匹配', score: 40, weight: 0.35, reason: '出发 11:59，但耗时过长' },
      { dimension: 'price', label: '价格优势', score: 100, weight: 0.25, reason: '硬座 ¥178，全网最低' },
      { dimension: 'duration', label: '耗时最短', score: 10, weight: 0.25, reason: '18h46m，耗时最长' },
      { dimension: 'comfort', label: '舒适度', score: 35, weight: 0.15, reason: '硬座舒适度低' },
    ],
    reasons: ['价格全网最低 ¥178', '适合预算有限', '余票充足'],
    amenities: ['餐车'],
  },
  {
    id: 'T109_20260608',
    type: 'train',
    typeLabel: '特快',
    typeIcon: '🚂',
    trainNo: 'T109',
    carrier: '中国铁路',
    origin: '北京',
    originStation: '北京站',
    destination: '上海',
    destinationStation: '上海站',
    departureDate: '2026-06-08',
    departureTime: '20:04',
    arrivalDate: '2026-06-09',
    arrivalTime: '11:02',
    duration: '14h58m',
    durationMinutes: 898,
    seatClasses: [
      { class: '软卧', price: 515, available: 12 },
      { class: '硬卧', price: 328, available: 85 },
      { class: '硬座', price: 178, available: 150 },
    ],
    lowestPrice: 178,
    punctuality: 84,
    score: 62,
    scoreDetails: [
      { dimension: 'time', label: '时间匹配', score: 55, weight: 0.35, reason: '夜间出发，不浪费白天时间' },
      { dimension: 'price', label: '价格优势', score: 90, weight: 0.25, reason: '硬卧 ¥328，性价比高' },
      { dimension: 'duration', label: '耗时最短', score: 30, weight: 0.25, reason: '14h58m，夜间行驶' },
      { dimension: 'comfort', label: '舒适度', score: 60, weight: 0.15, reason: '软卧舒适，可睡觉' },
    ],
    reasons: ['夜间出发不浪费白天', '硬卧性价比高', '睡一觉到达'],
    amenities: ['餐车', '卧铺'],
  },
  {
    id: 'D701_20260608',
    type: 'high_speed',
    typeLabel: '动卧',
    typeIcon: '🚄',
    trainNo: 'D701',
    carrier: '中国铁路',
    origin: '北京',
    originStation: '北京南站',
    destination: '上海',
    destinationStation: '上海站',
    departureDate: '2026-06-08',
    departureTime: '19:32',
    arrivalDate: '2026-06-09',
    arrivalTime: '07:25',
    duration: '11h53m',
    durationMinutes: 713,
    seatClasses: [
      { class: '动卧', price: 650, available: 42 },
    ],
    lowestPrice: 650,
    punctuality: 90,
    score: 72,
    scoreDetails: [
      { dimension: 'time', label: '时间匹配', score: 50, weight: 0.35, reason: '夜间出发，到达时间早' },
      { dimension: 'price', label: '价格优势', score: 70, weight: 0.25, reason: '动卧 ¥650，含床位' },
      { dimension: 'duration', label: '耗时最短', score: 45, weight: 0.25, reason: '11h53m，夜间行驶' },
      { dimension: 'comfort', label: '舒适度', score: 85, weight: 0.15, reason: '动卧可平躺睡觉，舒适度高' },
    ],
    reasons: ['动卧可平躺睡觉', '到达时间早 07:25', '不影响白天行程'],
    amenities: ['卧铺', '充电插座', 'WiFi'],
  },
];

// ── Helper ─────────────────────────────────────────────────────────

export function getTicketById(id: string): Ticket | undefined {
  return TICKETS.find((t) => t.id === id);
}

export function searchTickets(origin: string, destination: string, date: string, time: string = '09:00'): Ticket[] {
  const filtered = TICKETS.filter(
    (t) =>
      (t.origin.includes(origin) || origin.includes(t.origin)) &&
      (t.destination.includes(destination) || destination.includes(t.destination))
  );
  return filtered.length > 0 ? filtered : TICKETS;
}

export function getRecommendations(origin: string, destination: string, date: string, time: string = '09:00', weights?: PreferenceWeights) {
  const tickets = searchTickets(origin, destination, date, time);

  const sorted = weights
    ? sortTicketsByPreference(tickets, weights)
    : [...tickets].sort((a, b) => b.score - a.score);

  const cheapest = [...tickets].sort((a, b) => a.lowestPrice - b.lowestPrice)[0];
  const fastest = [...tickets].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
  const comfortable = [...tickets].sort((a, b) => {
    const ca = a.scoreDetails.find((d) => d.dimension === 'comfort')?.score || 0;
    const cb = b.scoreDetails.find((d) => d.dimension === 'comfort')?.score || 0;
    return cb - ca;
  })[0];

  const prefLabel = weights
    ? (() => {
        const top = Object.entries(weights).sort(([, a], [, b]) => b - a)[0];
        const labels: Record<string, string> = { time: '时间优先', price: '省钱优先', duration: '速度优先', comfort: '舒适优先' };
        return labels[top[0]] || '综合推荐';
      })()
    : '综合推荐';

  const categories: RecommendCategory[] = [
    { key: 'ai_best', label: 'AI 综合推荐', sublabel: weights ? `根据「${prefLabel}」偏好排序` : '4 维度综合评分最高', icon: '🤖', gradient: 'from-violet-600 to-ai-600', ticket: sorted[0] },
    { key: 'fastest', label: '最快方案', sublabel: '耗时最短，适合赶时间', icon: '⚡', gradient: 'from-amber-500 to-orange-500', ticket: fastest },
    { key: 'cheapest', label: '最便宜方案', sublabel: '价格最低，适合预算优先', icon: '💰', gradient: 'from-emerald-500 to-green-500', ticket: cheapest },
    { key: 'comfortable', label: '最舒适方案', sublabel: '乘坐体验最佳', icon: '🛋️', gradient: 'from-blue-500 to-cyan-500', ticket: comfortable },
  ];

  return { categories, allTickets: weights ? sorted : tickets };
}

export { TICKETS };
export type { Ticket as TicketResult };
