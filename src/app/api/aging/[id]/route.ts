import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/config/database';
import AgingCut from '@/models/AgingCut';
import { requireAdmin } from '@/utils/requireAdmin';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;
  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const { cut: cutName, targetDays, rack, weightLb, startedAt, isActive } = await request.json();
    const patch = { cut: cutName, targetDays, rack, weightLb, startedAt, isActive };
    const cut = await AgingCut.findByIdAndUpdate(id, { $set: patch }, { returnDocument: 'after', runValidators: true });
    if (!cut) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(cut);
  } catch (error) {
    console.error('[aging/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

export const DELETE = async (_request: NextRequest, { params }: RouteContext) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;
  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    await AgingCut.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('[aging/:id DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
