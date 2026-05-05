'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/config/database';
import UserModel from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import type { Address, AddressFormData } from '@/types/address';

type ActionResult = { success: boolean; error?: string };

async function getAuthedUserId(): Promise<string | null> {
  const session = await getSessionUser();
  return session?.userId ?? null;
}

export async function addAddress(data: AddressFormData): Promise<ActionResult> {
  const userId = await getAuthedUserId();
  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    await connectDB();
    const user = await UserModel.findById(userId);
    if (!user) return { success: false, error: 'User not found' };

    if (data.isDefault) {
      for (const addr of user.addresses) addr.isDefault = false;
    }
    if (user.addresses.length === 0) data.isDefault = true;

    user.addresses.push({
      label: data.label.trim(),
      address1: data.address1.trim(),
      address2: data.address2?.trim() || undefined,
      city: data.city.trim(),
      state: data.state.trim(),
      zip: data.zip.trim(),
      isDefault: data.isDefault,
    } as Omit<Address, '_id'>);

    await user.save();
    revalidatePath('/profile');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to add address' };
  }
}

export async function updateAddress(
  addressId: string,
  data: AddressFormData,
): Promise<ActionResult> {
  const userId = await getAuthedUserId();
  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    await connectDB();
    const user = await UserModel.findById(userId);
    if (!user) return { success: false, error: 'User not found' };

    const addr = user.addresses.id(addressId);
    if (!addr) return { success: false, error: 'Address not found' };

    if (data.isDefault) {
      for (const a of user.addresses) a.isDefault = false;
    }

    addr.label = data.label.trim();
    addr.address1 = data.address1.trim();
    addr.address2 = data.address2?.trim() || undefined;
    addr.city = data.city.trim();
    addr.state = data.state.trim();
    addr.zip = data.zip.trim();
    addr.isDefault = data.isDefault;

    await user.save();
    revalidatePath('/profile');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update address' };
  }
}

export async function deleteAddress(addressId: string): Promise<ActionResult> {
  const userId = await getAuthedUserId();
  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    await connectDB();
    const user = await UserModel.findById(userId);
    if (!user) return { success: false, error: 'User not found' };

    const wasDefault = user.addresses.id(addressId)?.isDefault ?? false;
    user.addresses.pull(addressId);

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    revalidatePath('/profile');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete address' };
  }
}

export async function setDefaultAddress(addressId: string): Promise<ActionResult> {
  const userId = await getAuthedUserId();
  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    await connectDB();
    const user = await UserModel.findById(userId);
    if (!user) return { success: false, error: 'User not found' };

    for (const addr of user.addresses) {
      addr.isDefault = addr._id.toString() === addressId;
    }

    await user.save();
    revalidatePath('/profile');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to set default address' };
  }
}
