import Link from 'next/link';
import { PROTEntity, PROTJenis } from '@/types/prot';

interface ProtCardProps {
  item: PROTEntity;
}

export function ProtCard({ item }: ProtCardProps) {
  return (
    <div className="bg-background border border-border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
      {/* Image Placeholder */}
      <div className="relative h-48 bg-muted shrink-0">
        {item.fotoKegiatan && item.fotoKegiatan.length > 0 ? (
          <img
            src={item.fotoKegiatan[0]}
            alt={item.nama}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-16 h-16 text-muted-foreground/30" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        
        {/* Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-3 py-1 rounded text-xs font-semibold text-white ${
              item.jenis === PROTJenis.PERMAINAN_RAKYAT ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            {item.jenis === PROTJenis.PERMAINAN_RAKYAT ? 'PERMAINAN RAKYAT' : 'OLAHRAGA TRADISIONAL'}
          </span>
        </div>

        {/* Status Badge (if not ARSIP_NASIONAL) */}
        {item.status !== 'ARSIP_NASIONAL' && (
          <div className="absolute top-3 right-3">
             <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
              {item.status}
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-foreground line-clamp-1" title={item.nama}>{item.nama}</h3>

        {/* Location */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="line-clamp-1">
            {item.kabkotaName || item.kabkotaKode || '-'}, {item.provinsiName || item.provinsiKode || '-'}
          </span>
        </div>

        {/* Target Usia */}
        <div className="text-sm">
          <span className="text-muted-foreground">Target Usia: </span>
          <span className="font-medium text-foreground">{item.targetUsia}</span>
        </div>

        <div className="flex-1"></div>

        {/* Button */}
        <Link
          href={`/prot/${item.id}`}
          className="w-full inline-block text-center px-4 py-2 bg-background border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors"
        >
          Lihat Detail
        </Link>
      </div>
    </div>
  );
}
