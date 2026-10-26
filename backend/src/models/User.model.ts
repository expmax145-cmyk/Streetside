import { Schema, model, type Document, type Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { toJSONPlugin } from './plugins/toJSON';
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from '../types/enums';
import { env } from '../config/env';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  avatar: string;
  phone?: string;
  vendor?: Types.ObjectId;
  points: number;
  // Bumped on logout so any refresh token issued before that moment is
  // rejected even though it's still cryptographically valid and
  // unexpired — see utils/jwt.ts and services/auth.service.ts. Without
  // this, JWTs are stateless and "logout" can't actually revoke a
  // refresh token before it naturally expires.
  refreshTokenVersion: number;
  // (email verification, deferred item from the original fix pass)
  emailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpires?: Date;
  // (password reset, deferred item from the original fix pass)
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'customer' },
    status: { type: String, enum: USER_STATUSES, default: 'active' },
    avatar: {
      type: String,
      default: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
    phone: { type: String, trim: true },
    // Set once a 'vendor'-role user has a vendor listing created for them
    // (see POST /api/vendors in Phase 4) — this is how the vendor
    // dashboard knows which listing belongs to the logged-in account.
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    points: { type: Number, default: 100, min: 0 },
    refreshTokenVersion: { type: Number, default: 0, select: false },
    // not required at registration -- the account works
    // immediately, this only gates a "please verify your email" banner
    // and the resend-verification endpoint. Never blocks login.
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    // only ever set while a reset is in flight; cleared on use
    // or replaced by a newer request.
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });

// NOTE for the auth service (Phase 3): passwordHash has `select: false`
// above, so a plain `User.findOne({ email })` will NOT include it, and
// `comparePassword` below would then be comparing against `undefined`.
// Login must explicitly do `User.findOne({ email }).select('+passwordHash')`.
userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.plugin(toJSONPlugin);

export const User = model<IUser>('User', userSchema);

/**
 * Hashes a plaintext password for storage. Callers (the auth service)
 * must hash BEFORE constructing/saving a User — there is deliberately no
 * pre-save hook doing this implicitly, because a hook that reads
 * `this.passwordHash` to decide "is this plaintext or already hashed?"
 * is an easy place to introduce a double-hash or a plaintext-storage bug.
 * Explicit is safer here than magic.
 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptSaltRounds);
}
