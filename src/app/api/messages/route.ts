import { NextResponse, type NextRequest } from 'next/server';
import MessageModel from '@/models/Message';
import User from '@/models/User';
import { withAuth } from '@/lib/api-handler';
import { messageInputSchema } from '@/lib/messages/schema';

export const dynamic = 'force-dynamic';

// POST /api/messages — customer or admin sends a new message to the shop.
// Validation goes through the shared Zod schema so the client modal, this
// route, and the owner-edit PATCH all enforce the same length / trim rules.
export const POST = withAuth(async (request: NextRequest, _ctx, userId) => {
  try {
    const parsed = messageInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Invalid message' },
        { status: 400 },
      );
    }
    const { subject, body, orderId, orderRef } = parsed.data;

    const author = await User.findById(userId).select('name').lean<{ name?: string }>();

    const created = await MessageModel.create({
      user: userId,
      authorNameSnapshot: author?.name?.trim() || '',
      subject,
      body,
      ...(orderId ? { orderId } : {}),
      ...(orderRef ? { orderRef } : {}),
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[messages POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
