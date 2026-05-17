import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import StaffMemberModel from '@/models/StaffMember';
import { SHIFT_COLORS } from '@/lib/shift-constants';
import { withAdmin } from '@/lib/api-handler';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdmin(async (request: NextRequest, ctx: unknown) => {
  const { id } = await (ctx as RouteContext).params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    role?: string;
    color?: string;
    isActive?: boolean;
    notes?: string;
  };

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }
    if (trimmed.length > 80) {
      return NextResponse.json({ message: 'Name is too long' }, { status: 400 });
    }
    update.name = trimmed;
  }
  if (body.role !== undefined) update.role = body.role.trim();
  if (body.color !== undefined) {
    if (!(SHIFT_COLORS as readonly string[]).includes(body.color)) {
      return NextResponse.json({ message: 'Invalid color' }, { status: 400 });
    }
    update.color = body.color;
  }
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);
  if (body.notes !== undefined) update.notes = body.notes.trim();

  const doc = await StaffMemberModel.findByIdAndUpdate(id, { $set: update }, {
    new: true,
    runValidators: true,
  }).lean();
  if (!doc) {
    return NextResponse.json({ message: 'Staff member not found' }, { status: 404 });
  }

  return NextResponse.json({
    _id: doc._id.toString(),
    name: doc.name,
    role: doc.role,
    color: doc.color,
    isActive: doc.isActive,
  });
});

export const DELETE = withAdmin(async (_request: NextRequest, ctx: unknown) => {
  const { id } = await (ctx as RouteContext).params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const result = await StaffMemberModel.findByIdAndDelete(id);
  if (!result) {
    return NextResponse.json({ message: 'Staff member not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Staff member deleted' });
});
