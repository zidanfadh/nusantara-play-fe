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
      <div className="group bg-[#ffffff] dark:bg-[#1e1e1e] rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-2 cursor-pointer h-full flex flex-col">
        {/* Banner */}
        <div className="relative h-56 overflow-hidden shrink-0">
          {event.banner_url ? (
            <img
              src={event.banner_url}
              alt={event.nama}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
              <span className="text-white text-4xl font-bold">
                {event.nama.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 pr-4">
            <span className="bg-[#9e3c24] dark:bg-[#D65C2E] text-[#ffffff] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
              {EVENT_JENIS_LABELS[event.jenis]}
            </span>
            {showStatus && (
              <span className="bg-white/90 dark:bg-black/80 backdrop-blur-md text-[#1c1c18] dark:text-gray-200 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                {event.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col flex-grow">
          <h3 className="text-xl font-bold text-[#1c1c18] dark:text-[#f7f3e8] mb-2 leading-tight line-clamp-2">
            {event.nama}
          </h3>
          
          <div className="flex items-center gap-2 text-[#747474] dark:text-[#9A8880] text-sm mb-4 mt-auto">
            <CalendarIcon className="h-5 w-5" />
            <span>{formatDate(event.tanggal_mulai)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-[#747474] dark:text-[#9A8880] text-sm mb-6">
            <MapPinIcon className="h-5 w-5 shrink-0" />
            <span className="line-clamp-1">{event.lokasi}</span>
          </div>

          <div className="flex items-center justify-between border-t border-[#e6e2dc] dark:border-[#404040] pt-4 mt-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#ffdad2] dark:bg-[#D65C2E]/20 flex items-center justify-center shrink-0">
                <UsersIcon className="h-4 w-4 text-[#3c0700] dark:text-[#D65C2E]" />
              </div>
              {event.kuota_peserta ? (
                <span className="text-xs font-bold text-[#1c1c18] dark:text-[#f7f3e8]">
                  {isFullyBooked ? 'Full Booked' : `${event.jumlah_peserta}/${event.kuota_peserta} Peserta`}
                </span>
              ) : (
                <span className="text-xs font-bold text-[#1c1c18] dark:text-[#f7f3e8]">Unlimited</span>
              )}
            </div>
            <span className="text-[#9e3c24] dark:text-[#D65C2E] font-bold text-sm hover:underline whitespace-nowrap ml-2">
              Detail Event
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
