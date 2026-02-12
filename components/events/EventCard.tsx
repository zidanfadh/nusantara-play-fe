import Link from 'next/link';
import { Event, EVENT_JENIS_LABELS } from '@/types/events';
import { EventStatusBadge } from './EventStatusBadge';
import { CalendarIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';

interface EventCardProps {
  event: Event;
  showStatus?: boolean;
}

export function EventCard({ event, showStatus = false }: EventCardProps) {
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

  const isFullyBooked =
    event.kuota_peserta && event.jumlah_peserta >= event.kuota_peserta;

  return (
    <Link href={`/eventss/${event.id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer">
        {/* Banner */}
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt={event.nama}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-white text-4xl font-bold">
              {event.nama.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                {event.nama}
              </h3>
              <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                {EVENT_JENIS_LABELS[event.jenis]}
              </span>
            </div>
            {showStatus && (
              <div className="ml-2">
                <EventStatusBadge status={event.status} />
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {event.deskripsi}
          </p>

          {/* Info */}
          <div className="space-y-2">
            {/* Date */}
            <div className="flex items-center text-sm text-gray-700">
              <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
              <span>{formatDate(event.tanggal_mulai)}</span>
            </div>

            {/* Location */}
            <div className="flex items-center text-sm text-gray-700">
              <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
              <span className="line-clamp-1">{event.lokasi}</span>
            </div>

            {/* Participants */}
            {event.kuota_peserta && (
              <div className="flex items-center text-sm text-gray-700">
                <UsersIcon className="h-4 w-4 mr-2 text-gray-400" />
                <span>
                  {event.jumlah_peserta} / {event.kuota_peserta} peserta
                </span>
                {isFullyBooked && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                    Penuh
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Organizer */}
          {event.organizer && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Diselenggarakan oleh{' '}
                <span className="font-medium text-gray-700">
                  {event.organizer.full_name}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
