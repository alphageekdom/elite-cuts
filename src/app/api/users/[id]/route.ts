import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import connectDB from '@/config/database';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import { requireAdmin } from '@/utils/requireAdmin';
import { EMAIL_RE } from '@/lib/validation';

type RouteContext = { params: Promise<{ id: string }> };

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

// GET /api/users/:id — self or admin only
export const GET = async (_request: NextRequest, { params }: RouteContext) => {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    if (sessionUser.userId !== id && !sessionUser.user?.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(id).select('-password');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('[users/:id GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// PUT /api/users/:id — profile info or password update, self only
export const PUT = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const isAdmin = sessionUser.user?.isAdmin ?? false;

    if (sessionUser.userId !== id && !isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      adminNote?: string;
      currentPassword?: string;
      newPassword?: string;
    };
    const { name, email, phone, adminNote, currentPassword, newPassword } = body;

    // Admin note update — admin only
    if (adminNote !== undefined) {
      if (!isAdmin) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      await User.findByIdAndUpdate(id, { $set: { adminNote: adminNote.trim() } });
      return NextResponse.json({ message: 'Note updated' });
    }

    // Profile info update (name / email / phone) — also allowed for admin on any user
    if (name !== undefined || email !== undefined || phone !== undefined) {
      if (name !== undefined) {
        const trimmed = name.trim();
        if (!trimmed) return NextResponse.json({ message: 'Name is required' }, { status: 400 });
        if (trimmed.length > 80) return NextResponse.json({ message: 'Name is too long' }, { status: 400 });
      }

      if (email !== undefined) {
        if (!EMAIL_RE.test(email)) {
          return NextResponse.json({ message: 'Invalid email address' }, { status: 400 });
        }
        const conflict = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
        if (conflict) {
          return NextResponse.json({ message: 'Email is already in use' }, { status: 409 });
        }
      }

      if (phone !== undefined && phone !== '') {
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10) {
          return NextResponse.json(
            { message: 'Phone number must have at least 10 digits' },
            { status: 400 },
          );
        }
      }

      const updateFields: Record<string, string> = {};
      if (name !== undefined) updateFields.name = name.trim();
      if (email !== undefined) updateFields.email = email.toLowerCase().trim();
      if (phone !== undefined) updateFields.phone = phone.trim();

      await User.findByIdAndUpdate(id, { $set: updateFields }, { runValidators: true });
      return NextResponse.json({ message: 'Profile updated successfully' });
    }

    // Password update — self only, not allowed via admin path
    if (isAdmin && sessionUser.userId !== id) {
      return NextResponse.json({ message: 'Admins cannot change another user\'s password' }, { status: 403 });
    }

    if (!newPassword) {
      return NextResponse.json({ message: 'New password is required' }, { status: 400 });
    }

    if (
      newPassword.length < MIN_PASSWORD_LENGTH ||
      newPassword.length > MAX_PASSWORD_LENGTH
    ) {
      return NextResponse.json(
        { message: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }

    const user = await User.findById(id).select('+password');
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (user.password) {
      if (!currentPassword) {
        return NextResponse.json({ message: 'Current password is required' }, { status: 400 });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ message: 'Current password is incorrect' }, { status: 401 });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(id, { $set: { password: hashedPassword } });

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('[users/:id PUT]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// DELETE /api/users/:id — admin only
export const DELETE = async (_request: NextRequest, { params }: RouteContext) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    await connectDB();

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const deleted = await User.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[users/:id DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
