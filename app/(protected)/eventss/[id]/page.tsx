'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEvent } from '@/hooks/useEvents';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { EVENT_JENIS_LABELS, EventStatus } from '@/types/events';
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
  cancelRegistration,
} from '@/lib/api/events';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { user } = useCurrentUser();
  const { data: event, loading, error } = useEvent(eventId);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [userRegistration, setUserRegistration] = useState<any>(null);

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
  const canRegister = user && event && event.status === EventStatus.PUBLISHED && !isFullyBooked;

  const handlePublish = async () => {
    if (!confirm('Apakah Anda yakin ingin mempublikasikan event ini?')) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await publishEvent(eventId);
      window.location.reload();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Gagal mempublikasikan event');
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
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Gagal membatalkan event');
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
      router.push('/eventss/my-events');
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Gagal menghapus event');
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
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Gagal mendaftar event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!confirm('Apakah Anda yakin ingin membatalkan pendaftaran?')) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await cancelRegistration(eventId);
      setUserRegistration(null);
      window.location.reload();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Gagal membatalkan pendaftaran');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Memuat event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Event tidak ditemukan atau Anda tidak memiliki akses</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Kembali
        </button>

        {/* Action Error */}
        {actionError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{actionError}</p>
          </div>
        )}

        {/* Banner */}
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt={event.nama}
            className="w-full h-96 object-cover rounded-lg shadow-md mb-6"
          />
        ) : (
          <div className="w-full h-96 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg shadow-md mb-6 flex items-center justify-center">
            <span className="text-white text-8xl font-bold">
              {event.nama.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.nama}</h1>
                  <div className="flex items-center space-x-3">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                      {EVENT_JENIS_LABELS[event.jenis]}
                    </span>
                    <EventStatusBadge status={event.status} />
                  </div>
                </div>
              </div>

              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{event.deskripsi}</p>
              </div>

              {event.persyaratan && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Persyaratan Peserta</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{event.persyaratan}</p>
                </div>
              )}
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kelola Event</h3>
                <div className="flex flex-wrap gap-3">
                  {event.status === EventStatus.DRAFT && (
                    <button
                      onClick={handlePublish}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Publikasikan
                    </button>
                  )}
                  {event.status === EventStatus.DRAFT && (
                    <Link
                      href={`/eventss/${eventId}/edit`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PencilIcon className="h-5 w-5 mr-2" />
                      Edit Event
                    </Link>
                  )}
                  <Link
                    href={`/eventss/${eventId}/registrations`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                    Kelola Peserta
                  </Link>
                  {[EventStatus.PUBLISHED, EventStatus.ONGOING].includes(event.status) && (
                    <button
                      onClick={handleCancel}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                    >
                      <XCircleIcon className="h-5 w-5 mr-2" />
                      Batalkan Event
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    <TrashIcon className="h-5 w-5 mr-2" />
                    Hapus Event
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Event</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Tanggal Mulai</p>
                    <p className="text-gray-600">{formatDate(event.tanggal_mulai)}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Tanggal Selesai</p>
                    <p className="text-gray-600">{formatDate(event.tanggal_selesai)}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Lokasi</p>
                    <p className="text-gray-600">{event.lokasi}</p>
                    {event.daerah && (
                      <p className="text-gray-500 text-xs mt-1">{event.daerah.nama}</p>
                    )}
                  </div>
                </div>
                {event.kuota_peserta && (
                  <div className="flex items-start">
                    <UsersIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">Kuota Peserta</p>
                      <p className="text-gray-600">
                        {event.jumlah_peserta} / {event.kuota_peserta} peserta
                      </p>
                      {isFullyBooked && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          Penuh
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info */}
            {(event.contact_person || event.contact_phone || event.contact_email) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kontak</h3>
                <div className="space-y-3">
                  {event.contact_person && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Nama:</span> {event.contact_person}
                    </p>
                  )}
                  {event.contact_phone && (
                    <div className="flex items-center text-sm text-gray-700">
                      <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                      {event.contact_phone}
                    </div>
                  )}
                  {event.contact_email && (
                    <div className="flex items-center text-sm text-gray-700">
                      <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                      {event.contact_email}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Registration Button for Users */}
            {!isOwner && canRegister && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <button
                  onClick={handleRegister}
                  disabled={actionLoading}
                  className="w-full px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  Daftar Event
                </button>
              </div>
            )}

            {/* Organizer */}
            {event.organizer && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Penyelenggara</h3>
                <p className="text-sm font-medium text-gray-700">{event.organizer.full_name}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
