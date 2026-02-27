import { apiClient } from './client';
import type {
  CalendarResponse,
  CalendarAgendaResponse,
  CalendarItemDetail,
  CalendarItem,
  CalendarInvite,
  CalendarInviteWithUser,
  CalendarInviteWithItem,
  CalendarQueryParams,
  CalendarAgendaQueryParams,
  CreateImportantDateRequest,
  UpdateImportantDateRequest,
  CreatePersonalScheduleRequest,
  UpdatePersonalScheduleRequest,
  InviteUsersRequest,
  RespondToInviteRequest,
} from '@/types/calendar';

// Helper function to build query string
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// 1. Get Calendar (Monthly/Weekly)
export async function getCalendar(
  params: CalendarQueryParams
): Promise<CalendarResponse> {
  const queryString = buildQueryString(params);
  return apiClient.get<CalendarResponse>(`/calendar${queryString}`);
}

// 2. Get Calendar Agenda (Flat List)
export async function getCalendarAgenda(
  params: CalendarAgendaQueryParams
): Promise<CalendarAgendaResponse> {
  const queryString = buildQueryString(params);
  return apiClient.get<CalendarAgendaResponse>(`/calendar/agenda${queryString}`);
}

// 3. Get Calendar Item Detail
export async function getCalendarItem(id: string): Promise<CalendarItemDetail> {
  return apiClient.get<CalendarItemDetail>(`/calendar/${id}`);
}

// 4. Create Important Date
export async function createImportantDate(
  data: CreateImportantDateRequest
): Promise<CalendarItem> {
  return apiClient.post<CalendarItem>('/calendar/important-dates', data);
}

// 5. Get All Important Dates (Admin View)
export async function getImportantDates(): Promise<CalendarItem[]> {
  return apiClient.get<CalendarItem[]>('/calendar/important-dates');
}

// 6. Update Important Date
export async function updateImportantDate(
  id: string,
  data: UpdateImportantDateRequest
): Promise<CalendarItem> {
  return apiClient.patch<CalendarItem>(`/calendar/important-dates/${id}`, data);
}

// 7. Delete Important Date
export async function deleteImportantDate(id: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/calendar/important-dates/${id}`);
}

// 8. Create Personal Schedule
export async function createPersonalSchedule(
  data: CreatePersonalScheduleRequest
): Promise<CalendarItem> {
  return apiClient.post<CalendarItem>('/calendar/personal-schedule', data);
}

// 9. Get Personal Schedules
export async function getPersonalSchedules(): Promise<CalendarItem[]> {
  return apiClient.get<CalendarItem[]>('/calendar/personal-schedule');
}

// 10. Update Personal Schedule
export async function updatePersonalSchedule(
  id: string,
  data: UpdatePersonalScheduleRequest
): Promise<CalendarItem> {
  return apiClient.patch<CalendarItem>(`/calendar/personal-schedule/${id}`, data);
}

// 11. Delete Personal Schedule
export async function deletePersonalSchedule(id: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/calendar/personal-schedule/${id}`);
}

// 12. Invite Users to Calendar Item
export async function inviteUsers(
  calendarItemId: string,
  data: InviteUsersRequest
): Promise<CalendarInvite[]> {
  return apiClient.post<CalendarInvite[]>(`/calendar/${calendarItemId}/invites`, data);
}

// 13. Get Invites for Calendar Item
export async function getInvites(
  calendarItemId: string
): Promise<CalendarInviteWithUser[]> {
  return apiClient.get<CalendarInviteWithUser[]>(`/calendar/${calendarItemId}/invites`);
}

// 14. Remove Invite
export async function removeInvite(
  calendarItemId: string,
  userId: string
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(
    `/calendar/${calendarItemId}/invites/${userId}`
  );
}

// 15. Get My Invites
export async function getMyInvites(): Promise<CalendarInviteWithItem[]> {
  return apiClient.get<CalendarInviteWithItem[]>('/calendar/invites/my');
}

// 16. Respond to Invite
export async function respondToInvite(
  inviteId: string,
  data: RespondToInviteRequest
): Promise<CalendarInvite> {
  return apiClient.patch<CalendarInvite>(`/calendar/invites/${inviteId}`, data);
}
