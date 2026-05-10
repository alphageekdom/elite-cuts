import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

import connectDB from '@/config/database';
import User from '@/models/User';
import { EMAIL_RE } from '@/lib/validation';

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export const POST = async (request: NextRequest) => {
  try {
    await connectDB();

    const { name, email, password, confirmPassword } = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 },
      );
    }

    if (name.trim().length > 80) {
      return NextResponse.json(
        { message: 'Name must be 80 characters or fewer' },
        { status: 400 },
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ message: 'Invalid email address' }, { status: 400 });
    }

    if (
      password.length < MIN_PASSWORD_LENGTH ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      return NextResponse.json(
        {
          message: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
        },
        { status: 400 },
      );
    }

    if (confirmPassword !== undefined && confirmPassword !== password) {
      return NextResponse.json(
        { message: 'Passwords do not match' },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await new User({ name, email: normalizedEmail, password: hashedPassword }).save();

    return NextResponse.json(
      { message: 'User registered successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('[register]', error);
    return NextResponse.json(
      { message: 'Registration failed. Please try again.' },
      { status: 500 },
    );
  }
};
