'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  DEFAULT_EVENT_MESSAGE,
  EVENT_MAX_DURATION_HOURS,
  EVENT_MAX_END_HOUR,
  EVENT_MESSAGE_MAX,
  EVENT_MIN_DURATION_HOURS,
  EVENT_MIN_START_HOUR,
  formatGrillHour,
  nextSaturdayInSummer,
  validateEventInput,
  type SerializedEvent,
} from '@/lib/event-config';
import SlideDrawer from '@/components/admin/SlideDrawer';
import { labelCls } from '@/components/admin/AdminForm';
import { SelectField } from '@/components/ui/SelectField';

type Props = {
  open: boolean;
  event: SerializedEvent | null;     // null = create mode
  defaultDate?: string;              // YYYY-MM-DD; falls back to nextSaturdayInSummer()
  onClose: () => void;
};

function isoToInputDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function GrillEventFormDrawer(props: Props) {
  const { open, onClose } = props;
  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      widthClass="max-w-md"
      ariaLabelledBy="grill-event-form-title"
    >
      {open && <GrillEventFormBody {...props} />}
    </SlideDrawer>
  );
}

function GrillEventFormBody({ event, defaultDate, onClose }: Props) {
  const router = useRouter();
  const isEdit = !!event;

  const initialDate = useMemo(() => {
    if (event) return isoToInputDate(event.date);
    return defaultDate ?? nextSaturdayInSummer();
  }, [event, defaultDate]);

  const [date, setDate] = useState(initialDate);
  const [startHour, setStartHour] = useState(event?.startHour ?? 11);
  const [endHour, setEndHour] = useState(event?.endHour ?? 15);
  const [message, setMessage] = useState(event?.message ?? DEFAULT_EVENT_MESSAGE);
  const [saving, setSaving] = useState(false);

  const errors = useMemo(
    () => validateEventInput({ date, startHour, endHour, message }, { allowPastForEdit: isEdit && event?.status !== 'scheduled' }),
    [date, startHour, endHour, message, isEdit, event?.status],
  );
  const firstError = errors[0]?.message;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (errors.length) return;
    setSaving(true);
    try {
      const url = isEdit ? `/api/events/${event._id}` : '/api/events';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, startHour, endHour, message: message.trim() }),
      });
      if (!res.ok) {
        const { message: errMsg } = await res.json().catch(() => ({ message: 'Failed to save' }));
        toast.error(errMsg ?? 'Failed to save event');
        return;
      }
      toast.success(isEdit ? 'Event updated' : 'Grill event scheduled');
      onClose();
      router.refresh();
    } catch {
      toast.error('Failed to save event');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelEvent(reason: 'cancelled' | 'weather') {
    if (!event) return;
    if (!confirm(reason === 'weather' ? 'Mark this event weather-cancelled?' : 'Cancel this event?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${event._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancellationReason: reason === 'weather' ? 'Weather' : '',
        }),
      });
      if (!res.ok) {
        const { message: errMsg } = await res.json().catch(() => ({ message: 'Failed to cancel' }));
        toast.error(errMsg ?? 'Failed to cancel event');
        return;
      }
      toast.success(reason === 'weather' ? 'Event weather-cancelled' : 'Event cancelled');
      onClose();
      router.refresh();
    } catch {
      toast.error('Failed to cancel event');
    } finally {
      setSaving(false);
    }
  }

  const fieldCls =
    'w-full bg-cream border border-line-soft rounded-lg px-4 py-2.5 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors';

  const hourOptions = Array.from(
    { length: EVENT_MAX_END_HOUR - EVENT_MIN_START_HOUR + 1 },
    (_, i) => EVENT_MIN_START_HOUR + i,
  );

  return (
    <>
      <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line-soft shrink-0">
        <div className="pr-4">
          <div className="text-[11px] tracking-widest uppercase text-muted mb-1.5">
            {isEdit ? 'Edit grill event' : 'Schedule grill event'}
          </div>
          <h2 id="grill-event-form-title" className="font-display text-[20px] font-normal tracking-tight leading-snug">
            Parking-lot grill
          </h2>
          <p className="mt-1 text-[12px] text-muted">
            {EVENT_MIN_DURATION_HOURS}–{EVENT_MAX_DURATION_HOURS} hours, between{' '}
            {formatGrillHour(EVENT_MIN_START_HOUR)} and {formatGrillHour(EVENT_MAX_END_HOUR)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-cream-deep transition-colors shrink-0 mt-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-6 py-5 gap-5 overflow-y-auto">
        <div>
          <label className={labelCls}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={fieldCls}
          />
          <p className="mt-1.5 text-[11px] text-muted">June 1 – September 30 only.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Start</label>
            <SelectField
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>{formatGrillHour(h)}</option>
              ))}
            </SelectField>
          </div>
          <div>
            <label className={labelCls}>End</label>
            <SelectField
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>{formatGrillHour(h)}</option>
              ))}
            </SelectField>
          </div>
        </div>

        <div>
          <label className={labelCls}>
            Customer message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={EVENT_MESSAGE_MAX}
            rows={3}
            placeholder={DEFAULT_EVENT_MESSAGE}
            className={`${fieldCls} resize-none`}
          />
          <p className="mt-1.5 text-[11px] text-muted">
            {message.length}/{EVENT_MESSAGE_MAX} · receipt-gated framing — no RSVP language
          </p>
        </div>

        {firstError && (
          <div className="rounded-lg border border-oxblood/30 bg-oxblood/5 px-3 py-2 text-[12px] text-oxblood">
            {firstError}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-line-soft space-y-3">
          <button
            type="submit"
            disabled={saving || errors.length > 0}
            className="w-full bg-ink text-cream text-[13px] font-medium tracking-[0.04em] py-3 rounded-full hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Schedule event'}
          </button>

          {isEdit && event?.status !== 'cancelled' && event?.status !== 'completed' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCancelEvent('weather')}
                disabled={saving}
                className="text-[12px] font-medium tracking-[0.04em] py-2.5 rounded-full border border-line text-ink-soft hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
              >
                Weather cancel
              </button>
              <button
                type="button"
                onClick={() => handleCancelEvent('cancelled')}
                disabled={saving}
                className="text-[12px] font-medium tracking-[0.04em] py-2.5 rounded-full border border-oxblood/30 text-oxblood hover:bg-oxblood/5 transition-colors disabled:opacity-50"
              >
                Cancel event
              </button>
            </div>
          )}
        </div>
      </form>
    </>
  );
}
