import type { Types } from 'mongoose';

// Address sub-document shape on the User model. Carried as a typed
// DocumentArray on User.addresses; serialized to `SerializedAddress`
// (id stringified) for wire payloads and to `AddressFormData` for forms.
export type Address = {
  _id: Types.ObjectId;
  label: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
};

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
