import { describe, it, expect, beforeEach } from 'vitest';
import { useCompareStore } from '@/stores/useCompareStore';
import type { Ticket } from '@/lib/mock-data';

function makeTicket(id: string, trainNo: string): Ticket {
  return {
    id,
    type: 'high_speed',
    typeLabel: '高铁',
    typeIcon: '🚄',
    trainNo,
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
    seatClasses: [{ class: '二等座', price: 553, available: 88 }],
    lowestPrice: 553,
    punctuality: 96,
    score: 92,
    scoreDetails: [
      { dimension: 'time', label: '时间匹配', score: 95, weight: 0.35, reason: '' },
      { dimension: 'price', label: '价格优势', score: 85, weight: 0.25, reason: '' },
      { dimension: 'duration', label: '耗时最短', score: 90, weight: 0.25, reason: '' },
      { dimension: 'comfort', label: '舒适度', score: 88, weight: 0.15, reason: '' },
    ],
    reasons: [],
    amenities: [],
  };
}

describe('useCompareStore', () => {
  beforeEach(() => {
    useCompareStore.getState().clear();
  });

  it('初始状态为空列表', () => {
    expect(useCompareStore.getState().list).toEqual([]);
  });

  it('add 添加票到对比列表', () => {
    const ticket = makeTicket('G11', 'G11');
    useCompareStore.getState().add(ticket);
    expect(useCompareStore.getState().list).toHaveLength(1);
    expect(useCompareStore.getState().list[0].id).toBe('G11');
  });

  it('不重复添加同一张票', () => {
    const ticket = makeTicket('G11', 'G11');
    useCompareStore.getState().add(ticket);
    useCompareStore.getState().add(ticket);
    expect(useCompareStore.getState().list).toHaveLength(1);
  });

  it('最多添加 4 张票', () => {
    for (let i = 1; i <= 5; i++) {
      useCompareStore.getState().add(makeTicket(`G${i}`, `G${i}`));
    }
    expect(useCompareStore.getState().list).toHaveLength(4);
  });

  it('remove 移除指定票', () => {
    useCompareStore.getState().add(makeTicket('G11', 'G11'));
    useCompareStore.getState().add(makeTicket('G3', 'G3'));
    useCompareStore.getState().remove('G11');
    expect(useCompareStore.getState().list).toHaveLength(1);
    expect(useCompareStore.getState().list[0].id).toBe('G3');
  });

  it('clear 清空列表', () => {
    useCompareStore.getState().add(makeTicket('G11', 'G11'));
    useCompareStore.getState().add(makeTicket('G3', 'G3'));
    useCompareStore.getState().clear();
    expect(useCompareStore.getState().list).toEqual([]);
  });

  it('has 判断票是否在列表中', () => {
    useCompareStore.getState().add(makeTicket('G11', 'G11'));
    expect(useCompareStore.getState().has('G11')).toBe(true);
    expect(useCompareStore.getState().has('G3')).toBe(false);
  });
});
