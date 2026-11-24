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
    <Link href={`/events/${event.id}`}>
      <div className="group bg-surface-raised dark:bg-card rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-2 cursor-pointer h-full flex flex-col">
        {/* Banner */}
        <div className="relative h-56 overflow-hidden shrink-0">
          {event.banner_url ? (
            <img
              src={event.banner_url}
              alt={event.nama}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-brand-terracotta to-brand-amber flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
              <span className="font-display text-brand-brown text-4xl font-bold">
                {event.nama.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 pr-4">
            <span className="bg-primary text-surface-raised text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
              {EVENT_JENIS_LABELS[event.jenis]}
            </span>
            {showStatus && (
              <span className="bg-white/90 dark:bg-black/80 backdrop-blur-md text-foreground dark:text-gray-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                {event.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col flex-grow">
          <h3 className="text-xl font-bold text-foreground mb-2 leading-tight line-clamp-2">
            {event.nama}
          </h3>
          
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4 mt-auto">
            <CalendarIcon className="h-5 w-5" />
            <span>{formatDate(event.tanggal_mulai)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-6">
            <MapPinIcon className="h-5 w-5 shrink-0" />
            <span className="line-clamp-1">{event.lokasi}</span>
          </div>

          <div className="flex items-center justify-between border-t border-muted dark:border-border pt-4 mt-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-soft dark:bg-primary/20 flex items-center justify-center shrink-0">
                <UsersIcon className="h-4 w-4 text-primary-soft-foreground dark:text-primary-text" />
              </div>
              {event.kuota_peserta ? (
                <span className="text-xs font-bold text-foreground">
                  {isFullyBooked ? 'Full Booked' : `${event.jumlah_peserta}/${event.kuota_peserta} Peserta`}
                </span>
              ) : (
                <span className="text-xs font-bold text-foreground">Unlimited</span>
              )}
            </div>
            <span className="text-primary-text font-bold text-sm hover:underline whitespace-nowrap ml-2">
              Detail Event
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
