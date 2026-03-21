import { EventStatus, EVENT_STATUS_LABELS } from '@/types/events';

interface EventStatusBadgeProps {
  status: EventStatus;
}

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case EventStatus.DRAFT:
        return 'bg-muted text-muted-foreground border-border';
      case EventStatus.PUBLISHED:
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case EventStatus.ONGOING:
        return 'bg-green-100 text-green-700 border-green-300';
      case EventStatus.COMPLETED:
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case EventStatus.CANCELLED:
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
        status
      )}`}
    >
      {EVENT_STATUS_LABELS[status]}
    </span>
  );
}
