import bcrypt from 'bcryptjs';
import { defineModel, type BaseDoc } from '../db/model';
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from '../types/enums';
import { env } from '../config/env';

export interface IUser extends BaseDoc {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  avatar: string;
  phone?: string;
  /** Set once a 'vendor'-role user has a vendor listing created for them. */
  vendor?: any;
  points: number;
  // Bumped on logout so any refresh token issued before that moment is
  // rejected even though it's still cryptographically valid and unexpired.
  refreshTokenVersion: number;
  emailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpires?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

// NOTE: `hidden` fields are not loaded unless selected explicitly, so login
// must do `User.findOne({ email }).select('+passwordHash')`.
export const User = defineModel<IUser>({
  name: 'User',
  table: 'users',
  fields: {
    name: { type: 'string', required: true, trim: true, maxlength: 100 },
    email: {
      type: 'string',
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    passwordHash: { type: 'string', required: true, hidden: true },
    role: { type: 'string', enum: USER_ROLES, default: 'customer' },
    status: { type: 'string', enum: USER_STATUSES, default: 'active' },
    avatar: {
      type: 'string',
      default: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
    phone: { type: 'string', trim: true },
    vendor: { type: 'id', column: 'vendor_id', ref: 'Vendor' },
    points: { type: 'number', default: 100, min: 0 },
    refreshTokenVersion: { type: 'number', default: 0, hidden: true },
    emailVerified: { type: 'boolean', default: false },
    emailVerificationTokenHash: { type: 'string', hidden: true },
    emailVerificationExpires: { type: 'date', hidden: true },
    passwordResetTokenHash: { type: 'string', hidden: true },
    passwordResetExpires: { type: 'date', hidden: true },
  },
  methods: {
    comparePassword(this: IUser, candidate: string) {
      return bcrypt.compare(candidate, this.passwordHash);
    },
  },
});

/**
 * Hashes a plaintext password for storage. Callers (the auth service) must
 * hash BEFORE creating a User — there is deliberately no implicit hook.
 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptSaltRounds);
}
