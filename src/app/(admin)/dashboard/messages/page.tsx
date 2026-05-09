import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import MessageModel from '@/models/Message';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MessagesClient, { type MessageRow, type MessageCounts } from './MessagesClient';
import type { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Messages · EliteCuts Admin' };

type PopulatedUser = { _id: Types.ObjectId; name: string; email: string };

export default async function AdminMessagesPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) redirect('/login');

  await connectDB();

  const [rawMessages, openCount, closedCount] = await Promise.all([
    MessageModel.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .populate<{ user: PopulatedUser }>('user', 'name email')
      .lean(),
    MessageModel.countDocuments({ status: 'open' }),
    MessageModel.countDocuments({ status: 'closed' }),
  ]);

  const counts: MessageCounts = {
    all: rawMessages.length,
    open: openCount,
    closed: closedCount,
  };

  const messages: MessageRow[] = rawMessages.map((m) => {
    const user = m.user as PopulatedUser | null;
    return {
      id: String(m._id),
      customerName: user?.name ?? 'Unknown',
      customerEmail: user?.email ?? '',
      subject: m.subject,
      body: m.body,
      orderRef: m.orderRef,
      status: m.status,
      createdAt: (m.createdAt as Date).toISOString(),
    };
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Support"
        breadcrumb="Messages"
        title="Customer"
        titleAccent="messages"
        subtitle={`${openCount} open${openCount === 1 ? '' : ''} · ${counts.all} total`}
      />
      <MessagesClient messages={messages} />
    </>
  );
}
