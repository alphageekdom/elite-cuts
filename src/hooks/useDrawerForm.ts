'use client';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Manages the standard drawer edit pattern:
 * - `editing` toggle
 * - Per-field state as a plain object
 * - `saving` flag during async submission
 * - Success/error toasts
 *
 * The caller provides `initialValues`, `onSave(values)`, and optional `successMsg`.
 * Call `reset()` to discard edits and close edit mode.
 */
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
