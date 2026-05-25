'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import type { OrderTableRow } from '@/types/admin';
import { refundSummary } from '@/lib/orders/refunds';
import { useAdminDrawer } from './useAdminDrawer';

// Owns the order list state, the detail drawer + its status-update mirror,
// the selection + bulk-action state, the deep-link `?openOrder=…` handler,
// and the fetch glue for every single-row mutation that OrdersClient.tsx
// fires (status update, refund/unrefund line items, delete, bulk update).
// The component keeps presentational state (search, sort, range, filter
// popover, columns popover, exporting) and renders.

export function useOrdersTable(initialOrders: OrderTableRow[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openOrderId = searchParams.get('openOrder');

  const [orders, setOrders] = useState(initialOrders);
  const [prevOrdersProp, setPrevOrdersProp] = useState(initialOrders);
  // Range navigation re-renders the page server-side with a new `orders` prop.
  // Adjusting state during render (React's recommended pattern over a
  // mirroring useEffect) avoids the extra paint and the "state derived from
  // props" smell.
  if (initialOrders !== prevOrdersProp) {
    setPrevOrdersProp(initialOrders);
    setOrders(initialOrders);
  }

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusUpdate, setStatusUpdate] = useState<string>('');
  const [bulkLoading, setBulkLoading] = useState('');
  const drawer = useAdminDrawer<OrderTableRow>();

  function patchRow(id: string, updater: (row: OrderTableRow) => OrderTableRow) {
    setOrders((prev) => prev.map((o) => (o.id === id ? updater(o) : o)));
    drawer.setItem((prev) => (prev && prev.id === id ? updater(prev) : prev));
  }

  // Wrapped in useCallback so the deep-link effect below can list it as a
  // dep without re-firing every render. `drawer.open` and `setStatusUpdate`
  // are both stable themselves.
  const drawerOpen = drawer.open;
  const openDrawer = useCallback(
    (order: OrderTableRow) => {
      drawerOpen(order);
      setStatusUpdate(order.status);
    },
    [drawerOpen],
  );

  // Deep-link support: when arriving with ?openOrder=<id>, open that order's
  // drawer once and strip the param so a refresh doesn't reopen it. The ref
  // guard makes this idempotent under React strict-mode double-invocation
  // and any incidental re-fires from order-list mutations.
  const handledDeepLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openOrderId || handledDeepLinkRef.current === openOrderId) return;
    handledDeepLinkRef.current = openOrderId;
    const target = orders.find((o) => o.id === openOrderId);
    // Defer to a task tick so the setState inside openDrawer lands async
    // (rule-clean) instead of synchronously from the effect body.
    const id = target ? setTimeout(() => openDrawer(target), 0) : null;
    router.replace(pathname);
    return () => {
      if (id !== null) clearTimeout(id);
    };
  }, [openOrderId, orders, openDrawer, pathname, router]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setSelection(ids: string[]) {
    setSelectedIds(new Set(ids));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function updateOrder(newStatus: string, cancellationReason?: string) {
    const target = drawer.item;
    if (!target) return;
    try {
      const body: Record<string, string> = { orderStatus: newStatus };
      if (cancellationReason) body.cancellationReason = cancellationReason;
      const res = await fetch(`/api/orders/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to update order');
        return;
      }
      // Cancellation refunds every remaining line — reflect optimistically.
      const isCancelTransition = newStatus === 'Cancelled' && target.status !== 'Cancelled';
      patchRow(target.id, (o) => {
        const items = isCancelTransition
          ? o.items.map((it) => (it.refunded ? it : { ...it, refunded: true }))
          : o.items;
        // Note: this is the cancel-transition branch — using o.total
        // (totalCost) caps the displayed refund at what the customer paid.
        const summary = refundSummary(items, { subtotal: o.subtotal, tax: o.tax, totalCost: o.total });
        return {
          ...o,
          status: newStatus,
          cancellationReason,
          items,
          refundedAmount: summary.refundedAmount,
          paymentStatus: isCancelTransition ? 'Refunded' : o.paymentStatus,
        };
      });
      router.refresh();
      toast.success(isCancelTransition ? 'Order cancelled and refunded' : 'Order status updated');
    } catch {
      toast.error('Failed to update order');
    }
  }

  async function refundItem(itemIndex: number) {
    const target = drawer.item;
    if (!target) return;
    try {
      const res = await fetch(`/api/orders/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundItemIndices: [itemIndex] }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to refund item');
        return;
      }
      patchRow(target.id, (o) => {
        const items = o.items.map((it, idx) => (idx === itemIndex ? { ...it, refunded: true } : it));
        const summary = refundSummary(items, { subtotal: o.subtotal, tax: o.tax, totalCost: o.total });
        const allRefunded = summary.refundedCount >= items.length;
        const cascadeCancel = allRefunded && o.status !== 'Cancelled';
        return {
          ...o,
          items,
          refundedAmount: summary.refundedAmount,
          paymentStatus: allRefunded ? 'Refunded' : 'Partially Refunded',
          status: cascadeCancel ? 'Cancelled' : o.status,
          cancellationReason: cascadeCancel ? undefined : o.cancellationReason,
        };
      });
      router.refresh();
      toast.success('Item refunded');
    } catch {
      toast.error('Failed to refund item');
    }
  }

  async function unrefundItem(itemIndex: number) {
    const target = drawer.item;
    if (!target) return;
    try {
      const res = await fetch(`/api/orders/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unrefundItemIndices: [itemIndex] }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to undo refund');
        return;
      }
      patchRow(target.id, (o) => {
        const items = o.items.map((it, idx) => (idx === itemIndex ? { ...it, refunded: false } : it));
        const summary = refundSummary(items, { subtotal: o.subtotal, tax: o.tax, totalCost: o.total });
        const noneRefunded = summary.refundedCount === 0;
        const allRefunded = !noneRefunded && summary.refundedCount >= items.length;
        return {
          ...o,
          items,
          refundedAmount: summary.refundedAmount,
          paymentStatus: noneRefunded ? 'Completed' : allRefunded ? 'Refunded' : 'Partially Refunded',
        };
      });
      router.refresh();
      toast.success('Refund undone — item restored');
    } catch {
      toast.error('Failed to undo refund');
    }
  }

  async function setRealizedWeight(itemIndex: number, weightLb: number | null) {
    const target = drawer.item;
    if (!target) return;
    try {
      const res = await fetch(`/api/orders/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ realizedWeights: [{ index: itemIndex, weightLb }] }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to update realized weight');
        return;
      }
      patchRow(target.id, (o) => {
        const items = o.items.map((it, idx) =>
          idx === itemIndex
            ? {
                ...it,
                realizedWeightLb: weightLb === null ? undefined : weightLb,
              }
            : it,
        );
        // Recompute refundedAmount in case a previously-refunded line's
        // realized total moved. The server already did this; mirror it
        // locally so the drawer's net-paid line stays in sync.
        const summary = refundSummary(items, {
          subtotal: o.subtotal,
          tax: o.tax,
          totalCost: o.total,
        });
        return { ...o, items, refundedAmount: summary.refundedAmount };
      });
      router.refresh();
      toast.success(weightLb === null ? 'Realized weight cleared' : 'Realized weight saved');
    } catch {
      toast.error('Failed to update realized weight');
    }
  }

  async function retrySettlement() {
    const target = drawer.item;
    if (!target) return;
    try {
      const res = await fetch(`/api/orders/${target.id}/settle`, { method: 'POST' });
      const body = (await res.json()) as {
        data?: {
          status: 'settled' | 'failed' | 'skipped';
          kind?: 'capture' | 'auto_refund' | 'no_op';
          amount?: number;
          transactionId?: string;
          error?: string;
          reason?: string;
        };
        message?: string;
      };
      if (!res.ok) {
        toast.error(body.message ?? 'Settlement retry failed');
        return;
      }
      const result = body.data!;
      if (result.status === 'failed') {
        toast.error(`Settlement still failing — ${result.error ?? 'see admin notification'}`);
        patchRow(target.id, (o) => ({
          ...o,
          settlementStatus: 'failed',
          settlementError: result.error ?? o.settlementError,
        }));
      } else if (result.status === 'settled') {
        toast.success(
          result.kind === 'no_op'
            ? 'Settlement marked complete — realized matched estimate'
            : `Settlement ${result.kind === 'capture' ? 'charged' : 'refunded'} $${result.amount?.toFixed(2)}`,
        );
        patchRow(target.id, (o) => {
          const next = { ...o, settlementStatus: 'settled' as const, settlementError: undefined };
          if (result.transactionId && result.amount && result.kind && result.kind !== 'no_op') {
            const txs = [...(o.settlementPaymentIntents ?? []), {
              id: result.transactionId,
              amount: result.amount,
              kind: result.kind,
              createdAt: new Date().toISOString(),
            }];
            next.settlementPaymentIntents = txs;
          }
          return next;
        });
      } else {
        toast.info(`Settlement skipped (${result.reason})`);
      }
      router.refresh();
    } catch {
      toast.error('Settlement retry failed');
    }
  }

  async function deleteOrder(id: string) {
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to delete order');
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast.success('Order deleted');
    } catch {
      toast.error('Failed to delete order');
    }
  }

  async function bulkUpdateStatus(newStatus: string) {
    const ids = [...selectedIds];
    setBulkLoading(newStatus);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderStatus: newStatus }),
          }),
        ),
      );
      setOrders((prev) =>
        prev.map((o) => (selectedIds.has(o.id) ? { ...o, status: newStatus } : o)),
      );
      clearSelection();
      toast.success(`${ids.length} order${ids.length !== 1 ? 's' : ''} updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update some orders');
    } finally {
      setBulkLoading('');
    }
  }

  return {
    orders,
    drawer: {
      item: drawer.item,
      isOpen: drawer.isOpen,
      open: openDrawer,
      close: drawer.close,
    },
    statusUpdate,
    setStatusUpdate,
    selection: {
      selectedIds,
      toggleSelect,
      setSelection,
      clearSelection,
    },
    bulk: {
      loading: bulkLoading,
      updateStatus: bulkUpdateStatus,
    },
    actions: {
      updateOrder,
      refundItem,
      unrefundItem,
      setRealizedWeight,
      retrySettlement,
      deleteOrder,
    },
  };
}
