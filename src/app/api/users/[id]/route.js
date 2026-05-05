import connectDB from '@/config/database';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { getSessionUser } from '@/utils/getSessionUser';
import { EMAIL_RE } from '@/lib/validation';

await connectDB();

export const GET = async (req, { params }) => {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;

    if (!id) {
      return new Response('User ID is missing', { status: 400 });
    }

    const user = await User.findById(id).select('-largeField');

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    return new Response(JSON.stringify(user), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Something went wrong', { status: 500 });
  }
};

const MAX_PASSWORD_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 8;

export const PUT = async (req, { params }) => {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    if (sessionUser.userId !== id) {
      return new Response('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, currentPassword, newPassword, profileImage } = body;

    // --- Profile info update (name / email / phone) ---
    if (name !== undefined || email !== undefined || phone !== undefined) {
      if (name !== undefined) {
        const trimmed = name.trim();
        if (!trimmed) return new Response('Name is required', { status: 400 });
        if (trimmed.length > 80) return new Response('Name is too long', { status: 400 });
      }

      if (email !== undefined) {
        if (!EMAIL_RE.test(email)) return new Response('Invalid email address', { status: 400 });
        const conflict = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
        if (conflict) return new Response('Email is already in use', { status: 409 });
      }

      if (phone !== undefined && phone !== '') {
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10) return new Response('Phone number must have at least 10 digits', { status: 400 });
      }

      const updateFields = {};
      if (name !== undefined) updateFields.name = name.trim();
      if (email !== undefined) updateFields.email = email.toLowerCase().trim();
      if (phone !== undefined) updateFields.phone = phone.trim();

      await User.findByIdAndUpdate(id, { $set: updateFields }, { runValidators: true });
      return new Response(
        JSON.stringify({ message: 'Profile updated successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- Password update ---
    if (!newPassword) {
      return new Response('New password is required', { status: 400 });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
      return new Response(
        `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
        { status: 400 }
      );
    }

    const user = await User.findById(id).select('+password');

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    if (user.password) {
      if (!currentPassword) {
        return new Response('Current password is required', { status: 400 });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return new Response('Current password is incorrect', { status: 401 });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updateFields = { password: hashedPassword };
    if (profileImage) updateFields.profileImage = profileImage;

    await User.findByIdAndUpdate(id, { $set: updateFields });

    return new Response(
      JSON.stringify({ message: 'Password updated successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(error);
    return new Response('Something went wrong', { status: 500 });
  }
};
