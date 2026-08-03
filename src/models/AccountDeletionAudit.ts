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
  /**
   * The customer's Stripe Customer id, snapshotted on a hard delete.
   *
   * `deleteStripeCustomer` never throws on purpose — someone who asked to be
   * deleted is entitled to be deleted whether or not a third party answers. The
   * cost was that the id died with the User doc moments later and the purge cron
   * skips users whose doc is already gone, so a single timeout at 03:00 orphaned
   * the Stripe Customer and every PaymentMethod on it, permanently, with the log
   * line as the only trace.
   *
   * Keeping it here is what makes that recoverable: the id outlives the account,
   * so an orphan can be found and removed by hand. Not sensitive on its own — it
   * is an opaque handle, not a card — and the row it sits on already carries the
   * email.
   */
  stripeCustomerIdSnapshot?: string | null;
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
    // Only written on a hard delete, and only when the account had one. See the
    // field's doc comment on the type above for why it outlives the User doc.
    stripeCustomerIdSnapshot: {
      type: String,
      trim: true,
      default: null,
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
