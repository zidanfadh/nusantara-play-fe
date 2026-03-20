import { OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/marketplace';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${ORDER_STATUS_COLORS[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
