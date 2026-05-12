import { Schema, model, models, type HydratedDocument, type Model } from 'mongoose';

import {
  DEFAULT_EVENT_MESSAGE,
  EVENT_KIND,
  EVENT_MAX_END_HOUR,
  EVENT_MESSAGE_MAX,
  EVENT_MIN_START_HOUR,
  EVENT_STATUSES,
  type EventKind,
  type EventStatus,
} from '@/lib/event-config';

export type Event = {
  kind: EventKind;
  date: Date;
  startHour: number;
  endHour: number;
  message: string;
  status: EventStatus;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EventDocument = HydratedDocument<Event>;

const EventSchema = new Schema<Event>(
  {
    kind: { type: String, enum: [...EVENT_KIND], default: 'grill', required: true },
    date: { type: Date, required: true, index: true },
    startHour: { type: Number, required: true, min: EVENT_MIN_START_HOUR, max: EVENT_MAX_END_HOUR },
    endHour:   { type: Number, required: true, min: EVENT_MIN_START_HOUR, max: EVENT_MAX_END_HOUR },
    message:   { type: String, default: DEFAULT_EVENT_MESSAGE, trim: true, maxlength: EVENT_MESSAGE_MAX },
    status:    { type: String, enum: [...EVENT_STATUSES], default: 'scheduled', index: true },
    cancellationReason: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

EventSchema.index({ date: 1, status: 1 });

const EventModel =
  (models.Event as Model<Event> | undefined) ?? model<Event>('Event', EventSchema);

export default EventModel;
