'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { protApi } from '@/lib/api/prot';
import { ProtCard } from '@/components/prot/ProtCard';
import { ProtFilter } from '@/components/prot/ProtFilter';
import { ProtNavigation } from '@/components/prot/ProtNavigation';
import { PROTEntity, PROTFilters } from '@/types/prot';

export default function ProtModulePage() {
  const [items, setItems] = useState<PROTEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PROTFilters>({
    page: 1,
    limit: 12,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await protApi.getAll(filters);
      if (response && response.data) {
        setItems(response.data);
        if (response.pagination) {
           setPagination(response.pagination);
        }
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Error fetching PROT data:', err);
      setError('Gagal memuat data. Silakan coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleFilterChange = (newFilters: PROTFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilter = () => {
    setFilters({
      page: 1,
      limit: 12,
    });
  };

  const handlePageChange = (newPage: number) => {
      setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <ProtNavigation />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Beranda
          </Link>
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-foreground font-medium">Daftar PROT</span>
        </div>

        {/* Page Title and Add Button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            Daftar Permainan Rakyat & Olahraga Tradisional
          </h1>
          <Link href="/prot/create" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md font-medium shadow hover:bg-primary/90 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Data Baru
          </Link>
        </div>

        {/* Filters Section */}
        <ProtFilter
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilter}
            isLoading={loading}
        />

        {/* Content */}
        {error && (
            <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-md border border-red-200">
                {error}
            </div>
        )}

        {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-80 bg-muted animate-pulse rounded-lg"></div>
                ))}
             </div>
        ) : items.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
                <svg className="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-foreground">Tidak ada data ditemukan</h3>
                <p className="text-muted-foreground">Coba sesuaikan filter pencarian Anda.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {items.map((item) => (
                <ProtCard key={item.id} item={item} />
            ))}
            </div>
        )}

        {/* Pagination */}
        {!loading && items.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="text-sm text-muted-foreground">
                Menampilkan {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} data
            </div>

            <div className="flex items-center gap-2">
                <button
                    disabled={!pagination.hasPrev}
                    onClick={() => handlePageChange(pagination.page - 1)}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                « Sebelumnya
                </button>

                <span className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md">
                    {pagination.page}
                </span>

                <button
                    disabled={!pagination.hasNext}
                    onClick={() => handlePageChange(pagination.page + 1)}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                Berikutnya »
                </button>
            </div>

             <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per halaman:</span>
                <select
                    value={filters.limit}
                    onChange={(e) => setFilters(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                    className="px-2 py-1 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="12">12</option>
                  <option value="24">24</option>
                  <option value="48">48</option>
                </select>
              </div>
            </div>
        )}
      </main>
    </div>
  );
}
