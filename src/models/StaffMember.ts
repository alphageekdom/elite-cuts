import { Schema, model, models, type Model } from 'mongoose';
import { SHIFT_COLORS, type ShiftColor } from '@/lib/shift-constants';
import {
  STAFF_ROLE_KEYS,
  STAFF_STATUSES,
  type StaffRoleKey,
  type StaffStatus,
} from '@/lib/staff-display';

// Re-export so existing server-side imports (`from '@/models/StaffMember'`)
// keep working; the canonical home for the enums is the client-safe lib file.
export {
  STAFF_ROLE_KEYS,
  STAFF_STATUSES,
  type StaffRoleKey,
  type StaffStatus,
};

export type StaffMember = {
  name: string;
  role: string;
  roleKey: StaffRoleKey;
  station: string;
  color: ShiftColor;
  status: StaffStatus;
  email?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

const StaffMemberSchema = new Schema<StaffMember>(
  {
    name: { type: String, required: true, trim: true },
    // Display label paired with `roleKey`. Free-text on purpose so the admin
    // can customise the user-facing wording per shop ("Head Butcher" /
    // "Master Cutter" / "Charcuterie Lead" all map to the same roleKey).
    // The canonical category lives in `roleKey` — UI grouping, color
    // mapping, and shift-form selects all read roleKey, never this field.
    role:    { type: String, default: '', trim: true },
    roleKey: { type: String, enum: [...STAFF_ROLE_KEYS], default: 'other' },
    station: { type: String, default: '', trim: true },
    color:   { type: String, enum: [...SHIFT_COLORS], default: 'marcus' },
    status:  { type: String, enum: [...STAFF_STATUSES], default: 'active' },
    email:   { type: String, default: '', trim: true, lowercase: true },
    notes:   { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

const StaffMemberModel =
  (models.StaffMember as Model<StaffMember> | undefined) ??
  model<StaffMember>('StaffMember', StaffMemberSchema);

export default StaffMemberModel;
