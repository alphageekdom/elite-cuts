import { NextResponse } from 'next/server';

import StaffMemberModel from '@/models/StaffMember';
import {
  parseObjectId,
  pickDefined,
  withAdminNonDemo,
  zodBadRequest,
} from '@/lib/api-handler';
import { staffPatchSchema, type StaffPatchInput } from '@/lib/staff/schema';

const STAFF_PATCH_KEYS = [
  'name',
  'role',
  'roleKey',
  'station',
  'color',
  'status',
  'email',
  'notes',
] as const satisfies readonly (keyof StaffPatchInput)[];

export const PATCH = withAdminNonDemo<{ id: string }>(async (request, ctx) => {
  const { id } = await ctx.params;
  const invalid = parseObjectId(id);
  if (invalid) return invalid;

  const parsed = staffPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return zodBadRequest(parsed.error);

  // pickDefined strips `undefined` keys so Mongoose's `$set` doesn't interpret
  // them as a request to clear those fields.
  const update = pickDefined(parsed.data, STAFF_PATCH_KEYS);

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

export const DELETE = withAdminNonDemo<{ id: string }>(async (_request, ctx) => {
  const { id } = await ctx.params;
  const invalid = parseObjectId(id);
  if (invalid) return invalid;

  const result = await StaffMemberModel.findByIdAndDelete(id);
  if (!result) {
    return NextResponse.json({ message: 'Staff member not found' }, { status: 404 });
  }

  return NextResponse.json({ data: { id }, message: 'Staff member deleted' });
});
