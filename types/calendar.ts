// Calendar Module Types

// Enums
export enum CalendarItemType {
  IMPORTANT_DATE = 'important_date',
  PERSONAL_SCHEDULE = 'personal_schedule',
}

export enum CalendarItemVisibility {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  PRIVATE = 'private',
}

export enum CalendarInviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export enum CalendarView {
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  AGENDA = 'agenda',
}

export enum CalendarSourceFilter {
  IMPORTANT_DATE = 'important_date',
  PERSONAL_SCHEDULE = 'personal_schedule',
  EVENT = 'event',
}

// Base Entities
export interface CalendarItem {
  id: string;
  title: string;
  description: string | null;
  type: CalendarItemType | 'event';
  visibility: CalendarItemVisibility;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  color: string | null;
  daerah_id: string | null;
  event_id: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarInvite {
  id: string;
  calendar_item_id: string;
  user_id: string;
  status: CalendarInviteStatus;
  invited_by: string;
  created_at: string;
  updated_at: string;
}

// Response Objects
export interface CalendarEntry {
  id: string;
  title: string;
  description: string | null;
  type: 'important_date' | 'personal_schedule' | 'event';
  visibility: CalendarItemVisibility;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  color: string | null;
  source: 'calendar' | 'event';
  daerah_id: string | null;
  event_id: string | null;
  created_by: string | null;
}

export interface CalendarDayItem {
  date: string;
  entries: CalendarEntry[];
}

export interface CalendarResponse {
  year: number;
  month: number;
  view: CalendarView;
  items: CalendarDayItem[];
}

export interface CalendarAgendaResponse {
  data: CalendarEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CalendarItemDetail extends CalendarItem {
  daerah: {
    id: string;
    nama: string;
  } | null;
  creator: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  invites: CalendarInviteWithUser[];
}

export interface CalendarInviteWithUser extends CalendarInvite {
  user: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface CalendarInviteWithItem extends CalendarInvite {
  calendarItem: {
    id: string;
    title: string;
    type: CalendarItemType | 'event';
    visibility: CalendarItemVisibility;
    start_date: string;
    end_date: string | null;
    all_day: boolean;
    creator: {
      id: string;
      full_name: string;
    };
  };
  invitedByUser: {
    id: string;
    full_name: string;
  };
}

// Request Types
export interface CalendarQueryParams {
  year: number;
  month: number;
  view?: CalendarView;
  week?: number;
  source?: CalendarSourceFilter;
  visibility?: CalendarItemVisibility;
  daerah_id?: string;
  include_events?: boolean;
  search?: string;
}

export interface CalendarAgendaQueryParams {
  startDate: string;
  endDate: string;
  source?: CalendarSourceFilter;
  daerah_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateImportantDateRequest {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  color?: string;
  visibility: CalendarItemVisibility;
  daerah_id?: string;
}

export interface UpdateImportantDateRequest {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  all_day?: boolean;
  color?: string;
  visibility?: CalendarItemVisibility;
  daerah_id?: string;
}

export interface CreatePersonalScheduleRequest {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  color?: string;
  visibility?: CalendarItemVisibility;
}

export interface UpdatePersonalScheduleRequest {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  all_day?: boolean;
  color?: string;
  visibility?: CalendarItemVisibility;
}

export interface InviteUsersRequest {
  user_ids: string[];
}

export interface RespondToInviteRequest {
  status: CalendarInviteStatus.ACCEPTED | CalendarInviteStatus.DECLINED;
}
