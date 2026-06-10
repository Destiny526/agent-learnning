import api from './api';

export interface SearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  recommendation_type?: string;
  user_id?: number;
  max_results?: number;
  budget_min?: number;
  budget_max?: number;
  preferred_time?: string;
}

export interface RecommendResult {
  item_id: string;
  item_type: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  score: number;
  origin: string;
  destination: string;
  departure_time: string | null;
  arrival_time: string | null;
  duration_minutes: number | null;
  seat_type: string | null;
  availability: boolean;
  metadata: Record<string, any>;
}

export interface CompareParams {
  origin: string;
  destination: string;
  departure_date: string;
  compare_types?: string[];
  max_results?: number;
}

export const searchApi = {
  searchTickets: (type: string, params: SearchParams) =>
    api.post<RecommendResult[]>(`/api/tickets/search/${type}`, params),

  getRecommendations: (type: string, params: SearchParams) =>
    api.post<RecommendResult[]>(`/api/ai/recommend/${type}`, params),

  getAllRecommendations: (params: SearchParams) =>
    api.post<Record<string, RecommendResult[]>>('/api/ai/recommend/all', params),

  compare: (params: CompareParams) =>
    api.post<RecommendResult[]>('/api/ai/recommend/compare', params),
};
