'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ShiftRow } from '@/lib/admin/schedule';

type DrawerState =
  | { kind: 'closed' }
  | { kind: 'create'; dayOfWeek?: number; hourIndex?: number }
  | { kind: 'edit'; shift: ShiftRow };

type FetchEnvelope = { items?: unknown };

// Feature hook for the schedule client component. Owns the week-navigation
// state, the per-week shift list with its fetch + loading flag, and the
// drawer mode (closed / create / edit). Mirrors the use{Domain}Table hooks
// the products / customers / orders / inventory dashboards already use.
// `initialWeekStart` comes from the server, which resolves it against the
// SHOP's clock — the browser's own week can be a day out either side of it.
// Deriving it here instead also used to store an east-of-UTC admin's shifts
// under a Sunday key; see `mondayOfShopDay`.
export function useScheduleWeek(
  initialShifts: ShiftRow[],
  initialWeekStart: string,
) {
  const [weekStart, setWeekStart] = useState<Date>(
    () => new Date(initialWeekStart),
  );
  const [shifts, setShifts] = useState<ShiftRow[]>(initialShifts);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({ kind: 'closed' });
  // First render hands back the server-prerendered `initialShifts`. The
  // effect below would otherwise immediately re-fetch the same data for
  // the same week — a ref-backed sentinel skips that round trip without
  // adding an effect-driven setState.
  const hasInitialFetchedRef = useRef(false);

  const fetchShifts = useCallback(async (ws: Date) => {
    setLoadingShifts(true);
    try {
      const res = await fetch(`/api/shifts?weekStart=${ws.toISOString()}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as FetchEnvelope;
      if (Array.isArray(data.items)) {
        setShifts(data.items as ShiftRow[]);
      }
    } catch {
      toast.error('Failed to load shifts');
    } finally {
      setLoadingShifts(false);
    }
  }, []);

  useEffect(() => {
    if (!hasInitialFetchedRef.current) {
      hasInitialFetchedRef.current = true;
      return;
    }
    // Defer to a task tick so the setState calls inside fetchShifts land async
    // (rule-clean) instead of synchronously from the effect body.
    const id = setTimeout(() => fetchShifts(weekStart), 0);
    return () => clearTimeout(id);
  }, [weekStart, fetchShifts]);

  // UTC arithmetic so a DST boundary can't nudge the key off midnight.
  const prevWeek = useCallback(() => {
    setWeekStart((d) => { const n = new Date(d); n.setUTCDate(n.getUTCDate() - 7); return n; });
  }, []);
  const nextWeek = useCallback(() => {
    setWeekStart((d) => { const n = new Date(d); n.setUTCDate(n.getUTCDate() + 7); return n; });
  }, []);
  // Returns to the week the SERVER resolved against the shop's clock, rather
  // than re-deriving one from the browser's calendar date. The two disagree for
  // the hours either side of shop-midnight, and this is a write path, not just
  // a label: a shift booked into a browser-derived week is stored under a key
  // the schedule, dashboard and staff pages never query, so it vanishes on
  // reload and `findShiftCollision` cannot see it against the same visible cell
  // booked from elsewhere. That is the failure `mondayOfShopDay` exists to
  // close, reopened one button along.
  const goToday = useCallback(() => {
    setWeekStart(new Date(initialWeekStart));
  }, [initialWeekStart]);

  const openCreate = useCallback((dayOfWeek?: number, hourIndex?: number) => {
    setDrawer({ kind: 'create', dayOfWeek, hourIndex });
  }, []);
  const openEdit = useCallback((shift: ShiftRow) => {
    setDrawer({ kind: 'edit', shift });
  }, []);
  const closeDrawer = useCallback(() => {
    setDrawer({ kind: 'closed' });
  }, []);

  const refetch = useCallback(() => {
    fetchShifts(weekStart);
  }, [fetchShifts, weekStart]);

  return {
    weekStart,
    shifts,
    loadingShifts,
    drawer,
    prevWeek,
    nextWeek,
    goToday,
    openCreate,
    openEdit,
    closeDrawer,
    refetch,
  };
}
