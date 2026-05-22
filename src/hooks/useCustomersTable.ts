'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import type { CustomerTableRow } from '@/types/admin';
import { useAdminDrawer } from './useAdminDrawer';

// Owns the customer list state, the row-level detail drawer, the bulk-action
// state machine, and the fetch glue for every single-row mutation that
// CustomersClient.tsx fires. The component keeps purely visual state
// (search, sort, page, filter popover) and renders what this hook returns.

export function useCustomersTable(initialCustomers: CustomerTableRow[]) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState('');
  const [adjustPointsMode, setAdjustPointsMode] = useState(false);
  const [pointsDelta, setPointsDelta] = useState('');
  const drawer = useAdminDrawer<CustomerTableRow>();

  function patchRow(id: string, patch: Partial<CustomerTableRow>) {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    drawer.setItem((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }

  function removeRow(id: string) {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  function prepend(row: CustomerTableRow) {
    setCustomers((prev) => [row, ...prev]);
  }

  async function save(id: string, data: { name: string; email: string; phone: string }) {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to update customer');
        return;
      }
      patchRow(id, data);
      toast.success('Customer updated');
    } catch {
      toast.error('Failed to update customer');
    }
  }

  // Throws on failure so the drawer's `useDrawerForm` hook can show its own
  // toast — matches the contract `useDrawerForm` expects from its onSave.
  async function saveNote(id: string, adminNote: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminNote }),
    });
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({}));
      throw new Error(message ?? 'Failed to save note');
    }
    patchRow(id, { adminNote });
  }

  async function softDelete(id: string, opts: { reason?: string; immediate?: boolean } = {}) {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: opts.reason?.trim() || undefined,
          immediate: Boolean(opts.immediate),
        }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to delete customer');
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { deletionScheduledFor?: string };

      if (opts.immediate) {
        removeRow(id);
        drawer.close();
        toast.success('Customer permanently deleted');
      } else {
        patchRow(id, {
          deletedAt: new Date().toISOString(),
          deletionScheduledFor: data.deletionScheduledFor,
        });
        toast.success('Customer scheduled for deletion');
      }
    } catch {
      toast.error('Failed to delete customer');
    }
  }

  async function cancelDeletion(id: string) {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_deletion' }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to cancel deletion');
        return;
      }
      patchRow(id, { deletedAt: undefined, deletionScheduledFor: undefined });
      toast.success('Deletion cancelled');
    } catch {
      toast.error('Failed to cancel deletion');
    }
  }

  async function cancelDormancy(id: string) {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_dormancy' }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to cancel dormancy cleanup');
        return;
      }
      patchRow(id, { dormancyWarnedAt: undefined });
      toast.success('Dormancy cleanup cancelled');
    } catch {
      toast.error('Failed to cancel dormancy cleanup');
    }
  }

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

  async function bulkAdjustPoints() {
    const delta = parseInt(pointsDelta, 10);
    if (isNaN(delta)) { toast.error('Enter a valid number'); return; }
    const ids = [...selectedIds];
    setBulkLoading('points');
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/users/${id}/points`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta }),
          }),
        ),
      );
      clearSelection();
      setAdjustPointsMode(false);
      setPointsDelta('');
      toast.success(`Points adjusted for ${ids.length} customer${ids.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to adjust points');
    } finally {
      setBulkLoading('');
    }
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    setBulkLoading('delete');
    try {
      // Bulk action stays as a soft-delete (no body) — bulk hard-delete is
      // out of scope. Read each response so the local row's
      // `deletionScheduledFor` reflects the server's clock instead of the
      // client's; otherwise a clock-skewed admin would see a date that
      // doesn't match what the cron is actually working against.
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
          const data = (await res.json().catch(() => ({}))) as {
            deletionScheduledFor?: string;
          };
          return { id, ok: res.ok, scheduledFor: data.deletionScheduledFor };
        }),
      );
      const successById = new Map(
        results.filter((r) => r.ok).map((r) => [r.id, r.scheduledFor]),
      );
      const nowIso = new Date().toISOString();
      setCustomers((prev) =>
        prev.map((c) =>
          successById.has(c.id)
            ? { ...c, deletedAt: nowIso, deletionScheduledFor: successById.get(c.id) }
            : c,
        ),
      );
      clearSelection();
      const okCount = successById.size;
      if (okCount === ids.length) {
        toast.success(`${ids.length} customer${ids.length !== 1 ? 's' : ''} scheduled for deletion`);
      } else {
        toast.error(`Scheduled ${okCount} of ${ids.length} — ${ids.length - okCount} failed`);
      }
    } catch {
      toast.error('Failed to schedule deletion for some customers');
    } finally {
      setBulkLoading('');
    }
  }

  return {
    customers,
    prepend,
    drawer,
    selection: {
      selectedIds,
      toggleSelect,
      setSelection,
      clearSelection,
    },
    bulk: {
      loading: bulkLoading,
      adjustMode: adjustPointsMode,
      setAdjustMode: setAdjustPointsMode,
      pointsDelta,
      setPointsDelta,
      adjustPoints: bulkAdjustPoints,
      delete: bulkDelete,
    },
    actions: {
      save,
      saveNote,
      softDelete,
      cancelDeletion,
      cancelDormancy,
    },
  };
}
