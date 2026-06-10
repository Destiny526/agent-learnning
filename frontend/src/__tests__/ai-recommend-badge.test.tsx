import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AIRecommendBadge, { type AIRecommendInfo } from '@/components/results/AIRecommendBadge';

// ── 测试数据 ────────────────────────────────────────────────────────

const excellentInfo: AIRecommendInfo = {
  score: 9.4,
  level: 'excellent',
  tags: [
    { icon: '⏰', label: '时间最优', highlight: true },
    { icon: '💰', label: '价格最优', highlight: true },
    { icon: '⚡', label: '耗时最短', highlight: true },
    { icon: '✨', label: '舒适度高', highlight: true },
    { icon: '🎯', label: '准点率 96%', highlight: true },
    { icon: '📶', label: '含WiFi' },
    { icon: '🍱', label: '含餐饮' },
  ],
  summary: '该方案在时间、价格、耗时、舒适度方面综合表现优异，AI 强烈推荐',
};

const goodInfo: AIRecommendInfo = {
  score: 7.2,
  level: 'good',
  tags: [
    { icon: '🕐', label: '时间合适' },
    { icon: '🏷️', label: '价格合理' },
    { icon: '🕐', label: '耗时适中' },
    { icon: '🛋️', label: '舒适度较高' },
  ],
  summary: '该方案整体表现均衡，适合注重性价比的旅客',
};

const fairInfo: AIRecommendInfo = {
  score: 5.5,
  level: 'fair',
  tags: [
    { icon: '⏱️', label: '时间尚可' },
    { icon: '🏷️', label: '价格合理' },
    { icon: '⏱️', label: '耗时适中' },
    { icon: '💺', label: '舒适度一般' },
    { icon: '✅', label: '准点率 82%' },
  ],
  summary: '该方案价格较低但舒适度表现一般',
};

// ── 组件渲染测试 ────────────────────────────────────────────────────

describe('AIRecommendBadge 组件', () => {
  // ─── Compact 模式 ───
  describe('compact 模式', () => {
    it('渲染推荐指数', () => {
      render(<AIRecommendBadge info={excellentInfo} compact />);
      expect(screen.getByText('9.4')).toBeDefined();
      expect(screen.getByText('推荐指数')).toBeDefined();
    });

    it('渲染推荐等级标签', () => {
      const { container } = render(<AIRecommendBadge info={excellentInfo} compact />);
      const badge = container.querySelector('.bg-emerald-600');
      expect(badge).toBeDefined();
      expect(badge!.textContent).toContain('强烈推荐');
    });

    it('渲染推荐摘要', () => {
      render(<AIRecommendBadge info={excellentInfo} compact />);
      expect(screen.getByText(/该方案在时间/)).toBeDefined();
    });

    it('最多显示 3 个标签 (compact)', () => {
      render(<AIRecommendBadge info={excellentInfo} compact />);
      // 7 个标签，compact 模式最多显示 3 个 + 1 个 "+4" 按钮
      expect(screen.getByText('时间最优')).toBeDefined();
      expect(screen.getByText('价格最优')).toBeDefined();
      expect(screen.getByText('耗时最短')).toBeDefined();
      // 第 4 个标签不应显示
      expect(screen.queryByText('舒适度高')).toBeNull();
      // 应有 "+4" 按钮
      expect(screen.getByText('+4')).toBeDefined();
    });

    it('good 等级显示 "推荐"', () => {
      const { container } = render(<AIRecommendBadge info={goodInfo} compact />);
      const badge = container.querySelector('.bg-amber-600');
      expect(badge).toBeDefined();
      expect(badge!.textContent).toContain('推荐');
    });

    it('fair 等级显示 "可选"', () => {
      const { container } = render(<AIRecommendBadge info={fairInfo} compact />);
      const badge = container.querySelector('.bg-gray-500');
      expect(badge).toBeDefined();
      expect(badge!.textContent).toContain('可选');
    });
  });

  // ─── 完整模式 ───
  describe('完整模式', () => {
    it('渲染推荐指数', () => {
      render(<AIRecommendBadge info={excellentInfo} />);
      expect(screen.getByText('9.4')).toBeDefined();
    });

    it('渲染推荐等级标签', () => {
      const { container } = render(<AIRecommendBadge info={excellentInfo} />);
      const badge = container.querySelector('.bg-emerald-600');
      expect(badge).toBeDefined();
      expect(badge!.textContent).toContain('强烈推荐');
    });

    it('渲染推荐摘要', () => {
      render(<AIRecommendBadge info={excellentInfo} />);
      expect(screen.getByText(/该方案在时间/)).toBeDefined();
    });

    it('最多显示 4 个标签 (完整模式)', () => {
      render(<AIRecommendBadge info={excellentInfo} />);
      expect(screen.getByText('时间最优')).toBeDefined();
      expect(screen.getByText('价格最优')).toBeDefined();
      expect(screen.getByText('耗时最短')).toBeDefined();
      expect(screen.getByText('舒适度高')).toBeDefined();
      // 第 5 个标签不应显示
      expect(screen.queryByText('准点率 96%')).toBeNull();
    });

    it('有展开按钮时可展开', () => {
      render(<AIRecommendBadge info={excellentInfo} />);
      const expandBtn = screen.getByText(/展开全部 7 项/);
      expect(expandBtn).toBeDefined();
    });

    it('标签数量 <= 4 时不显示展开按钮', () => {
      render(<AIRecommendBadge info={goodInfo} />);
      expect(screen.queryByText(/展开全部/)).toBeNull();
    });
  });

  // ─── 不同等级颜色 ───
  describe('等级颜色', () => {
    it('excellent 使用 emerald 色系', () => {
      const { container } = render(<AIRecommendBadge info={excellentInfo} compact />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('emerald');
    });

    it('good 使用 amber 色系', () => {
      const { container } = render(<AIRecommendBadge info={goodInfo} compact />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('amber');
    });

    it('fair 使用 gray 色系', () => {
      const { container } = render(<AIRecommendBadge info={fairInfo} compact />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gray');
    });
  });

  // ─── 标签高亮 ───
  describe('标签高亮', () => {
    it('highlight=true 的标签有 emerald 样式', () => {
      render(<AIRecommendBadge info={excellentInfo} compact />);
      const tag = screen.getByText('时间最优');
      // tag 本身是 <span> 的子节点，检查最近的 span 祖先
      const tagSpan = tag.closest('span.inline-flex');
      expect(tagSpan).toBeDefined();
      expect(tagSpan!.className).toContain('emerald');
    });

    it('highlight=false 的标签有 gray 样式', () => {
      render(<AIRecommendBadge info={goodInfo} compact />);
      const tag = screen.getByText('时间合适');
      const tagSpan = tag.closest('span.inline-flex');
      expect(tagSpan).toBeDefined();
      expect(tagSpan!.className).toContain('gray');
    });
  });
});
