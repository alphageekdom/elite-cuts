export type { Address } from '@/models/User';

export type SerializedAddress = {
  _id: string;
  label: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
};

export type AddressFormData = {
  label: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
};
