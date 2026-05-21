import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/getSessionUser';
import connectDB from '@/config/database';
import MessageModel from '@/models/Message';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MessagesClient, { type MessageRow, type MessageCounts } from '@/components/admin/messages/MessagesClient';
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
    const snapshot = (m.authorNameSnapshot ?? '').trim();
    const fallbackName = snapshot || 'Former customer';
    return {
      id: String(m._id),
      customerName: user?.name ?? fallbackName,
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
        subtitle={`${counts.all} ${counts.all === 1 ? 'message' : 'messages'} · ${openCount} open`}
      />
      <MessagesClient messages={messages} />
    </>
  );
}
