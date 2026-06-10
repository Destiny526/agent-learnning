import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AIAnalysisPanel from '@/components/results/AIAnalysisPanel';
import type { Ticket } from '@/lib/mock-data';

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'TEST_001',
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

describe('AIAnalysisPanel 组件', () => {
  // ─── 基本渲染 ───
  describe('基本渲染', () => {
    it('渲染折叠状态的标题', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      expect(screen.getByText('AI 推荐分析')).toBeDefined();
    });

    it('渲染推荐指数', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      expect(screen.getByText('9.2')).toBeDefined();
    });

    it('渲染展开/收起按钮', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      expect(screen.getByText('展开')).toBeDefined();
    });

    it('初始状态为折叠', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      // 折叠状态下不应显示分析卡片
      expect(screen.queryByText('时间优势')).toBeNull();
      expect(screen.queryByText('价格优势')).toBeNull();
      expect(screen.queryByText('准点率分析')).toBeNull();
    });
  });

  // ─── 展开交互 ───
  describe('展开交互', () => {
    it('点击展开后显示分析卡片', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      expect(screen.getByText('时间优势')).toBeDefined();
      expect(screen.getByText('价格优势')).toBeDefined();
      expect(screen.getByText('准点率分析')).toBeDefined();
    });

    it('展开后显示收起按钮', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      expect(screen.getByText('收起')).toBeDefined();
    });

    it('展开后显示推荐标签', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      // 应该有推荐标签（如时间最优、价格最优等）
      const tags = screen.getAllByText(/最优|合适|较短|高/);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('再次点击收起', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      const header = screen.getByText('AI 推荐分析');
      fireEvent.click(header); // 展开
      expect(screen.getByText('时间优势')).toBeDefined();
      fireEvent.click(header); // 收起
      expect(screen.queryByText('时间优势')).toBeNull();
    });
  });

  // ─── 分析内容 ───
  describe('分析内容', () => {
    it('时间优势显示出发和到达时间', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      // 时间卡片默认展开，应显示详情
      expect(screen.getByText(/出发时间 09:00/)).toBeDefined();
    });

    it('价格优势显示最低票价', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      // 展开价格卡片
      fireEvent.click(screen.getByText('价格优势'));
      expect(screen.getByText(/最低票价/)).toBeDefined();
    });

    it('准点率分析显示准点率', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      // 展开准点率卡片
      fireEvent.click(screen.getByText('准点率分析'));
      expect(screen.getByText(/历史准点率/)).toBeDefined();
    });

    it('高准点率显示"准点率极高"', () => {
      render(<AIAnalysisPanel ticket={makeTicket({ punctuality: 96 })} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      expect(screen.getByText('准点率极高')).toBeDefined();
    });

    it('低准点率显示"准点率偏低"', () => {
      render(<AIAnalysisPanel ticket={makeTicket({ punctuality: 75 })} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      expect(screen.getByText('准点率偏低')).toBeDefined();
    });

    it('时间高分显示"时间非常合适"', () => {
      const ticket = makeTicket({
        scoreDetails: [
          { dimension: 'time', label: '时间匹配', score: 95, weight: 0.35, reason: '' },
          { dimension: 'price', label: '价格优势', score: 50, weight: 0.25, reason: '' },
          { dimension: 'duration', label: '耗时最短', score: 50, weight: 0.25, reason: '' },
          { dimension: 'comfort', label: '舒适度', score: 50, weight: 0.15, reason: '' },
        ],
      });
      render(<AIAnalysisPanel ticket={ticket} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      // "时间非常合适" 出现在分析卡片的 summary 中
      const summaries = screen.getAllByText('时间非常合适');
      expect(summaries.length).toBeGreaterThanOrEqual(1);
    });

    it('价格高分显示"价格最优"', () => {
      const ticket = makeTicket({
        scoreDetails: [
          { dimension: 'time', label: '时间匹配', score: 50, weight: 0.35, reason: '' },
          { dimension: 'price', label: '价格优势', score: 95, weight: 0.25, reason: '' },
          { dimension: 'duration', label: '耗时最短', score: 50, weight: 0.25, reason: '' },
          { dimension: 'comfort', label: '舒适度', score: 50, weight: 0.15, reason: '' },
        ],
      });
      render(<AIAnalysisPanel ticket={ticket} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      // "价格最优" 出现在标签和分析卡片中
      const elements = screen.getAllByText('价格最优');
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── 分析卡片展开/收起 ───
  describe('分析卡片展开', () => {
    it('时间优势卡片默认展开', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      // 时间卡片默认展开，应直接看到详情
      expect(screen.getByText(/全程耗时/)).toBeDefined();
    });

    it('点击价格优势卡片展开详情', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      fireEvent.click(screen.getByText('价格优势'));
      expect(screen.getByText(/最低票价/)).toBeDefined();
    });

    it('点击准点率分析卡片展开详情', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      fireEvent.click(screen.getByText('准点率分析'));
      expect(screen.getByText(/历史准点率/)).toBeDefined();
    });

    it('点击已展开的时间卡片可收起', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      // 时间卡片默认展开，点击收起
      fireEvent.click(screen.getByText('时间优势'));
      expect(screen.queryByText(/全程耗时/)).toBeNull();
    });
  });

  // ─── 不同票类型 ───
  describe('不同票类型', () => {
    it('航班显示天气提示', () => {
      const flight = makeTicket({
        type: 'flight',
        typeLabel: '飞机',
        typeIcon: '✈️',
        punctuality: 88,
      });
      render(<AIAnalysisPanel ticket={flight} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      fireEvent.click(screen.getByText('准点率分析'));
      expect(screen.getByText(/天气/)).toBeDefined();
    });

    it('高铁显示准点率提示', () => {
      const highSpeed = makeTicket({ type: 'high_speed' });
      render(<AIAnalysisPanel ticket={highSpeed} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      fireEvent.click(screen.getByText('准点率分析'));
      expect(screen.getByText(/高铁准点率/)).toBeDefined();
    });

    it('多座位类型显示所有价格', () => {
      render(<AIAnalysisPanel ticket={makeTicket()} />);
      fireEvent.click(screen.getByText('AI 推荐分析'));
      fireEvent.click(screen.getByText('价格优势'));
      expect(screen.getByText(/商务座.*¥1748/)).toBeDefined();
    });
  });
});
