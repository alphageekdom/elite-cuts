'use client';
import { useState } from 'react';
import { toast } from 'sonner';

// Manages the inline-edit drawer section pattern: editing toggle,
// per-field values, saving flag, try/catch with toast feedback. Currently
// consumed only by `CustomerDetailDrawer` (twice — Contact and Note
// sections), but kept as a shared hook so any future drawer that adds an
// inline-edit section adopts the same shape rather than re-rolling the
// try/catch + toast wiring. Pass `successMsg: ''` if the parent already
// toasts on save.
export function useDrawerForm<T extends Record<string, unknown>>(
  initialValues: T,
  onSave: (values: T) => Promise<void>,
  successMsg = 'Saved',
) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<T>(initialValues);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof T>(key: K, value: T[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setValues(initialValues);
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(values);
      setEditing(false);
      if (successMsg) toast.success(successMsg);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return { editing, setEditing, values, setField, saving, save, reset };
}
