import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

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

export type User = {
  name: string;
  email: string;
  password: string;
  favorites: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
  addresses: Types.DocumentArray<Address>;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDocument = HydratedDocument<User>;

const AddressSchema = new Schema<Address>(
  {
    label: { type: String, required: true, trim: true },
    address1: { type: String, required: true, trim: true },
    address2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zip: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    favorites: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    bookmarks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    addresses: [AddressSchema],
    isAdmin: {
      type: Boolean,
      default: false,
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

const UserModel =
  (models.User as Model<User> | undefined) || model<User>('User', UserSchema);

export default UserModel;