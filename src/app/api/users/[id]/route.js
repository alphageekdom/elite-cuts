import connectDB from '@/config/database';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { getSessionUser } from '@/utils/getSessionUser';

await connectDB();

// GET /api/users/:userId
export const GET = async (req, { params }) => {
  try {
    const { id } = params;

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
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// PUT /api/users/:userId
export const PUT = async (req) => {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new Response('User ID Is Required', { status: 401 });
    }

    const { userId, newPassword, profileImage } = await req.json();
    console.log(userId, newPassword, profileImage);

    if (!userId || !newPassword) {
      return new Response('Invalid input data', { status: 400 });
    }

    if (sessionUser.user.id !== userId) {
      return new Response('Unauthorized: User ID does not match', {
        status: 401,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (profileImage) {
      const user = await User.findByIdAndUpdate(
        { _id: userId },
        { password: hashedPassword, profileImage },
        { upsert: true, new: true }
      );

      if (!user) {
        return new Response('User not found', { status: 404 });
      }

      return new Response(
        JSON.stringify({
          message: 'Password and profile image updated successfully',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      const user = await User.findByIdAndUpdate(
        { _id: userId },
        { password: hashedPassword }
      );

      if (!user) {
        return new Response('User not found', { status: 404 });
      }

      return new Response(
        JSON.stringify({ message: 'Password updated successfully' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error(error);
    return new Response('Something went wrong', { status: 500 });
  }
};
