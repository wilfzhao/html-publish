'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  FolderOpen,
  Star,
  Upload,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/dashboard?tab=favorites', label: 'Favorites', icon: Star },
    { href: '/project/new', label: 'New Project', icon: Upload, primary: true },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname?.startsWith('/dashboard');
    return pathname === href;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-50 lg:z-auto flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          sidebarOpen ? 'w-64' : 'w-[72px]'
        } lg:translate-x-0 h-full`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-gray-100 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Upload className="w-4.5 h-4.5 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-gray-900">ProtoHost</span>
            )}
          </Link>
          <button
            onClick={() => { setSidebarOpen(!sidebarOpen); setMobileOpen(false); }}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md hover:bg-gray-100 text-gray-400"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg transition-all ${
                  sidebarOpen ? 'px-3 py-2.5' : 'justify-center px-2 py-2.5'
                } ${
                  item.primary
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : active
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className={`p-3 border-t border-gray-100 ${sidebarOpen ? '' : 'px-2'}`}>
          {user && (
            <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {user.name?.[0]?.toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                  <div className="text-xs text-gray-400 truncate">{user.email}</div>
                </div>
              )}
              <button
                onClick={logout}
                className={`text-gray-400 hover:text-gray-600 transition-colors ${
                  sidebarOpen ? '' : 'p-2'
                }`}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <span className="text-sm text-gray-400 hidden sm:block">v1.0.0</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
