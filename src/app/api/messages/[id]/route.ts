import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import MessageModel, { MESSAGE_STATUSES } from '@/models/Message';
import connectDB from '@/config/database';
import { getSessionUser } from '@/lib/getSessionUser';
import { unauthorized } from '@/lib/api-handler';

type RouteContext = { params: Promise<{ id: string }> };

const notFound = () =>
  NextResponse.json({ message: 'Message not found' }, { status: 404 });

const forbidden = () =>
  NextResponse.json({ message: 'Forbidden' }, { status: 403 });

const badRequest = (message: string) =>
  NextResponse.json({ message }, { status: 400 });

// PATCH /api/messages/[id]
// Admin → status toggle (open ↔ closed)
// Owner → subject + body edit while still 'open'
export const PATCH = async (request: NextRequest, ctx: unknown) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) return unauthorized();

    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    const body = (await request.json()) as {
      status?: string;
      subject?: string;
      body?: string;
    };
    const isAdmin = Boolean(sessionUser.user?.isAdmin);

    // Admin status path — owner cannot change their own message's status, so
    // the customer profile UI keeps the original PATCH contract intact for the
    // admin dashboard while gaining a separate owner-edit branch below.
    if (isAdmin && typeof body.status === 'string') {
      if (!(MESSAGE_STATUSES as readonly string[]).includes(body.status)) {
        return badRequest('Invalid status');
      }
      const updated = await MessageModel.findByIdAndUpdate(
        id,
        { status: body.status },
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

    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const msgBody = typeof body.body === 'string' ? body.body.trim() : '';
    if (!subject) return badRequest('Subject is required');
    if (subject.length > 120) return badRequest('Subject must be 120 characters or fewer');
    if (!msgBody) return badRequest('Message body is required');
    if (msgBody.length > 2000) return badRequest('Message must be 2000 characters or fewer');

    existing.subject = subject;
    existing.body = msgBody;
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
export const DELETE = async (_request: NextRequest, ctx: unknown) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) return unauthorized();

    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    const existing = await MessageModel.findById(id);
    if (!existing) return notFound();

    const isOwner = existing.user?.toString() === sessionUser.userId;
    const isAdmin = Boolean(sessionUser.user?.isAdmin);
    if (!isOwner && !isAdmin) return forbidden();

    await existing.deleteOne();
    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error('[messages DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
