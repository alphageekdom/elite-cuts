import { NextResponse, type NextRequest } from 'next/server';
import connectDB from '@/config/database';
import MessageModel from '@/models/Message';
import User from '@/models/User';
import { getSessionUser } from '@/lib/getSessionUser';
import { unauthorized, withAuth } from '@/lib/api-handler';
import mongoose, { type Types } from 'mongoose';

export const dynamic = 'force-dynamic';

type PopulatedUser = { _id: Types.ObjectId; name: string; email: string };

// GET /api/messages
// Admin → all messages with user name/email populated
// Customer → their own messages only
export const GET = async () => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return unauthorized();
  }

  try {
    await connectDB();

    if (sessionUser.user?.isAdmin) {
      const items = await MessageModel.find({})
        .sort({ createdAt: -1 })
        .limit(200)
        .populate<{ user: PopulatedUser }>('user', 'name email')
        .lean();

      const openCount = await MessageModel.countDocuments({ status: 'open' });

      return NextResponse.json({ items, openCount });
    }

    const items = await MessageModel.find({ user: sessionUser.userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[messages GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// POST /api/messages
export const POST = withAuth(async (request: NextRequest, _ctx, userId) => {
  try {
    const body = await request.json();
    const { subject, body: msgBody, orderId, orderRef } = body as {
      subject: string;
      body: string;
      orderId?: string;
      orderRef?: string;
    };

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json({ message: 'Subject is required' }, { status: 400 });
    }
    if (subject.trim().length > 120) {
      return NextResponse.json({ message: 'Subject must be 120 characters or fewer' }, { status: 400 });
    }
    if (!msgBody || typeof msgBody !== 'string' || msgBody.trim().length === 0) {
      return NextResponse.json({ message: 'Message body is required' }, { status: 400 });
    }
    if (msgBody.trim().length > 2000) {
      return NextResponse.json({ message: 'Message must be 2000 characters or fewer' }, { status: 400 });
    }
    if (orderId && !mongoose.isValidObjectId(orderId)) {
      return NextResponse.json({ message: 'Invalid orderId' }, { status: 400 });
    }
    if (orderRef && orderRef.trim().length > 100) {
      return NextResponse.json({ message: 'orderRef must be 100 characters or fewer' }, { status: 400 });
    }

    const author = await User.findById(userId).select('name').lean<{ name?: string }>();

    const created = await MessageModel.create({
      user: userId,
      authorNameSnapshot: author?.name?.trim() || '',
      subject: subject.trim(),
      body: msgBody.trim(),
      ...(orderId ? { orderId } : {}),
      ...(orderRef ? { orderRef: orderRef.trim() } : {}),
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[messages POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
