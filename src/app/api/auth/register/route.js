import connectDB from '@/config/database';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

// POST /api/auth/register
export const POST = async (request) => {
  try {
    await connectDB();

    const { name, email, password } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { message: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // return Response.redirect(`${process.env.NEXTAUTH_URL}/auth/login`);

    return NextResponse.json(
      { message: 'User registered successfully', user: newUser },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
};
