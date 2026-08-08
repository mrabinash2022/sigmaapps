import { useEffect, useRef } from 'react';
import { isActiveOrderStatus } from '@localite/shared';

const DEFAULT_INTERVAL_MS = 15000;

export function useOrderPolling(order, loadFn, intervalMs = DEFAULT_INTERVAL_MS) {
  const loadRef = useRef(loadFn);
  loadRef.current = loadFn;

  useEffect(() => {
    const status = order?.orderStatus ?? order?.order_status;
    if (!order?.id || !isActiveOrderStatus(status)) return undefined;

    const timer = setInterval(() => {
      loadRef.current?.({ silent: true });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [order?.id, order?.orderStatus, order?.order_status, intervalMs]);
}

export function useOrdersListPolling(orders, loadFn, intervalMs = DEFAULT_INTERVAL_MS) {
  const loadRef = useRef(loadFn);
  loadRef.current = loadFn;

  const hasActive = (orders || []).some((order) =>
    isActiveOrderStatus(order?.orderStatus ?? order?.order_status));

  useEffect(() => {
    if (!hasActive) return undefined;

    const timer = setInterval(() => {
      loadRef.current?.({ silent: true });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [hasActive, intervalMs]);
}
