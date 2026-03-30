# Calendar Module Implementation

## Overview

Modul Calendar telah berhasil diimplementasikan untuk platform Nusantara Legacy. Implementasi ini mencakup types, API client, hooks, components, dan pages yang lengkap.

## Structure

```
nusantara-play-fe/
├── types/
│   └── calendar.ts                    # TypeScript types & interfaces
├── lib/api/
│   └── calendar.ts                    # API client functions
├── hooks/
│   ├── useCalendar.ts                 # Hook untuk calendar view
│   ├── useCalendarAgenda.ts           # Hook untuk agenda view
│   ├── useCalendarItem.ts             # Hook untuk calendar item detail
│   ├── useImportantDates.ts           # Hook untuk important dates management
│   ├── usePersonalSchedules.ts        # Hook untuk personal schedules
│   └── useCalendarInvites.ts          # Hook untuk invites management
├── components/calendar/
│   ├── CalendarView.tsx               # Main calendar component (monthly/weekly)
│   ├── CalendarAgenda.tsx             # Agenda/list view component
│   ├── CalendarFilter.tsx             # Filter component
│   ├── CalendarItemForm.tsx           # Form untuk create/edit items
│   ├── CalendarItemDetail.tsx         # Detail view modal
│   ├── CalendarInviteModal.tsx        # Modal untuk invite users
│   ├── CalendarInvites.tsx            # Component untuk my invites
│   └── index.ts                       # Export barrel file
└── app/
    ├── calendar/
    │   └── page.tsx                   # Public calendar page
    └── (protected)/
        ├── calendar/
        │   ├── my/page.tsx            # My personal schedules page
        │   └── invites/page.tsx       # My invites page
        └── admin/
            └── calendar/page.tsx      # Admin important dates page
```

## Features Implemented

### 1. **Types & Interfaces** (`types/calendar.ts`)
- ✅ All calendar entities and enums
- ✅ Request/Response types
- ✅ Query parameter types

### 2. **API Client** (`lib/api/calendar.ts`)
- ✅ 16 API functions covering all endpoints:
  - Get calendar (monthly/weekly)
  - Get calendar agenda
  - Get calendar item detail
  - Create/read/update/delete important dates
  - Create/read/update/delete personal schedules
  - Invite management (create, list, delete, respond)

### 3. **React Hooks**
- ✅ `useCalendar` - Fetch calendar data with filters
- ✅ `useCalendarAgenda` - Fetch agenda view with pagination
- ✅ `useCalendarItem` - Get calendar item detail
- ✅ `useImportantDates` - CRUD important dates
- ✅ `usePersonalSchedules` - CRUD personal schedules
- ✅ `useCalendarInvites` - Manage invitations

### 4. **Components**
- ✅ **CalendarView** - Interactive calendar grid (monthly/weekly view)
- ✅ **CalendarAgenda** - List view with pagination
- ✅ **CalendarFilter** - Comprehensive filtering options
- ✅ **CalendarItemForm** - Form with role-based visibility rules
- ✅ **CalendarItemDetail** - Detailed view modal
- ✅ **CalendarInviteModal** - User invitation interface
- ✅ **CalendarInvites** - Manage received invitations

### 5. **Pages**
- ✅ **Public Calendar** (`/calendar`) - View tanggal penting & events
- ✅ **My Calendar** (`/calendar/my`) - Manage personal schedules
- ✅ **My Invites** (`/calendar/invites`) - View & respond to invitations
- ✅ **Admin Calendar** (`/admin/calendar`) - Manage important dates

## Key Features

### Role-Based Access Control
- **Public**: View public calendar items and events
- **Publik (authenticated)**: Create private schedules
- **Pakar/Kurator**: Create private & internal schedules
- **Admin KPOTI**: Full access including public schedules
- **Kurator Daerah**: Manage important dates for their region

### Visibility System
- **Public**: Visible to everyone (including unauthenticated)
- **Internal**: Visible to admin_kpoti, kurator_daerah, pakar
- **Private**: Only creator and invited users

### Invitation System
- Invite users to private/internal calendar items
- Accept/decline invitations
- View invitation history
- Automatic filtering in calendar views

### Calendar Views
- **Monthly View**: Grid calendar with all dates
- **Weekly View**: 7-day view
- **Agenda View**: Flat list with pagination

### Filters
- Source filter (important_date, personal_schedule, event)
- Visibility filter
- Daerah filter
- Include/exclude events toggle
- Search by title/description

## Usage Examples

### Display Public Calendar
```tsx
import { CalendarViewComponent } from '@/components/calendar';

<CalendarViewComponent 
  year={2026} 
  month={3}
  onItemClick={(id) => console.log('Clicked:', id)}
/>
```

### Manage Personal Schedules
```tsx
import { usePersonalSchedules } from '@/hooks/usePersonalSchedules';

const { data, create, update, remove } = usePersonalSchedules();

// Create new schedule
await create({
  title: 'Meeting',
  start_date: '2026-03-01T10:00:00Z',
  visibility: 'private',
  all_day: false,
});
```

### Handle Invitations
```tsx
import { useCalendarInvites } from '@/hooks/useCalendarInvites';

const { myInvites, respond } = useCalendarInvites();

// Accept invitation
await respond(inviteId, { status: 'accepted' });
```

## Routes

### Public Routes
- `/calendar` - View public calendar

### Protected Routes (authenticated)
- `/calendar/my` - My personal schedules
- `/calendar/invites` - My invitations

### Admin Routes
- `/admin/calendar` - Manage important dates (admin_kpoti, kurator_daerah)

## Next Steps

1. **Backend Integration**: Connect to actual backend API
2. **Testing**: Add unit tests and integration tests
3. **Optimization**: Implement React Query for better caching
4. **UI/UX**: Refine calendar grid responsiveness
5. **Notifications**: Add real-time notifications for invitations
6. **Export**: Add ICS export functionality
7. **Recurring Events**: Support recurring calendar items

## Notes

- All components support dark mode
- Forms include validation
- Error handling implemented
- Loading states included
- Responsive design
- Accessibility considerations

## Dependencies

Make sure these dependencies are installed:
- `react`
- `next`
- `@/lib/supabase/client` (for auth)
- `@/hooks/useCurrentUser` (for user context)
- `@/hooks/useUsers` (for user selection)
