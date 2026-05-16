import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export const ACCOUNT_DELETION_ACTIONS = [
  'self_soft_delete',
  'self_restore',
  'admin_soft_delete',
  'admin_hard_delete',
  'admin_restore',
  'cron_hard_delete',
  // Abandoned-account-cleanup additions:
  'dormancy_warned',          // warn-pass entry — stamped when the warning is sent
  'cron_soft_delete',         // soft-delete-pass entry — written via softDeleteUser with actor 'cron'
  'admin_cancel_dormancy',    // admin manually clears a dormancy warning from the customer detail drawer
  'self_dormancy_cleared',    // sign-in / order placement on a still-warned account cleared the warning
] as const;

export type AccountDeletionAction = (typeof ACCOUNT_DELETION_ACTIONS)[number];

export type AccountDeletionAudit = {
  userId: Types.ObjectId;
  userEmailSnapshot: string;
  action: AccountDeletionAction;
  reason?: string;
  performedBy?: Types.ObjectId | null;
  performedAt: Date;
};

export type AccountDeletionAuditDocument = HydratedDocument<AccountDeletionAudit>;

const AccountDeletionAuditSchema = new Schema<AccountDeletionAudit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmailSnapshot: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    action: {
      type: String,
      enum: [...ACCOUNT_DELETION_ACTIONS],
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    performedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false },
);

if (process.env.NODE_ENV !== 'production' && models.AccountDeletionAudit) {
  delete (models as Record<string, unknown>).AccountDeletionAudit;
}

const AccountDeletionAuditModel =
  (models.AccountDeletionAudit as Model<AccountDeletionAudit> | undefined) ||
  model<AccountDeletionAudit>('AccountDeletionAudit', AccountDeletionAuditSchema);

export default AccountDeletionAuditModel;
