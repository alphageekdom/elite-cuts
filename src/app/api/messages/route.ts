import { NextResponse, type NextRequest } from 'next/server';
import MessageModel from '@/models/Message';
import User from '@/models/User';
import { withAuth, zodBadRequest } from '@/lib/api-handler';
import { messageInputSchema } from '@/lib/messages/schema';
import { clientIpFromHeaders, rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Each new message fires a notification fanout to every admin, so unbounded
// posts let a single signed-in account drown the admin inbox. The cap is
// keyed on both the userId (to catch a tampered IP) and the IP (to catch
// account-cycling). Either tripping returns the same 429.
const MESSAGE_USER_MAX_PER_MIN = 8;
const MESSAGE_IP_MAX_PER_MIN = 15;

// POST /api/messages — customer or admin sends a new message to the shop.
// Validation goes through the shared Zod schema so the client modal, this
// route, and the owner-edit PATCH all enforce the same length / trim rules.
export const POST = withAuth(async (request: NextRequest, _ctx, userId) => {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const userLimit = rateLimit({
      key: `messages:user:${userId}`,
      max: MESSAGE_USER_MAX_PER_MIN,
      windowMs: 60_000,
    });
    const ipLimit = rateLimit({
      key: `messages:ip:${ip}`,
      max: MESSAGE_IP_MAX_PER_MIN,
      windowMs: 60_000,
    });
    if (!userLimit.ok || !ipLimit.ok) {
      const retryAfterSec = Math.max(userLimit.retryAfterSec, ipLimit.retryAfterSec);
      return NextResponse.json(
        { message: 'Too many messages, please try again shortly' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }

    const parsed = messageInputSchema.safeParse(await request.json());
    if (!parsed.success) return zodBadRequest(parsed.error, 'Invalid message');
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
