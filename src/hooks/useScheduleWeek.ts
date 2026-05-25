'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getMondayOf } from '@/lib/shifts/schedule';
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
export function useScheduleWeek(initialShifts: ShiftRow[]) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
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

  const prevWeek = useCallback(() => {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  }, []);
  const nextWeek = useCallback(() => {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  }, []);
  const goToday = useCallback(() => {
    setWeekStart(getMondayOf(new Date()));
  }, []);

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
