'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

// ── Data ────────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  { icon: '🏖️', label: '周末旅行', prompt: '帮我规划一个周末从北京到上海的旅行，预算3000元，2天，希望舒适一些' },
  { icon: '💼', label: '商务出差', prompt: '明天早上从北京去上海出差，当天往返，要最快最方便的方案' },
  { icon: '💰', label: '预算旅行', prompt: '从北京到上海，预算有限500元以内，什么交通方式最省钱' },
  { icon: '🚄', label: '高铁优先', prompt: '下周从北京去上海，优先选高铁，上午出发，推荐准点率高的车次' },
];

const DESTINATIONS = [
  { name: '上海', price: 168, trips: 51, image: 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=400&h=300&fit=crop' },
  { name: '广州', price: 320, trips: 38, image: 'https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?w=400&h=300&fit=crop' },
  { name: '成都', price: 280, trips: 42, image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=300&fit=crop' },
  { name: '杭州', price: 150, trips: 29, image: 'https://images.unsplash.com/photo-1598887142487-3c854d51eabb?w=400&h=300&fit=crop' },
  { name: '深圳', price: 350, trips: 35, image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=300&fit=crop' },
  { name: '南京', price: 180, trips: 33, image: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=300&fit=crop' },
  { name: '武汉', price: 220, trips: 28, image: 'https://images.unsplash.com/photo-1610312278520-bcc893a3ff1d?w=400&h=300&fit=crop' },
  { name: '西安', price: 260, trips: 25, image: 'https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=400&h=300&fit=crop' },
];

const AI_CAPABILITIES = [
  { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', title: '智能时间匹配', desc: 'AI 自动匹配最优出发时间', color: 'from-blue-500 to-cyan-500' },
  { icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', title: '多方式比价', desc: '高铁、航班、火车一站式比价', color: 'from-violet-500 to-purple-500' },
  { icon: 'M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-3-3m3 3l3-3', title: 'AI 多维评分', desc: '时间·价格·舒适·准点率 4 维评分', color: 'from-emerald-500 to-green-500' },
  { icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', title: '行程规划', desc: '自动生成完整行程方案', color: 'from-pink-500 to-rose-500' },
];

// ── Hooks ───────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Typing Animation ────────────────────────────────────────────────

function TypingPlaceholder() {
  const phrases = [
    '帮我规划一个周末去上海的旅行...',
    '明天北京到上海，推荐最快的高铁...',
    '预算1000元，北京到成都怎么走最划算...',
    '下周出差，需要上午到达上海...',
  ];
  const [text, setText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[phraseIdx];
    const speed = deleting ? 30 : 60;

    if (!deleting && charIdx < phrase.length) {
      const t = setTimeout(() => setCharIdx(charIdx + 1), speed);
      setText(phrase.slice(0, charIdx + 1));
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx >= phrase.length) {
      const t = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => setCharIdx(charIdx - 1), speed);
      setText(phrase.slice(0, charIdx - 1));
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      setDeleting(false);
      setPhraseIdx((phraseIdx + 1) % phrases.length);
    }
  }, [charIdx, deleting, phraseIdx]);

  return <span className="text-gray-400">{text}<span className="animate-pulse text-gray-300">|</span></span>;
}

// ── Page Component ──────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const trust = useInView();
  const capabilities = useInView();
  const destinations = useInView();

  const handleSubmit = () => {
    if (!input.trim()) return;
    router.push(`/planner?q=${encodeURIComponent(input.trim())}`);
  };

  const handleExampleClick = (prompt: string) => {
    setInput(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen">
      {/* ═══════════════ HERO — AI AGENT INPUT ═══════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#06091a] via-[#0d1b3a] to-[#162d5a]" />
        <div className="absolute inset-0 hero-grid" />

        {/* Animated glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-blue-600/10 blur-[160px] breathe" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[550px] h-[550px] rounded-full bg-violet-600/8 blur-[140px] breathe" style={{ animationDelay: '3s' }} />
        <div className="absolute top-[30%] right-[15%] w-[300px] h-[300px] rounded-full bg-cyan-500/6 blur-[100px] breathe" style={{ animationDelay: '5s' }} />
        <div className="absolute bottom-[30%] left-[10%] w-[250px] h-[250px] rounded-full bg-pink-500/5 blur-[90px] breathe" style={{ animationDelay: '7s' }} />

        {/* Scan line */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" style={{ animation: 'scanLine 10s linear infinite' }} />
        </div>

        {/* Particles */}
        {[...Array(20)].map((_, i) => (
          <div key={i}
            className="absolute rounded-full bg-white particle"
            style={{
              width: `${1 + (i % 2)}px`, height: `${1 + (i % 2)}px`,
              left: `${5 + (i * 4.7) % 90}%`, top: `${10 + (i * 7.3) % 80}%`,
              opacity: 0.08 + (i % 4) * 0.05,
              ['--duration' as string]: `${16 + (i % 6) * 2}s`,
              ['--delay' as string]: `${(i % 5) * 1.5}s`,
            }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/6 border border-white/10 mb-8 animate-fade-in-up">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-white/55">AI Agent · 自然语言输入 · 智能行程规划</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 tracking-tight leading-[1.1] animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
            <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              你的 AI 出行助手
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-white/45 max-w-lg mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
            用自然语言描述你的出行需求，AI 为你规划最优方案
          </p>

          {/* ── Main Input Area ── */}
          <div className={`relative mx-auto transition-all duration-300 animate-scale-in ${isFocused ? 'max-w-[720px]' : 'max-w-[680px]'}`} style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
            {/* Glow ring */}
            <div className={`absolute -inset-1 rounded-3xl transition-opacity duration-500 ${isFocused ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-ai-500/30 via-primary-500/30 to-cyan-500/30 blur-sm" />
            </div>

            {/* Input container */}
            <div className="relative bg-white/[0.08] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl shadow-black/20 overflow-hidden">
              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={handleKeyDown}
                  placeholder=""
                  rows={3}
                  className="w-full px-6 pt-6 pb-2 bg-transparent text-white text-base md:text-lg leading-relaxed resize-none focus:outline-none placeholder-transparent"
                />
                {!input && (
                  <div className="absolute left-6 top-6 pointer-events-none text-base md:text-lg leading-relaxed">
                    <TypingPlaceholder />
                  </div>
                )}
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-4 pb-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/25 px-2 py-1 rounded-md bg-white/5 border border-white/5">
                    Enter 发送 · Shift+Enter 换行
                  </span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-ai-600 to-primary-600 text-white text-sm font-semibold rounded-xl hover:from-ai-500 hover:to-primary-500 hover:shadow-lg hover:shadow-ai-600/25 active:scale-[0.97] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  开始规划
                </button>
              </div>
            </div>
          </div>

          {/* ── Quick Examples ── */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 animate-fade-in-up" style={{ animationDelay: '0.45s', animationFillMode: 'backwards' }}>
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex.label}
                onClick={() => handleExampleClick(ex.prompt)}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm hover:bg-white/[0.1] hover:border-white/[0.15] hover:text-white/90 transition-all"
              >
                <span className="text-base">{ex.icon}</span>
                <span className="font-medium">{ex.label}</span>
              </button>
            ))}
          </div>

          {/* ── Entry points ── */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.55s', animationFillMode: 'backwards' }}>
            <button
              onClick={() => router.push('/search?origin=北京&destination=上海&date=2026-06-10')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.06] transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              搜索车次
            </button>
            <button
              onClick={() => router.push('/compare')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.06] transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              方案对比
            </button>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* ═══════════════ TRUST BAR ═══════════════ */}
      <section ref={trust.ref} className="relative -mt-8 z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/40 border border-gray-100/80 px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-0">
            {[
              { num: '300+', label: '覆盖城市', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { num: '50万+', label: '日均路线查询', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { num: '95%', label: '推荐满意率', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
              { num: '<1s', label: 'AI 响应时间', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            ].map((item, i) => (
              <div key={item.label}
                className={`flex items-center gap-3 px-4 py-2 ${i < 3 ? 'md:border-r md:border-gray-100' : ''} transition-all duration-500 ${trust.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
                style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                </div>
                <div>
                  <div className="text-xl font-extrabold text-gray-900 tabular-nums leading-tight">{item.num}</div>
                  <div className="text-[11px] text-gray-500">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ AI CAPABILITIES ═══════════════ */}
      <section ref={capabilities.ref} className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ai-50 text-ai-600 text-xs font-medium mb-3">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              AI 核心能力
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">智能出行，从这里开始</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">AI 覆盖出行全场景，让每一次决策更精准</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {AI_CAPABILITIES.map((cap, i) => (
              <div key={cap.title}
                className={`group bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 ${capabilities.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: `${i * 100}ms` }}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cap.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={cap.icon} />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5">{cap.title}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOT DESTINATIONS ═══════════════ */}
      <section ref={destinations.ref} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">热门目的地</h2>
            <p className="text-sm text-gray-500">发现你的下一段旅程</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
            {DESTINATIONS.map((d, i) => (
              <button key={d.name} onClick={() => setInput(`帮我规划从北京到${d.name}的行程`)}
                className={`rounded-2xl overflow-hidden card-hover bg-white border border-gray-100 transition-all duration-500 ${destinations.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="h-36 relative overflow-hidden group">
                  <img src={d.image} alt={d.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
                  <div className="absolute inset-0 flex items-end p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-white font-bold text-lg drop-shadow-md">{d.name}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-xs text-gray-400">¥</span>
                    <span className="text-xl font-bold text-primary-600">{d.price}</span>
                    <span className="text-xs text-gray-400">起</span>
                  </div>
                  <div className="text-xs text-gray-400">{d.trips} 个车次/航班</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
