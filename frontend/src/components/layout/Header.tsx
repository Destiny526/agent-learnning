'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

const navLinks = [
  { href: '/', label: '首页' },
  { href: '/search', label: '智能推荐' },
  { href: '/search', label: '路线规划' },
  { href: '/#destinations', label: '热门目的地' },
  { href: '/orders', label: '我的订单' },
  { href: '#', label: '帮助中心' },
];

export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout, loadFromStorage } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isHome = pathname === '/';
  const transparent = isHome && !scrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        transparent
          ? 'bg-transparent'
          : 'bg-white/95 glass border-b border-gray-200/50 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${transparent ? 'bg-white/15 border border-white/20' : 'bg-primary-600'}`}>
              <svg className={`w-5 h-5 ${transparent ? 'text-white' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <span className={`text-lg font-bold tracking-tight ${transparent ? 'text-white' : 'text-gray-900'}`}>
              AI<span className={transparent ? 'text-white/80' : 'text-primary-600'}>行程助手</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href && link.href !== '#';
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    isActive
                      ? transparent
                        ? 'text-white bg-white/15'
                        : 'text-primary-600 bg-primary-50'
                      : transparent
                        ? 'text-white/70 hover:text-white hover:bg-white/10'
                        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Area */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* 通知铃铛 */}
                <Link
                  href="/notifications"
                  className={`relative p-2 rounded-lg transition-colors ${
                    transparent ? 'hover:bg-white/10' : 'hover:bg-gray-50'
                  }`}
                >
                  <svg className={`w-5 h-5 ${transparent ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </Link>

                <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    transparent ? 'hover:bg-white/10' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    transparent ? 'bg-white/20' : 'bg-primary-100'
                  }`}>
                    <span className={`text-sm font-medium ${transparent ? 'text-white' : 'text-primary-600'}`}>
                      {user?.nickname?.[0] || 'U'}
                    </span>
                  </div>
                  <span className={`text-sm hidden sm:block ${transparent ? 'text-white' : 'text-gray-700'}`}>
                    {user?.nickname}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                    <Link href="/profile" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>个人中心</Link>
                    <Link href="/notifications" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>通知中心</Link>
                    <Link href="/orders" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>我的订单</Link>
                    <Link href="/favorites" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>我的收藏</Link>
                    <hr className="my-1" />
                    <button onClick={() => { logout(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">退出登录</button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    transparent
                      ? 'text-white hover:bg-white/10'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    transparent
                      ? 'bg-white text-gray-900 hover:bg-white/90 shadow-sm'
                      : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/20'
                  }`}
                >
                  注册
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className={`lg:hidden p-2 rounded-lg ${transparent ? 'text-white' : 'text-gray-600'}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className={`lg:hidden border-t py-2 ${transparent ? 'border-white/10 bg-[#0a0f1e]/90 glass' : 'border-gray-100 bg-white'}`}>
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`block px-4 py-2.5 text-sm ${
                  pathname === link.href && link.href !== '#'
                    ? transparent ? 'text-white bg-white/10' : 'text-primary-600 bg-primary-50'
                    : transparent ? 'text-white/70' : 'text-gray-600'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="px-4 pt-3 flex gap-2">
                <Link href="/login" className={`flex-1 text-center py-2.5 text-sm rounded-lg font-medium ${transparent ? 'text-white border border-white/30' : 'text-gray-700 border border-gray-300'}`}>登录</Link>
                <Link href="/register" className="flex-1 text-center py-2.5 text-sm rounded-lg font-medium bg-primary-600 text-white">注册</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
