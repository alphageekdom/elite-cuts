import { Schema, model, models, type Model } from 'mongoose';
import { SHIFT_COLORS, type ShiftColor } from '@/lib/shift-constants';

export type StaffMember = {
  name: string;
  role: string;
  color: ShiftColor;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

const StaffMemberSchema = new Schema<StaffMember>(
  {
    name:     { type: String, required: true, trim: true },
    role:     { type: String, default: '', trim: true },
    color:    { type: String, enum: [...SHIFT_COLORS], default: 'marcus' },
    isActive: { type: Boolean, default: true },
    notes:    { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

const StaffMemberModel =
  (models.StaffMember as Model<StaffMember> | undefined) ??
  model<StaffMember>('StaffMember', StaffMemberSchema);

export default StaffMemberModel;
