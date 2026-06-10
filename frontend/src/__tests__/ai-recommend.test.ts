import { describe, it, expect } from 'vitest';
import { generateAIRecommendInfo, type Ticket } from '@/lib/mock-data';

// ── Helper: create a minimal ticket for testing ─────────────────────
function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'TEST_001',
    type: 'high_speed',
    typeLabel: '高铁',
    typeIcon: '🚄',
    trainNo: 'G999',
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
      { class: '二等座', price: 553, available: 88 },
    ],
    lowestPrice: 553,
    punctuality: 96,
    score: 92,
    scoreDetails: [
      { dimension: 'time', label: '时间匹配', score: 95, weight: 0.35, reason: '出发时间完全一致' },
      { dimension: 'price', label: '价格优势', score: 85, weight: 0.25, reason: '性价比高' },
      { dimension: 'duration', label: '耗时最短', score: 90, weight: 0.25, reason: '高铁中最快' },
      { dimension: 'comfort', label: '舒适度', score: 88, weight: 0.15, reason: '座位宽敞' },
    ],
    reasons: ['出发时间与期望完全一致', '高铁中耗时最短'],
    amenities: ['WiFi', '充电插座', '餐饮服务'],
    ...overrides,
  };
}

// ── generateAIRecommendInfo 测试 ────────────────────────────────────

