'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  submenus?: { title: string; href: string }[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    title: 'Manajemen Pengguna',
    href: '/admin/users',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    title: 'PROT',
    href: '/admin/prot',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
    submenus: [
      { title: 'Statistik', href: '/admin/prot' },
      { title: 'Semua PROT', href: '/admin/prot/all' },
      { title: 'Publish', href: '/admin/prot/publish' },
    ],
  },
  {
    title: 'Daerah',
    href: '/admin/daerah',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});

  const toggleSubmenu = (title: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <div className="bg-gradient-to-b from-[#1e3a4c] to-[#2D3E50] text-white w-64 flex-shrink-0 flex flex-col shadow-2xl">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 bg-[#0f2027] border-b-2 border-[#C04A21]/30">
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#D4A017] to-[#E5B028] bg-clip-text text-transparent tracking-wide">Nusantara Play</h1>
      </div>

      {/* Back to Dashboard Button */}
      <div className="p-3 border-b border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#D4A017] hover:bg-[#E5B028] text-[#2D2D2D] transition-all duration-200 hover:scale-105 hover:shadow-lg group"
        >
          <svg className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const hasSubmenu = item.submenus && item.submenus.length > 0;
          // For items with submenu, check if any submenu is active
          const isActive = hasSubmenu 
            ? item.submenus?.some(sub => pathname === sub.href) || false
            : pathname.startsWith(item.href);
          const isExpanded = expandedMenus[item.title];

          return (
            <div key={item.href}>
              {hasSubmenu ? (
                <>
                  <button
                    onClick={() => toggleSubmenu(item.title)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#C04A21] to-[#D65C2E] text-white shadow-lg scale-105' 
                        : 'text-gray-300 hover:bg-white/10 hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className={`mr-3 ${
                        isActive ? 'text-white' : 'text-[#D4A017] group-hover:text-[#E5B028]'
                      }`}>{item.icon}</span>
                      <span className="tracking-wide">{item.title}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && item.submenus && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.submenus.map((submenu) => {
                        const isSubmenuActive = pathname === submenu.href;
                        return (
                          <Link
                            key={submenu.href}
                            href={submenu.href}
                            className={`flex items-center px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                              isSubmenuActive 
                                ? 'bg-[#D4A017] text-[#2D2D2D] shadow-md' 
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className="ml-6">{submenu.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#C04A21] to-[#D65C2E] text-white shadow-lg scale-105' 
                      : 'text-gray-300 hover:bg-white/10 hover:text-white hover:translate-x-1'
                  }`}
                >
                  <span className={`mr-3 ${
                    isActive ? 'text-white' : 'text-[#D4A017] group-hover:text-[#E5B028]'
                  }`}>{item.icon}</span>
                  <span className="tracking-wide">{item.title}</span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 bg-[#0f2027] border-t-2 border-[#C04A21]/30">
        <p className="text-[10px] text-[#D4A017] text-center font-medium">
          Admin Panel v1.0
        </p>
      </div>
    </div>
  );
}
