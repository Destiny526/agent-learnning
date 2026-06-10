// ============================================================
// 收藏 API 层
// 支持真实数据库和 Mock 模式
// ============================================================

import api from './api';

/** 收藏路线类型 */
export type FavoriteType = 'high_speed' | 'flight' | 'train';

/** 收藏项 */
export interface Favorite {
  id: string;
  user_id: number;
  route_id: string;
  from_city: string;
  to_city: string;
  from_station: string;
  to_station: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  type: FavoriteType;
  type_label: string;
  type_icon: string;
  train_no: string;
  price: number;
  ai_score: number;
  created_at: string;
}

/** 添加收藏参数 */
export interface AddFavoriteParams {
  route_id?: string;
  type: FavoriteType;
  origin: string;
  destination: string;
  from_station?: string;
  to_station?: string;
  train_no?: string;
  departure_date?: string;
  departure_time: string;
  arrival_time: string;
  duration?: string;
  price: number;
  ai_score?: number;
}

// ---------- Mock 数据 ----------

const MOCK_FAVORITES: Favorite[] = [
  {
    id: 'fav_001',
    user_id: 1,
    route_id: 'G11_20260608',
    from_city: '北京',
    to_city: '上海',
    from_station: '北京南站',
    to_station: '上海虹桥站',
    departure_date: '2026-06-15',
    departure_time: '09:00',
    arrival_time: '13:43',
    duration: '4h43m',
    type: 'high_speed',
    type_label: '高铁',
    type_icon: '🚄',
    train_no: 'G11',
    price: 553,
    ai_score: 92,
    created_at: '2026-06-01T10:30:00Z',
  },
  {
    id: 'fav_002',
    user_id: 1,
    route_id: 'MU5101_20260608',
    from_city: '上海',
    to_city: '广州',
    from_station: '上海虹桥机场',
    to_station: '广州白云机场',
    departure_date: '2026-06-20',
    departure_time: '08:30',
    arrival_time: '11:05',
    duration: '2h35m',
    type: 'flight',
    type_label: '航班',
    type_icon: '✈️',
    train_no: 'MU5101',
    price: 1280,
    ai_score: 88,
    created_at: '2026-06-02T14:20:00Z',
  },
  {
    id: 'fav_003',
    user_id: 1,
    route_id: 'D3125_20260608',
    from_city: '杭州',
    to_city: '南京',
    from_station: '杭州东站',
    to_station: '南京南站',
    departure_date: '2026-06-25',
    departure_time: '14:20',
    arrival_time: '16:05',
    duration: '1h45m',
    type: 'high_speed',
    type_label: '动车',
    type_icon: '🚄',
    train_no: 'D3125',
    price: 117,
    ai_score: 85,
    created_at: '2026-06-03T09:15:00Z',
  },
  {
    id: 'fav_004',
    user_id: 1,
    route_id: 'CZ3101_20260608',
    from_city: '广州',
    to_city: '北京',
    from_station: '广州白云机场',
    to_station: '北京大兴机场',
    departure_date: '2026-07-01',
    departure_time: '07:00',
    arrival_time: '10:00',
    duration: '3h00m',
    type: 'flight',
    type_label: '航班',
    type_icon: '✈️',
    train_no: 'CZ3101',
    price: 1560,
    ai_score: 90,
    created_at: '2026-06-04T16:45:00Z',
  },
  {
    id: 'fav_005',
    user_id: 1,
    route_id: 'K45_20260608',
    from_city: '成都',
    to_city: '重庆',
    from_station: '成都站',
    to_station: '重庆站',
    departure_date: '2026-07-05',
    departure_time: '10:30',
    arrival_time: '14:20',
    duration: '3h50m',
    type: 'train',
    type_label: '火车',
    type_icon: '🚂',
    train_no: 'K45',
    price: 86,
    ai_score: 72,
    created_at: '2026-06-05T11:00:00Z',
  },
  {
    id: 'fav_006',
    user_id: 1,
    route_id: 'G88_20260608',
    from_city: '深圳',
    to_city: '武汉',
    from_station: '深圳北站',
    to_station: '武汉站',
    departure_date: '2026-07-10',
    departure_time: '11:15',
    arrival_time: '15:48',
    duration: '4h33m',
    type: 'high_speed',
    type_label: '高铁',
    type_icon: '🚄',
    train_no: 'G88',
    price: 520,
    ai_score: 87,
    created_at: '2026-06-06T08:30:00Z',
  },
];

