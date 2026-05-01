import connectDB from '@/config/database';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { signIn } from 'next-auth/react';
import { validationResult } from 'express-validator';

// POST /api/auth/login
export const POST = async (request) => {
  try {
    await connectDB();

    const errors = validationResult(request);

    if (!errors.isEmpty()) {
      return new Response(JSON.stringify({ errors: errors.array() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email, password } = await request.json();

    const user = await User.findOne({ email });

    if (!user) {
      return new Response(JSON.stringify({ error: "User Doesn't Exist" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return new Response(JSON.stringify({ error: 'Invalid Credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await signIn('credentials', {
      email: user.email,
    });

    return new Response(JSON.stringify({ message: 'Login successful' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
