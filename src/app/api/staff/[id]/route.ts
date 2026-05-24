import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import StaffMemberModel from '@/models/StaffMember';
import { withAdminNonDemo } from '@/lib/api-handler';
import { staffPatchSchema, type StaffPatchInput } from '@/lib/staff/schema';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminNonDemo(async (request: NextRequest, ctx: unknown) => {
  const { id } = await (ctx as RouteContext).params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const parsed = staffPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  // Strip undefined keys so Mongoose's `$set` doesn't interpret them as
  // a request to clear those fields. Building a typed partial here keeps
  // the rest of the handler reading without casts.
  const data = parsed.data;
  const update: Partial<StaffPatchInput> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.role !== undefined) update.role = data.role;
  if (data.roleKey !== undefined) update.roleKey = data.roleKey;
  if (data.station !== undefined) update.station = data.station;
  if (data.color !== undefined) update.color = data.color;
  if (data.status !== undefined) update.status = data.status;
  if (data.email !== undefined) update.email = data.email;
  if (data.notes !== undefined) update.notes = data.notes;

  const doc = await StaffMemberModel.findByIdAndUpdate(id, { $set: update }, {
    new: true,
    runValidators: true,
  }).lean();
  if (!doc) {
    return NextResponse.json({ message: 'Staff member not found' }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      _id: doc._id.toString(),
      name: doc.name,
      role: doc.role,
      color: doc.color,
      status: doc.status,
    },
  });
});

export const DELETE = withAdminNonDemo(async (_request: NextRequest, ctx: unknown) => {
  const { id } = await (ctx as RouteContext).params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const result = await StaffMemberModel.findByIdAndDelete(id);
  if (!result) {
    return NextResponse.json({ message: 'Staff member not found' }, { status: 404 });
  }

  return NextResponse.json({ data: { id }, message: 'Staff member deleted' });
});