function mockDelay(ms = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- 类型映射 ----------

const TYPE_LABELS: Record<FavoriteType, { label: string; icon: string }> = {
  high_speed: { label: '高铁', icon: '🚄' },
  flight: { label: '航班', icon: '✈️' },
  train: { label: '火车', icon: '🚂' },
};

interface RawFavorite {
  id: number;
  userId: number;
  type: string;
  origin: string;
  destination: string;
  fromStation: string | null;
  toStation: string | null;
  trainNo: string | null;
  departureDate: string | null;
  departureTime: string;
  arrivalTime: string;
  duration: string | null;
  price: { toString(): string };
  aiScore: number;
  createdAt: Date;
}

/** 将数据库记录转为前端 Favorite 格式 */
function mapFavorite(raw: RawFavorite): Favorite {
  const typeInfo = TYPE_LABELS[raw.type as FavoriteType] || { label: raw.type, icon: '🚆' };
  return {
    id: String(raw.id),
    user_id: raw.userId,
    route_id: raw.trainNo ? `${raw.trainNo}_${raw.departureDate}` : `${raw.origin}_${raw.destination}`,
    from_city: raw.origin,
    to_city: raw.destination,
    from_station: raw.fromStation || raw.origin,
    to_station: raw.toStation || raw.destination,
    departure_date: raw.departureDate || '',
    departure_time: raw.departureTime,
    arrival_time: raw.arrivalTime,
    duration: raw.duration || '',
    type: raw.type as FavoriteType,
    type_label: typeInfo.label,
    type_icon: typeInfo.icon,
    train_no: raw.trainNo || '',
    price: Number(raw.price),
    ai_score: raw.aiScore,
    created_at: raw.createdAt.toISOString(),
  };
}

// ---------- 真实 API ----------

const realApi = {
  getFavorites: async (type?: string) => {
    const params = type && type !== 'all' ? `?type=${type}` : '';
    const { data } = await api.get<any[]>(`/api/favorites${params}`);
    return { data: data.map(mapFavorite) };
  },

  addFavorite: async (params: AddFavoriteParams) => {
    const { data } = await api.post<RawFavorite>('/api/favorites', params);
    return { data: mapFavorite(data) };
  },

  removeFavorite: async (id: string) => {
    return api.delete(`/api/favorites/${id}`);
  },
};

// ---------- Mock API ----------

let mockStore = [...MOCK_FAVORITES];

const mockApi = {
  getFavorites: async (type?: string) => {
    await mockDelay();
    let items = [...mockStore];
    if (type && type !== 'all') {
      items = items.filter((f) => f.type === type);
    }
    return { data: items };
  },

  addFavorite: async (params: AddFavoriteParams) => {
    await mockDelay();
    const typeInfo = TYPE_LABELS[params.type] || { label: params.type, icon: '🚆' };
    const newFav: Favorite = {
      id: 'fav_' + Date.now(),
      user_id: 1,
      route_id: params.route_id || `${params.origin}_${params.destination}`,
      from_city: params.origin,
      to_city: params.destination,
      from_station: params.from_station || params.origin,
      to_station: params.to_station || params.destination,
      departure_date: params.departure_date || '',
      departure_time: params.departure_time,
      arrival_time: params.arrival_time,
      duration: params.duration || '',
      type: params.type,
      type_label: typeInfo.label,
      type_icon: typeInfo.icon,
      train_no: params.train_no || '',
      price: params.price,
      ai_score: params.ai_score || 0,
      created_at: new Date().toISOString(),
    };
    mockStore = [newFav, ...mockStore];
    return { data: newFav };
  },

  removeFavorite: async (id: string) => {
    await mockDelay(300);
    mockStore = mockStore.filter((f) => f.id !== id);
    return { data: { success: true } };
  },
};

// ---------- 统一导出 ----------

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || !process.env.NEXT_PUBLIC_API_URL;

export const favoritesApi = USE_MOCK ? mockApi : realApi;
