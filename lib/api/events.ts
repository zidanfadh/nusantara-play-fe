import { apiClient } from './client';
import type {
  Event,
  EventRegistration,
  CreateEventData,
  UpdateEventData,
  RegisterEventData,
  EventListParams,
  EventListResponse,
} from '@/types/events';

const BASE_PATH = '/events';

/**
 * Helper function to build query string from params
 */
function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  
  const filteredParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  
  return filteredParams ? `?${filteredParams}` : '';
}

/**
 * Create a new event
 */
export async function createEvent(data: CreateEventData): Promise<Event> {
  return apiClient.post<Event>(BASE_PATH, data);
}

/**
 * List events with filters
 */
export async function listEvents(params?: EventListParams): Promise<EventListResponse> {
  const queryString = buildQueryString(params);
  return apiClient.get<EventListResponse>(`${BASE_PATH}${queryString}`);
}

/**
 * Get my created events
 */
export async function getMyEvents(params?: EventListParams): Promise<EventListResponse> {
  const queryString = buildQueryString(params);
  return apiClient.get<EventListResponse>(`${BASE_PATH}/my-events${queryString}`);
}

/**
 * Get event by ID
 */
export async function getEventById(id: string): Promise<Event> {
  return apiClient.get<Event>(`${BASE_PATH}/${id}`);
}

/**
 * Update event
 */
export async function updateEvent(id: string, data: UpdateEventData): Promise<Event> {
  return apiClient.patch<Event>(`${BASE_PATH}/${id}`, data);
}

/**
 * Delete event
 */
export async function deleteEvent(id: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`${BASE_PATH}/${id}`);
}

/**
 * Publish event
 */
export async function publishEvent(id: string): Promise<Event> {
  return apiClient.patch<Event>(`${BASE_PATH}/${id}/publish`);
}

/**
 * Cancel event
 */
export async function cancelEvent(id: string): Promise<Event> {
  return apiClient.patch<Event>(`${BASE_PATH}/${id}/cancel`);
}

/**
 * Register for event
 */
export async function registerForEvent(
  id: string,
  data?: RegisterEventData
): Promise<EventRegistration> {
  return apiClient.post<EventRegistration>(`${BASE_PATH}/${id}/register`, data);
}

/**
 * Cancel registration
 */
export async function cancelRegistration(id: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`${BASE_PATH}/${id}/register`);
}

/**
 * Get my registrations
 */
export async function getMyRegistrations(): Promise<EventRegistration[]> {
  return apiClient.get<EventRegistration[]>(`${BASE_PATH}/my-registrations`);
}

/**
 * Get event registrations (for organizer)
 */
export async function getEventRegistrations(id: string): Promise<EventRegistration[]> {
  return apiClient.get<EventRegistration[]>(`${BASE_PATH}/${id}/registrations`);
}

/**
 * Check-in attendee
 */
export async function checkInAttendee(
  eventId: string,
  userId: string
): Promise<EventRegistration> {
  return apiClient.patch<EventRegistration>(
    `${BASE_PATH}/${eventId}/registrations/${userId}/check-in`
  );
}

/**
 * Undo check-in
 */
export async function undoCheckIn(
  eventId: string,
  userId: string
): Promise<EventRegistration> {
  return apiClient.patch<EventRegistration>(
    `${BASE_PATH}/${eventId}/registrations/${userId}/undo-check-in`
  );
}
