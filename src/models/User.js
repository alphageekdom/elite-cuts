import { Schema, model, models } from 'mongoose';

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
    },
    email: {
      type: String,
      unique: [true, 'Email Already Exists'],
      required: [true, 'Email Is Required'],
    },
    password: {
      type: String,
      required: true,
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
    },
  },
  {
    timestamps: true,
  }
);

const User = models.User || model('User', UserSchema);

export default User;
