'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEvent } from '@/hooks/useEvents';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { EVENT_JENIS_LABELS, EventRegistration, EventStatus } from '@/types/events';
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import {
  publishEvent,
  cancelEvent,
  deleteEvent,
  registerForEvent,
} from '@/lib/api/events';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { user } = useCurrentUser();
  const { data: event, loading, error } = useEvent(eventId);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [userRegistration, setUserRegistration] = useState<EventRegistration | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (
      typeof err === 'object' &&
      err !== null &&
      'response' in err &&
      typeof (err as { response?: unknown }).response === 'object' &&
      (err as { response?: { data?: unknown } }).response !== null &&
      'data' in ((err as { response?: { data?: unknown } }).response ?? {}) &&
      typeof ((err as { response?: { data?: { message?: unknown } } }).response?.data?.message) === 'string'
    ) {
      return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
    }

    return err instanceof Error ? err.message : fallback;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const isOwner = user && event && user.id === event.created_by;
  const isFullyBooked = event && event.kuota_peserta && event.jumlah_peserta >= event.kuota_peserta;
  const handlePublish = async () => {
    if (!confirm('Apakah Anda yakin ingin mempublikasikan event ini?')) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await publishEvent(eventId);
      window.location.reload();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Gagal mempublikasikan event'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Apakah Anda yakin ingin membatalkan event ini?')) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await cancelEvent(eventId);
      window.location.reload();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Gagal membatalkan event'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus event ini? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await deleteEvent(eventId);
      router.push('/events/my-events');
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Gagal menghapus event'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!confirm('Apakah Anda yakin ingin mendaftar event ini?')) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const registration = await registerForEvent(eventId);
      setUserRegistration(registration);
      window.location.reload();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Gagal mendaftar event'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-muted-foreground">Memuat event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Event tidak ditemukan atau Anda tidak memiliki akses</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-0 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Back Button & Breadcrumb */}
        <div className="px-6 py-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="group flex items-center justify-center w-10 h-10 rounded-full bg-card hover:bg-primary-soft dark:hover:bg-primary/20 transition-colors duration-300"
          >
            <ArrowLeftIcon className="h-5 w-5 text-foreground group-hover:text-primary-soft-foreground dark:group-hover:text-white" />
          </button>
          <div className="flex items-center text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Link href="/events" className="hover:text-primary-text transition-colors">Events</Link>
            <span className="mx-2 text-xs">&gt;</span>
            <span className="text-foreground font-semibold">{event.nama}</span>
          </div>
        </div>

        {/* Action Error */}
        {actionError && (
          <div className="mx-6 mb-6 bg-danger-soft dark:bg-red-900/30 border-l-4 border-danger dark:border-red-500 rounded-md p-4 shadow-sm">
            <p className="text-danger dark:text-red-200">{actionError}</p>
          </div>
        )}

        {/* Hero Banner Section */}
        <div className="px-6">
          <div className="relative w-full h-[450px] rounded-3xl overflow-hidden shadow-2xl">
            {event.banner_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={event.banner_url}
                alt={event.nama}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-primary-soft-foreground dark:to-background flex items-center justify-center">
                <span className="text-white text-8xl font-bold">
                  {event.nama.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-primary-soft text-primary-soft-foreground rounded-full text-xs font-bold tracking-widest uppercase shadow-sm">
                  {EVENT_JENIS_LABELS[event.jenis]}
                </span>
                <span className="px-4 py-2 bg-green-100 dark:bg-green-900/80 text-green-800 dark:text-green-100 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm">
                  {event.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="px-6 py-12 flex flex-col lg:flex-row gap-12">
          {/* Main Column (2/3) */}
          <div className="lg:w-2/3 space-y-12">
            {/* Title & Description */}
            <section className="space-y-6">
              <h1 className="text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                {event.nama}
              </h1>
              <div className="prose prose-stone dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-lg">
                <p className="whitespace-pre-wrap">{event.deskripsi}</p>
              </div>
            </section>

            {/* Requirements */}
            {event.persyaratan && (
              <section className="p-10 rounded-3xl bg-card shadow-sm">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-foreground">
                  <ClipboardDocumentListIcon className="h-8 w-8 text-primary-text" />
                  Persyaratan Peserta
                </h3>
                <ul className="space-y-4">
                  {event.persyaratan.split('\n').filter((req: string) => req.trim() !== '').map((req: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircleIcon className="h-6 w-6 text-primary-text shrink-0 mt-0.5" />
                      <span className="text-muted-foreground font-medium leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Admin Panel (Manage Event) */}
            {isOwner && (
              <section className="p-10 rounded-3xl bg-muted shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">Kelola Event</h3>
                    <p className="text-sm text-muted-foreground">Hanya terlihat oleh pemilik atau pengelola event.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {event.status === EventStatus.DRAFT && (
                      <button
                        onClick={handlePublish}
                        disabled={actionLoading}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        Publikasikan
                      </button>
                    )}
                    {event.status === EventStatus.DRAFT && (
                      <Link
                        href={`/events/${eventId}/edit`}
                        className="px-6 py-3 bg-surface-raised dark:bg-card text-foreground rounded-xl font-bold text-sm hover:opacity-80 transition-all flex items-center gap-2 shadow-sm"
                      >
                        <PencilIcon className="h-5 w-5" />
                        Edit Event
                      </Link>
                    )}
                    <Link
                      href={`/events/${eventId}/registrations`}
                      className="px-6 py-3 bg-surface-raised dark:bg-card text-foreground rounded-xl font-bold text-sm hover:opacity-80 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <UsersIcon className="h-5 w-5" />
                      Kelola Peserta
                    </Link>
                    {[EventStatus.PUBLISHED, EventStatus.ONGOING].includes(event.status) && (
                      <button
                        onClick={handleCancel}
                        disabled={actionLoading}
                        className="px-6 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                      >
                        <XCircleIcon className="h-5 w-5" />
                        Batalkan Event
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading}
                      className="px-6 py-3 bg-danger-soft dark:bg-red-900/40 text-danger dark:text-red-200 rounded-xl font-bold text-sm hover:opacity-80 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                      <TrashIcon className="h-5 w-5" />
                      Hapus Event
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar (1/3) */}
          <div className="lg:w-1/3 space-y-8">
            {/* Main CTA & Info Card */}
            <div className="bg-surface-raised dark:bg-card rounded-3xl p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.06)] border border-border/10 lg:sticky lg:top-28">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-soft dark:bg-primary/20 flex items-center justify-center shrink-0">
                      <CalendarIcon className="h-6 w-6 text-primary-text" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tanggal</p>
                      <p className="font-bold text-foreground">{formatDate(event.tanggal_mulai)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-soft dark:bg-primary/20 flex items-center justify-center shrink-0">
                      <MapPinIcon className="h-6 w-6 text-primary-text" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Lokasi</p>
                      <p className="font-bold text-foreground leading-tight">{event.lokasi}</p>
                      {event.daerah && <p className="text-sm text-muted-foreground mt-0.5">{event.daerah.nama}</p>}
                    </div>
                  </div>

                  {event.kuota_peserta && (
                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Kapasitas Peserta</span>
                        <span className="text-sm font-bold text-foreground">
                          {event.jumlah_peserta}/{event.kuota_peserta} Terisi
                        </span>
                      </div>
                      {isFullyBooked && (
                        <div className="mt-2 inline-block px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs rounded-full font-bold">
                          Kapasitas Penuh
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User Registration Button */}
                {!isOwner && event.status === EventStatus.PUBLISHED && (
                  !user ? (
                    <Link
                      href={`/login?redirectTo=/events/${eventId}`}
                      className="block w-full py-4 bg-primary text-primary-foreground rounded-xl font-black text-lg text-center shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      MASUK UNTUK DAFTAR
                    </Link>
                  ) : event.is_registered || userRegistration ? (
                    <button
                      disabled
                      className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg shadow-lg opacity-80 cursor-not-allowed flex items-center justify-center gap-2 disabled:opacity-80 transition-all"
                    >
                      <CheckCircleIcon className="h-6 w-6" />
                      TERDAFTAR
                    </button>
                  ) : (
                    !isFullyBooked && (
                      <button
                        onClick={handleRegister}
                        disabled={actionLoading}
                        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {actionLoading ? 'MENDAFTAR...' : 'DAFTAR SEKARANG'}
                      </button>
                    )
                  )
                )}
              </div>
            </div>

            {/* Contact Card */}
            {(event.contact_person || event.contact_phone || event.contact_email) && (
              <div className="bg-card rounded-3xl p-8 space-y-4 shadow-sm border border-border/10">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-border/20 pb-2">
                  Kontak Panitia
                </h4>
                <div className="space-y-4 pt-2">
                  {event.contact_person && (
                    <div className="flex items-center gap-4">
                      <UsersIcon className="text-primary-text h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{event.contact_person}</p>
                        <p className="text-xs text-muted-foreground">PIC Event</p>
                      </div>
                    </div>
                  )}
                  {event.contact_phone && (
                    <div className="flex items-center gap-4">
                      <PhoneIcon className="text-primary-text h-5 w-5 shrink-0" />
                      <p className="text-sm font-medium text-foreground">{event.contact_phone}</p>
                    </div>
                  )}
                  {event.contact_email && (
                    <div className="flex items-center gap-4">
                      <EnvelopeIcon className="text-primary-text h-5 w-5 shrink-0" />
                      <p className="text-sm font-medium text-foreground break-all">{event.contact_email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Organizer Card */}
            {event.organizer && (
              <div className="bg-card rounded-3xl p-8 space-y-4 shadow-sm border border-border/10">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-border/20 pb-2">
                  Penyelenggara
                </h4>
                <div className="flex items-center gap-4 pt-2">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    <span className="text-2xl font-bold text-muted-foreground">
                      {event.organizer.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground leading-tight">{event.organizer.full_name}</p>
                    <p className="text-xs text-primary-text font-semibold mt-1">Verified Organizer</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
