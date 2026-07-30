import { NextResponse, type NextRequest } from 'next/server';
import MessageModel from '@/models/Message';
import connectDB from '@/config/database';
import { getSessionUser } from '@/lib/auth/session';
import {
  parseObjectId,
  unauthorized,
  zodBadRequest,
  type RouteContext,
} from '@/lib/api-handler';
import { refuseDemoActor } from '@/lib/auth/demo-responses';
import {
  messageStatusUpdateSchema,
  messageOwnerEditSchema,
} from '@/lib/messages/schema';

type Ctx = RouteContext<{ id: string }>;

const notFound = () =>
  NextResponse.json({ message: 'Message not found' }, { status: 404 });

const forbidden = () =>
  NextResponse.json({ message: 'Forbidden' }, { status: 403 });

// PATCH /api/messages/[id]
// Admin → status toggle (open ↔ closed)
// Owner → subject + body edit while still 'open'
export const PATCH = async (request: NextRequest, ctx: Ctx) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) return unauthorized();

    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    // The nightly reset clears messages the demo *customer* authored, but
    // these verbs reach any message — a demo admin closing or deleting a real
    // customer's conversation would outlive the visit with nothing to restore
    // it, so demo actors stay blocked here.
    const actorBlocked = refuseDemoActor(sessionUser.user);
    if (actorBlocked) return actorBlocked;

    const body = (await request.json()) as { status?: unknown };
    const isAdmin = Boolean(sessionUser.user?.isAdmin);

    // Admin status path — owner cannot change their own message's status, so
    // the customer profile UI keeps the original PATCH contract intact for the
    // admin dashboard while gaining a separate owner-edit branch below.
    if (isAdmin && typeof body.status === 'string') {
      const parsed = messageStatusUpdateSchema.safeParse(body);
      if (!parsed.success) return zodBadRequest(parsed.error, 'Invalid status');
      const updated = await MessageModel.findByIdAndUpdate(
        id,
        { status: parsed.data.status },
        { returnDocument: 'after', runValidators: true },
      ).lean();
      if (!updated) return notFound();
      return NextResponse.json({ data: updated });
    }

    // Owner edit path — guarded by ownership AND open status. Once an admin
    // closes the conversation the customer loses edit access; the audit
    // trail for resolved messages stays stable.
    const existing = await MessageModel.findById(id);
    if (!existing) return notFound();
    if (existing.user?.toString() !== sessionUser.userId) return forbidden();
    if (existing.status !== 'open') {
      return NextResponse.json(
        { message: 'Closed messages cannot be edited' },
        { status: 409 },
      );
    }

    const parsed = messageOwnerEditSchema.safeParse(body);
    if (!parsed.success) return zodBadRequest(parsed.error, 'Invalid message');

    existing.subject = parsed.data.subject;
    existing.body = parsed.data.body;
    await existing.save();

    return NextResponse.json({ data: existing.toJSON() });
  } catch (error) {
    console.error('[messages PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// DELETE /api/messages/[id]
// Owner can delete their own message at any status; admins can also delete
// for moderation. The conversation history disappears entirely — there is no
// soft-delete, since the message body is the only content.
export const DELETE = async (_request: NextRequest, ctx: Ctx) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) return unauthorized();

    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    // Same demo-reset coverage gap as PATCH — a demo actor's delete would
    // outlive the nightly reset.
    const actorBlocked = refuseDemoActor(sessionUser.user);
    if (actorBlocked) return actorBlocked;

    const existing = await MessageModel.findById(id);
    if (!existing) return notFound();

    const isOwner = existing.user?.toString() === sessionUser.userId;
    const isAdmin = Boolean(sessionUser.user?.isAdmin);
    if (!isOwner && !isAdmin) return forbidden();

    await existing.deleteOne();
    return NextResponse.json({ data: { id }, message: 'Message deleted' });
  } catch (error) {
    console.error('[messages DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
