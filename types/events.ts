// Event Types

export enum EventJenis {
  TERAS_BERMAIN = 'teras_bermain',
  WORKSHOP = 'workshop',
  FESTIVAL = 'festival',
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RegistrationStatus {
  REGISTERED = 'registered',
  CHECKED_IN = 'checked_in',
  CANCELLED = 'cancelled',
}

export interface Event {
  id: string;
  nama: string;
  deskripsi: string;
  jenis: EventJenis;
  status: EventStatus;
  tanggal_mulai: string;
  tanggal_selesai: string;
  lokasi: string;
  daerah_id: string;
  latitude?: number;
  longitude?: number;
  kuota_peserta?: number;
  jumlah_peserta: number;
  banner_url?: string;
  galeri_foto?: string[];
  persyaratan?: string;
  formulir_custom?: Record<string, any>;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Relations
  daerah?: {
    id: string;
    nama: string;
    provinsi?: string;
  };
  organizer?: {
    id: string;
    full_name: string;
    email?: string;
  };
  is_registered?: boolean; // Indicates if the current user is registered for this event
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  data_pendaftaran: Record<string, any>;
  status: RegistrationStatus;
  checked_in_at?: string;
  certificate_id?: string;
  created_at: string;
  updated_at: string;
  // Relations
  event?: Event;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface CreateEventData {
  nama: string;
  deskripsi: string;
  jenis: EventJenis;
  tanggal_mulai: string;
  tanggal_selesai: string;
  lokasi: string;
  daerah_id: string;
  latitude?: number;
  longitude?: number;
  kuota_peserta?: number;
  banner_url?: string;
  galeri_foto?: string[];
  persyaratan?: string;
  formulir_custom?: Record<string, any>;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {}

export interface RegisterEventData {
  data_pendaftaran?: Record<string, any>;
}

export interface EventListParams {
  jenis?: EventJenis | string;
  type?: EventJenis | string;
  daerah_id?: string;
  startDate?: string;
  endDate?: string;
  status?: EventStatus | string;
  search?: string;
  sortBy?: 'tanggal_mulai' | 'created_at' | 'jumlah_peserta';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface EventListResponse {
  data: Event[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const EVENT_JENIS_LABELS: Record<EventJenis, string> = {
  [EventJenis.TERAS_BERMAIN]: 'Teras Bermain',
  [EventJenis.WORKSHOP]: 'Workshop',
  [EventJenis.FESTIVAL]: 'Festival',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  [EventStatus.DRAFT]: 'Draft',
  [EventStatus.PUBLISHED]: 'Dipublikasikan',
  [EventStatus.ONGOING]: 'Sedang Berlangsung',
  [EventStatus.COMPLETED]: 'Selesai',
  [EventStatus.CANCELLED]: 'Dibatalkan',
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  [RegistrationStatus.REGISTERED]: 'Terdaftar',
  [RegistrationStatus.CHECKED_IN]: 'Check-in',
  [RegistrationStatus.CANCELLED]: 'Dibatalkan',
};