describe('generateAIRecommendInfo', () => {
  // ─── 推荐指数计算 ───
  describe('推荐指数', () => {
    it('score=92 应返回 9.2', () => {
      const ticket = makeTicket({ score: 92 });
      const info = generateAIRecommendInfo(ticket);
      expect(info.score).toBe(9.2);
    });

    it('score=100 应返回 10.0', () => {
      const ticket = makeTicket({ score: 100 });
      const info = generateAIRecommendInfo(ticket);
      expect(info.score).toBe(10);
    });

    it('score=55 应返回 5.5', () => {
      const ticket = makeTicket({ score: 55 });
      const info = generateAIRecommendInfo(ticket);
      expect(info.score).toBe(5.5);
    });
  });

  // ─── 推荐等级 ───
  describe('推荐等级', () => {
    it('score>=90 → excellent (强烈推荐)', () => {
      const info = generateAIRecommendInfo(makeTicket({ score: 92 }));
      expect(info.level).toBe('excellent');
      expect(info.summary).toContain('强烈推荐');
    });

    it('score>=80 → great (优先推荐)', () => {
      const info = generateAIRecommendInfo(makeTicket({ score: 85 }));
      expect(info.level).toBe('great');
      expect(info.summary).toContain('表现突出');
    });

    it('score>=65 → good (推荐)', () => {
      const info = generateAIRecommendInfo(makeTicket({ score: 72 }));
      expect(info.level).toBe('good');
      expect(info.summary).toContain('整体表现均衡');
    });

    it('score<65 → fair (可选)', () => {
      const info = generateAIRecommendInfo(makeTicket({ score: 55 }));
      expect(info.level).toBe('fair');
      expect(info.summary).toContain('价格较低');
    });
  });

  // ─── 维度标签生成 ───
  describe('维度标签', () => {
    it('高分时间维度 → "时间最优" 且高亮', () => {
      const ticket = makeTicket({
        scoreDetails: [
          { dimension: 'time', label: '时间匹配', score: 95, weight: 0.35, reason: '' },
          { dimension: 'price', label: '价格优势', score: 50, weight: 0.25, reason: '' },
          { dimension: 'duration', label: '耗时最短', score: 50, weight: 0.25, reason: '' },
          { dimension: 'comfort', label: '舒适度', score: 50, weight: 0.15, reason: '' },
        ],
      });
      const info = generateAIRecommendInfo(ticket);
      const timeTag = info.tags.find(t => t.label === '时间最优');
      expect(timeTag).toBeDefined();
      expect(timeTag!.highlight).toBe(true);
    });

    it('中分时间维度 → "时间合适" 不高亮', () => {
      const ticket = makeTicket({
        scoreDetails: [
          { dimension: 'time', label: '时间匹配', score: 75, weight: 0.35, reason: '' },
          { dimension: 'price', label: '价格优势', score: 50, weight: 0.25, reason: '' },
          { dimension: 'duration', label: '耗时最短', score: 50, weight: 0.25, reason: '' },
          { dimension: 'comfort', label: '舒适度', score: 50, weight: 0.15, reason: '' },
        ],
      });
      const info = generateAIRecommendInfo(ticket);
      const timeTag = info.tags.find(t => t.label === '时间合适');
      expect(timeTag).toBeDefined();
      expect(timeTag!.highlight).toBeFalsy();
    });

    it('高分价格维度 → "价格最优"', () => {
      const ticket = makeTicket({
        scoreDetails: [
          { dimension: 'time', label: '时间匹配', score: 50, weight: 0.35, reason: '' },
          { dimension: 'price', label: '价格优势', score: 95, weight: 0.25, reason: '' },
          { dimension: 'duration', label: '耗时最短', score: 50, weight: 0.25, reason: '' },
          { dimension: 'comfort', label: '舒适度', score: 50, weight: 0.15, reason: '' },
        ],
      });
      const info = generateAIRecommendInfo(ticket);
      expect(info.tags.some(t => t.label === '价格最优')).toBe(true);
    });

    it('高分耗时维度 → "耗时最短"', () => {
      const ticket = makeTicket({
        scoreDetails: [
          { dimension: 'time', label: '时间匹配', score: 50, weight: 0.35, reason: '' },
          { dimension: 'price', label: '价格优势', score: 50, weight: 0.25, reason: '' },
          { dimension: 'duration', label: '耗时最短', score: 95, weight: 0.25, reason: '' },
          { dimension: 'comfort', label: '舒适度', score: 50, weight: 0.15, reason: '' },
        ],
      });
      const info = generateAIRecommendInfo(ticket);
      expect(info.tags.some(t => t.label === '耗时最短')).toBe(true);
    });

    it('高分舒适维度 → "舒适度高"', () => {
      const ticket = makeTicket({
        scoreDetails: [
          { dimension: 'time', label: '时间匹配', score: 50, weight: 0.35, reason: '' },
          { dimension: 'price', label: '价格优势', score: 50, weight: 0.25, reason: '' },
          { dimension: 'duration', label: '耗时最短', score: 50, weight: 0.25, reason: '' },
          { dimension: 'comfort', label: '舒适度', score: 90, weight: 0.15, reason: '' },
        ],
      });
      const info = generateAIRecommendInfo(ticket);
      expect(info.tags.some(t => t.label === '舒适度高')).toBe(true);
    });

    it('低分维度不生成标签', () => {
      const ticket = makeTicket({
        punctuality: 70,
        scoreDetails: [
          { dimension: 'time', label: '时间匹配', score: 30, weight: 0.35, reason: '' },
          { dimension: 'price', label: '价格优势', score: 30, weight: 0.25, reason: '' },
          { dimension: 'duration', label: '耗时最短', score: 30, weight: 0.25, reason: '' },
          { dimension: 'comfort', label: '舒适度', score: 30, weight: 0.15, reason: '' },
        ],
      });
      const info = generateAIRecommendInfo(ticket);
      // 低分维度不应生成 "最优/最短/高" 标签
      expect(info.tags.some(t => t.label === '时间最优')).toBe(false);
      expect(info.tags.some(t => t.label === '价格最优')).toBe(false);
      expect(info.tags.some(t => t.label === '耗时最短')).toBe(false);
      expect(info.tags.some(t => t.label === '舒适度高')).toBe(false);
    });
  });

  // ─── 额外标签规则 ───
  describe('额外标签', () => {
    it('准点率>=95 → "准点率 96%" 高亮', () => {
      const info = generateAIRecommendInfo(makeTicket({ punctuality: 96 }));
      const tag = info.tags.find(t => t.label.includes('准点率'));
      expect(tag).toBeDefined();
      expect(tag!.highlight).toBe(true);
    });

    it('准点率 90-94 → "准点率 92%" 不高亮', () => {
      const info = generateAIRecommendInfo(makeTicket({ punctuality: 92 }));
      const tag = info.tags.find(t => t.label.includes('准点率'));
      expect(tag).toBeDefined();
      expect(tag!.highlight).toBeFalsy();
    });

    it('含WiFi → 生成WiFi标签', () => {
      const info = generateAIRecommendInfo(makeTicket({ amenities: ['WiFi'] }));
      expect(info.tags.some(t => t.label === '含WiFi')).toBe(true);
    });

    it('含免费餐食 → 生成餐饮标签', () => {
      const info = generateAIRecommendInfo(makeTicket({ amenities: ['免费餐食'] }));
      expect(info.tags.some(t => t.label === '含餐饮')).toBe(true);
    });

    it('直飞航班 → 生成直飞标签', () => {
      const info = generateAIRecommendInfo(makeTicket({
        type: 'flight',
        stops: 0,
      }));
      expect(info.tags.some(t => t.label === '直飞')).toBe(true);
    });

    it('最低价<=200 → "超值低价" 高亮', () => {
      const info = generateAIRecommendInfo(makeTicket({ lowestPrice: 178 }));
      const tag = info.tags.find(t => t.label === '超值低价');
      expect(tag).toBeDefined();
      expect(tag!.highlight).toBe(true);
    });

    it('不重复标签', () => {
      const info = generateAIRecommendInfo(makeTicket());
      const labels = info.tags.map(t => t.label);
      const unique = [...new Set(labels)];
      expect(labels.length).toBe(unique.length);
    });
  });

  // ─── 至少一个高亮 ───
  describe('高亮保障', () => {
    it('所有维度中分时仍至少有一个高亮', () => {
      const ticket = makeTicket({
        punctuality: 70,
        lowestPrice: 500,
        scoreDetails: [
          { dimension: 'time', label: '时间匹配', score: 75, weight: 0.35, reason: '' },
          { dimension: 'price', label: '价格优势', score: 75, weight: 0.25, reason: '' },
          { dimension: 'duration', label: '耗时最短', score: 75, weight: 0.25, reason: '' },
          { dimension: 'comfort', label: '舒适度', score: 70, weight: 0.15, reason: '' },
        ],
      });
      const info = generateAIRecommendInfo(ticket);
      expect(info.tags.some(t => t.highlight)).toBe(true);
    });
  });

  // ─── mock-data 中真实票数据 ───
  describe('真实mock数据', () => {
    it('TICKETS 中每张票都能生成有效 info', async () => {
      const { TICKETS } = await import('@/lib/mock-data');
      for (const ticket of TICKETS) {
        const info = generateAIRecommendInfo(ticket);
        expect(info.score).toBeGreaterThanOrEqual(0);
        expect(info.score).toBeLessThanOrEqual(10);
        expect(['excellent', 'great', 'good', 'fair']).toContain(info.level);
        expect(info.tags.length).toBeGreaterThan(0);
        expect(info.summary.length).toBeGreaterThan(0);
      }
    });

    it('不同票应产生不同标签组合', async () => {
      const { TICKETS } = await import('@/lib/mock-data');
      const tagSets = TICKETS.map(t => {
        const info = generateAIRecommendInfo(t);
        return info.tags.map(tag => tag.label).sort().join(',');
      });
      // 至少有 2 种不同的标签组合
      const unique = new Set(tagSets);
      expect(unique.size).toBeGreaterThanOrEqual(2);
    });
  });
});
