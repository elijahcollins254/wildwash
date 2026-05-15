'use client';

import { useState } from 'react';
import { Spinner } from '@/components';
import { client } from '@/lib/api/client';

interface OrderStatusUpdateProps {
  orderId: number;
  currentStatus: string;
  onUpdate: () => void;
  onError?: (error: string) => void;
}

const ORDER_STATUSES = [
  { value: 'requested', label: 'Requested' },
  { value: 'picked', label: 'Picked Up' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'pending_assignment', label: 'Pending Assignment' }
] as const;

type OrderStatus = typeof ORDER_STATUSES[number]['value'];

export default function OrderStatusUpdate({ orderId, currentStatus, onUpdate, onError }: OrderStatusUpdateProps) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus as OrderStatus);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusUpdate = async () => {
    setUpdating(true);
    setError(null);

    try {
      await client.patch(`/orders/update/?id=${orderId}`, {
        status: status
      });
      onUpdate();
    } catch (err: any) {
      console.error('Error updating order:', err);
      const errorMessage = err.message || 'Failed to update order status';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          disabled={updating}
        >
          {ORDER_STATUSES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button
          onClick={handleStatusUpdate}
          disabled={updating || status === currentStatus}
          className="px-3 py-2 rounded-md bg-red-600 text-white text-sm disabled:opacity-50"
        >
          {updating ? (
            <span className="inline-flex items-center">
              <Spinner className="h-4 w-4 text-white -ml-1 mr-2" />
              Updating...
            </span>
          ) : (
            'Update Status'
          )}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}