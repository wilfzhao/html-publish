'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  FolderOpen,
  Settings,
} from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid, primary: false },
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
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-50 md:z-auto flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          sidebarOpen ? 'w-48' : 'w-[72px]'
        } md:translate-x-0 h-full`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-gray-100 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <img
              src="/assets/brand/youchao-logo-horizontal.svg"
              alt="Youchao"
              className="h-[28px]"
            />
          </Link>
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

        {/* Version */}
        <div className={`p-3 border-t border-gray-100 ${sidebarOpen ? '' : 'px-2'}`}>
          <div className={`text-xs text-gray-400 ${sidebarOpen ? '' : 'text-center'}`}>
            0.1.7
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
