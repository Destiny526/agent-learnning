'use client';

import Link from 'next/link';
import { useState } from 'react';

// ── Modal Component ────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Contact Form ───────────────────────────────────────────────────

function ContactForm({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h4 className="text-lg font-bold text-gray-900 mb-1">提交成功</h4>
        <p className="text-sm text-gray-500 mb-4">我们会尽快回复您</p>
        <button onClick={onClose} className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">关闭</button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
        <input type="text" placeholder="您的姓名" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
        <input type="email" placeholder="your@email.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">留言</label>
        <textarea rows={4} placeholder="请描述您的问题或建议..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 outline-none resize-none" />
      </div>
      <button onClick={() => setSubmitted(true)} className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
        提交
      </button>
    </div>
  );
}

// ── Feedback Form ──────────────────────────────────────────────────

function FeedbackForm({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h4 className="text-lg font-bold text-gray-900 mb-1">感谢您的反馈</h4>
        <p className="text-sm text-gray-500 mb-4">我们会认真改进</p>
        <button onClick={onClose} className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">关闭</button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">问题类型</label>
        <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 outline-none">
          <option>功能异常</option>
          <option>体验问题</option>
          <option>功能建议</option>
          <option>数据错误</option>
          <option>其他</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">问题描述</label>
        <textarea rows={4} placeholder="请详细描述您遇到的问题..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 outline-none resize-none" />
      </div>
      <button onClick={() => setSubmitted(true)} className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
        提交反馈
      </button>
    </div>
  );
}

// ── Guide Content ──────────────────────────────────────────────────

function GuideContent() {
  const steps = [
    { step: '01', title: '输入行程信息', desc: '在首页输入出发城市、目的城市和出发日期' },
    { step: '02', title: 'AI 智能分析', desc: '系统从 12306 获取实时数据，AI 进行 4 维度评分' },
    { step: '03', title: '查看推荐方案', desc: '浏览 AI 推荐、最便宜、最快、最舒适等方案' },
    { step: '04', title: '选择座位类型', desc: '进入详情页，选择合适的座位类型' },
    { step: '05', title: '提交订单', desc: '填写乘客信息，确认订单并提交' },
  ];
  return (
    <div className="space-y-4">
      {steps.map((s) => (
        <div key={s.step} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-600">{s.step}</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{s.title}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── FAQ Content ────────────────────────────────────────────────────

function FAQContent() {
  const faqs = [
    { q: '数据来源是什么？', a: '火车和高铁数据来自 12306 官方接口，航班数据来自各大航空公司。' },
    { q: 'AI 推荐的评分依据是什么？', a: '基于时间匹配（35%）、价格优势（25%）、耗时（25%）、舒适度（15%）四个维度综合评分。' },
    { q: '可以预订吗？', a: '目前为推荐工具，暂不支持直接预订。您可以查看方案后跳转至 12306 或航空公司官网购票。' },
    { q: '支持哪些城市？', a: '支持全国 300+ 城市，涵盖所有省会及主要旅游城市。' },
  ];
  return (
    <div className="space-y-3">
      {faqs.map((f, i) => (
        <details key={i} className="group rounded-xl bg-gray-50 border border-gray-100">
          <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium text-gray-900">
            {f.q}
            <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <div className="px-4 pb-4 text-sm text-gray-600">{f.a}</div>
        </details>
      ))}
    </div>
  );
}

// ── Support Cards Data ─────────────────────────────────────────────

const SUPPORT_CARDS = [
  {
    key: 'faq',
    title: '常见问题',
    desc: '查看常见问题解答',
    icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'from-blue-500 to-cyan-500',
    type: 'link' as const,
    href: '#',
  },
  {
    key: 'contact',
    title: '联系我们',
    desc: '提交问题或商务合作',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    color: 'from-violet-500 to-purple-500',
    type: 'modal' as const,
    modal: 'contact',
  },
  {
    key: 'guide',
    title: '使用指南',
    desc: '了解如何使用 AI 推荐',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    color: 'from-emerald-500 to-green-500',
    type: 'modal' as const,
    modal: 'guide',
  },
  {
    key: 'feedback',
    title: '意见反馈',
    desc: '帮助我们做得更好',
    icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
    color: 'from-amber-500 to-orange-500',
    type: 'modal' as const,
    modal: 'feedback',
  },
];

// ── Main Footer ────────────────────────────────────────────────────

export default function Footer() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const productLinks = [
    { label: '搜索行程', href: '/search' },
    { label: 'AI 推荐', href: '/search' },
    { label: '我的订单', href: '/orders' },
    { label: '收藏夹', href: '/favorites' },
  ];

  const socialLinks = [
    { label: '微信', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { label: '微博', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'B站', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  ];

  return (
    <>
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ─── Support Cards ─── */}
          <div className="py-10 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">帮助与支持</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SUPPORT_CARDS.map((card) => (
                <button
                  key={card.key}
                  onClick={() => card.type === 'modal' ? setActiveModal(card.modal) : null}
                  className="group flex items-start gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 hover:border-gray-600 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 text-left w-full"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-0.5">{card.title}</h4>
                    <p className="text-xs text-gray-400">{card.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ─── Main Content ─── */}
          <div className="py-10 grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <span className="text-lg font-bold">AI行程助手</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                基于 AI 算法的智能出行推荐平台。实时对接 12306 数据，4 维度智能评分，帮你找到最优出行方案。
              </p>
              {/* Social */}
              <div className="flex gap-2">
                {socialLinks.map((s) => (
                  <button key={s.label} className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors" title={s.label}>
                    <svg className="w-4.5 h-4.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">产品</h4>
              <ul className="space-y-2.5">
                {productLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* About */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">关于</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-gray-400">AI 智能行程助手 v1.0</span></li>
                <li><span className="text-sm text-gray-400">Next.js + FastAPI 微服务架构</span></li>
                <li><span className="text-sm text-gray-400">12306 实时数据对接</span></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">联系方式</h4>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  support@ai-travel.com
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  400-888-0000
                </li>
              </ul>
            </div>
          </div>

          {/* ─── Bottom ─── */}
          <div className="border-t border-gray-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} AI 行程助手. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">隐私政策</Link>
              <Link href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">服务条款</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Modals ─── */}
      <Modal open={activeModal === 'contact'} onClose={() => setActiveModal(null)} title="联系我们">
        <ContactForm onClose={() => setActiveModal(null)} />
      </Modal>
      <Modal open={activeModal === 'guide'} onClose={() => setActiveModal(null)} title="使用指南">
        <GuideContent />
      </Modal>
      <Modal open={activeModal === 'feedback'} onClose={() => setActiveModal(null)} title="意见反馈">
        <FeedbackForm onClose={() => setActiveModal(null)} />
      </Modal>
    </>
  );
}
