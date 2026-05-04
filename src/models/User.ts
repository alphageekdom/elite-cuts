import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export type User = {
  name: string;
  email: string;
  password: string;
  favorites: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDocument = HydratedDocument<User>;

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