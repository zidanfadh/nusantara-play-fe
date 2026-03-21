'use client';

import { useEffect, useState } from 'react';
import { UserProfile } from '@/types/user';
import { Daerah } from '@/types/daerah';
import { getUserStats } from '@/lib/api/users';
import { getDaerahStats } from '@/lib/api/daerah';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: {
      total: 0,
    },
    daerah: {
      total: 0,
      provinces: 0,
      kabupaten: 0,
      kota: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [userStats, daerahStats] = await Promise.all([
          getUserStats(),
          getDaerahStats(),
        ]);
        
        setStats({
          users: userStats,
          daerah: daerahStats,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1A5F7A]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl shadow-sm p-5 border-l-4 border-[#C04A21]">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-xs">Ringkasan sistem Nusantara Play</p>
      </div>

      {/* User Statistics */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center">
          <span className="h-5 w-1 bg-[#C04A21] rounded-full mr-2"></span>
          Statistik Pengguna
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Pengguna"
            value={stats.users.total}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            color="blue"
          />
        </div>
      </div>

      {/* Daerah Statistics */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center">
          <span className="h-5 w-1 bg-[#1A5F7A] rounded-full mr-2"></span>
          Statistik Daerah
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Daerah"
            value={stats.daerah.total}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="blue"
          />
          <StatCard
            title="Provinsi"
            value={stats.daerah.provinces}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            color="indigo"
          />
          <StatCard
            title="Kabupaten"
            value={stats.daerah.kabupaten}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="green"
          />
          <StatCard
            title="Kota"
            value={stats.daerah.kota}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="teal"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center">
          <span className="h-5 w-1 bg-[#D4A017] rounded-full mr-2"></span>
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="Kelola Pengguna"
            description="Lihat dan kelola pengguna sistem"
            href="/admin/users"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          <QuickActionCard
            title="Lihat Audit Log"
            description="Monitor aktivitas sistem"
            href="/admin/audit"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <QuickActionCard
            title="Kelola Daerah"
            description="Kelola data provinsi dan kabupaten/kota"
            href="/admin/daerah"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'indigo' | 'teal';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 text-[#1A5F7A]',
    green: 'bg-gradient-to-br from-green-50 to-green-100 text-green-600',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600',
    yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-[#D4A017]',
    indigo: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600',
    teal: 'bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600',
  };

  return (
    <div className="bg-card rounded-lg shadow-sm hover:shadow-lg border border-border p-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1.5">{value.toLocaleString()}</p>
        </div>
        <div className={`p-2.5 rounded-lg shadow-sm ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

function QuickActionCard({ title, description, href, icon }: QuickActionCardProps) {
  return (
    <a
      href={href}
      className="bg-card rounded-lg shadow-sm hover:shadow-lg border-2 border-border hover:border-[#C04A21] p-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 group"
    >
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-gradient-to-br from-[#D4A017] to-[#E5B028] text-white rounded-lg group-hover:shadow-md transition-all duration-300 group-hover:scale-105">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground group-hover:text-[#C04A21] transition-colors">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          <div className="mt-2 flex items-center text-[#1A5F7A] font-medium text-xs group-hover:text-[#C04A21] transition-colors">
            <span>Lihat selengkapnya</span>
            <svg className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
}
