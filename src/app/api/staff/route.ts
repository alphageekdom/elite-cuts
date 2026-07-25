import { NextResponse, type NextRequest } from 'next/server';

import StaffMemberModel from '@/models/StaffMember';
import { withAdmin, zodBadRequest } from '@/lib/api-handler';
import { staffCreateSchema } from '@/lib/staff/schema';

// GET /api/staff — admin-only roster lookup. Returns assignable staff
// (anyone not 'inactive') ordered by name for the schedule shift drawer;
// shape mirrors StaffUserOption. Seasonal and on-leave staff are still
// scheduleable — only 'inactive' (no longer employed) is excluded.
export const GET = withAdmin(async () => {
  const docs = await StaffMemberModel.find({ status: { $ne: 'inactive' } })
    .select('name roleKey')
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({
    items: docs.map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      roleKey: d.roleKey ?? 'other',
    })),
  });
});

// POST /api/staff — create a new staff member.
export const POST = withAdmin(async (request: NextRequest) => {
  const parsed = staffCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return zodBadRequest(parsed.error);

  const data = parsed.data;
  const doc = await StaffMemberModel.create({
    name: data.name,
    role: data.role ?? '',
    roleKey: data.roleKey ?? 'other',
    station: data.station ?? '',
    color: data.color ?? 'marcus',
    status: data.status ?? 'active',
    email: data.email ?? '',
    notes: data.notes ?? '',
  });

  return NextResponse.json(
    {
      data: {
        _id: doc._id.toString(),
        name: doc.name,
        role: doc.role,
        color: doc.color,
      },
    },
    { status: 201 },
  );
});
