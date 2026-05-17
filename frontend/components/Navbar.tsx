'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Rocket, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';


// Define navigation items
const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Internships', path: '/internships' },
  { name: 'Verify Certificate', path: '/certificates/verify' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 mx-auto w-full transition-all duration-300 ease-in-out ${scrolled
          ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800 py-2'
          : 'bg-transparent py-4'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group z-50">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                <Rocket size={20} strokeWidth={2.5} />
              </div>
              <span className={`font-bold text-xl tracking-tight text-slate-900 ${scrolled ? 'dark:text-white' : ''}`}>
                Certify<span className="text-blue-600">Now</span>
              </span>
            </Link>

            {/* Desktop Navigation (Center) */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                // EXPLICIT LOGIC:
                // 1. If item.path is '/', check if pathname is exactly '/'
                // 2. Otherwise, check if pathname starts with item.path
                const isActive = item.path === '/'
                  ? pathname === '/'
                  : pathname?.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${isActive
                      ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' // Active
                      : `text-gray-600 hover:text-blue-600 hover:bg-gray-50 ${scrolled ? 'dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800' : ''}` // Inactive
                      }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Right Side: Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 pl-2 pr-4 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-full hover:shadow-md transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[100px] truncate">
                      {user.name?.split(' ')[0]}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden py-1 z-50"
                        onMouseLeave={() => setUserMenuOpen(false)}
                      >
                        <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Signed in as</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.email}</p>
                        </div>
                        <Link
                          href={dashboardPath}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <LayoutDashboard size={16} /> Dashboard
                        </Link>
                        <button
                          onClick={logout}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left"
                        >
                          <LogOut size={16} /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/auth/login" className={`text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors ${scrolled ? 'dark:text-gray-300 dark:hover:text-blue-400' : ''}`}>Log in</Link>
                  <Link href="/auth/login" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full shadow-lg shadow-blue-200 transition-all hover:scale-105">Sign Up</Link>
                </div>
              )}
            </div>

            {/* Mobile Toggle */}
            <div className="flex items-center gap-2 md:hidden">

              <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-50">
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="md:hidden fixed top-[60px] left-0 right-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 shadow-xl z-50 rounded-b-2xl overflow-hidden">
              <div className="p-4 space-y-2">
                {navItems.map((item) => {
                  const isActive = item.path === '/'
                    ? pathname === '/'
                    : pathname?.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${isActive
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 font-bold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      {item.name}
                    </Link>
                  )
                })}
                <div className="h-px bg-gray-100 dark:bg-gray-800 my-4" />
                {user ? (
                  <>
                    <div className="px-4 py-2 flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">{user.name?.[0]?.toUpperCase()}</div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <Link href={dashboardPath} onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"><LayoutDashboard size={18} /> Go to Dashboard</Link>
                    <button onClick={() => { logout(); setIsOpen(false); }} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-base font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-left"><LogOut size={18} /> Sign Out</button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Link href="/auth/login" onClick={() => setIsOpen(false)} className="flex items-center justify-center px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800">Log in</Link>
                    <Link href="/auth/login" onClick={() => setIsOpen(false)} className="flex items-center justify-center px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md shadow-blue-200">Sign Up</Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}