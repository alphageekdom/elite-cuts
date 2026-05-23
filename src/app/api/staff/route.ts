import { NextResponse, type NextRequest } from 'next/server';
import StaffMemberModel, {
  STAFF_ROLE_KEYS,
  STAFF_STATUSES,
  type StaffRoleKey,
  type StaffStatus,
} from '@/models/StaffMember';
import { SHIFT_COLORS } from '@/lib/shift-constants';
import { withAdmin } from '@/lib/api-handler';

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
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    role?: string;
    roleKey?: string;
    station?: string;
    color?: string;
    status?: string;
    email?: string;
    notes?: string;
  };

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ message: 'Name is too long' }, { status: 400 });
  }

  const color = body.color && (SHIFT_COLORS as readonly string[]).includes(body.color)
    ? (body.color as (typeof SHIFT_COLORS)[number])
    : 'marcus';

  const roleKey: StaffRoleKey =
    body.roleKey && (STAFF_ROLE_KEYS as readonly string[]).includes(body.roleKey)
      ? (body.roleKey as StaffRoleKey)
      : 'other';

  const status: StaffStatus =
    body.status && (STAFF_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as StaffStatus)
      : 'active';

  const doc = await StaffMemberModel.create({
    name,
    role: body.role?.trim() ?? '',
    roleKey,
    station: body.station?.trim() ?? '',
    color,
    status,
    email: body.email?.trim() ?? '',
    notes: body.notes?.trim() ?? '',
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
