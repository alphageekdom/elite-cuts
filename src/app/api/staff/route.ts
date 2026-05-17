import { NextResponse, type NextRequest } from 'next/server';
import StaffMemberModel from '@/models/StaffMember';
import { SHIFT_COLORS } from '@/lib/shift-constants';
import { withAdmin } from '@/lib/api-handler';

// GET /api/staff — admin-only roster lookup. Returns active staff ordered by name
// for the schedule shift drawer.
export const GET = withAdmin(async () => {
  const docs = await StaffMemberModel.find({ isActive: true })
    .select('name role color')
    .sort({ name: 1 })
    .lean();

  return NextResponse.json(
    docs.map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      role: d.role,
      color: d.color,
    })),
  );
});

// POST /api/staff — create a new staff member.
export const POST = withAdmin(async (request: NextRequest) => {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    role?: string;
    color?: string;
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

  const doc = await StaffMemberModel.create({
    name,
    role: body.role?.trim() ?? '',
    color,
    notes: body.notes?.trim() ?? '',
    isActive: true,
  });

  return NextResponse.json(
    { _id: doc._id.toString(), name: doc.name, role: doc.role, color: doc.color },
    { status: 201 },
  );
});
