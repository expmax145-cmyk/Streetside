import crypto from 'node:crypto';
import { User, hashPassword, type IUser } from '../models/User.model';
import { ApiError } from '../utils/ApiError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { RewardActivity } from '../models/RewardActivity.model';
import { sendMail } from '../utils/mailer';
import { env } from '../config/env';
import type { UserRole } from '../types/enums';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  avatar: string;
  phone?: string;
  vendorId?: string;
  points: number;
  emailVerified: boolean;
  createdAt: Date;
}

function toSafeUser(user: IUser): SafeUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    phone: user.phone,
    vendorId: user.vendor ? String(user.vendor) : undefined,
    points: user.points,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

function issueTokens(user: IUser, refreshTokenVersion: number): Tokens {
  const accessToken = signAccessToken({
    sub: String(user._id),
    role: user.role,
    vendorId: user.vendor ? String(user.vendor) : undefined,
  });
  const refreshToken = signRefreshToken({ sub: String(user._id), v: refreshTokenVersion });
  return { accessToken, refreshToken };
}

// ── token helpers (shared by email verification + password reset) ──────────

/** Returns { raw, hash } — raw goes in the emailed link, hash is what's stored. */
function generateVerificationToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

async function sendVerificationEmail(user: IUser, rawToken: string): Promise<void> {
  const link = `${env.frontendUrl}/verify-email?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your StreetSide email',
    text: `Hi ${user.name},\n\nVerify your email: ${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${user.name},</p><p>Please verify your email address for StreetSide:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
  }).catch((err) => {
    // Best-effort — a mail-provider outage must never break registration.
    console.error('[auth] Failed to send verification email:', err);
  });
}

async function sendPasswordResetEmail(user: IUser, rawToken: string): Promise<void> {
  const link = `${env.frontendUrl}/reset-password?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your StreetSide password',
    text: `Hi ${user.name},\n\nReset your password: ${link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    html: `<p>Hi ${user.name},</p><p>Reset your StreetSide password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
  }).catch((err) => {
    console.error('[auth] Failed to send password reset email:', err);
  });
}

// ── register / login / refresh / logout ─────────────────────────────────────

// vendorId is NOT accepted from public registration.
// Vendor ownership is established only through the vendor-creation flow.
export async function register(input: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}): Promise<{ user: SafeUser; tokens: Tokens }> {
  const requestedRole = input.role ?? 'customer';
  if (requestedRole === 'admin') {
    throw ApiError.forbidden('Cannot self-register as admin');
  }

  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const { raw, hash } = generateVerificationToken();

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: requestedRole,
    // vendorId intentionally omitted — set only after createVendor()
    emailVerificationTokenHash: hash,
    emailVerificationExpires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });

  await RewardActivity.create({
    user: user._id,
    action: 'registered',
    description: 'Registered on StreetSide',
    points: user.points,
  }).catch(() => undefined);

  // best-effort, never blocks registration
  await sendVerificationEmail(user, raw);

  const tokens = issueTokens(user, 0);
  return { user: toSafeUser(user), tokens };
}

export async function login(email: string, password: string): Promise<{ user: SafeUser; tokens: Tokens }> {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +refreshTokenVersion');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.status === 'suspended') {
    throw ApiError.forbidden('This account has been suspended. Contact support for help.');
  }

  const tokens = issueTokens(user, user.refreshTokenVersion);
  return { user: toSafeUser(user), tokens };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; user: SafeUser }> {
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired session — please log in again');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenVersion');
  if (!user) {
    throw ApiError.unauthorized('Invalid or expired session — please log in again');
  }

  if (payload.v !== user.refreshTokenVersion) {
    throw ApiError.unauthorized('Invalid or expired session — please log in again');
  }

  // Check suspension status at refresh time (not just at login)
  if (user.status === 'suspended') {
    throw ApiError.forbidden('This account has been suspended. Contact support for help.');
  }

  const accessToken = signAccessToken({
    sub: String(user._id),
    role: user.role,
    vendorId: user.vendor ? String(user.vendor) : undefined,
  });

  return { accessToken, user: toSafeUser(user) };
}

export async function logout(userId: string | undefined): Promise<void> {
  if (!userId) return;
  await User.findByIdAndUpdate(userId, { $inc: { refreshTokenVersion: 1 } });
}

export async function getMe(userId: string): Promise<SafeUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return toSafeUser(user);
}

export async function updateProfile(
  userId: string,
  input: { name?: string; phone?: string; avatar?: string },
): Promise<SafeUser> {
  // FIX: enforce avatar size limit server-side too
  if (input.avatar && input.avatar.startsWith('data:') && input.avatar.length > 900_000) {
    throw ApiError.badRequest('Avatar image is too large');
  }
  const user = await User.findByIdAndUpdate(userId, { $set: input }, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  return toSafeUser(user);
}

// ── email verification ───────────────────────────────────────────────

export async function verifyEmail(rawToken: string): Promise<void> {
  if (!rawToken) throw ApiError.badRequest('Verification token is required');
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await User.findOne({ emailVerificationTokenHash: hash })
    .select('+emailVerificationTokenHash +emailVerificationExpires');
  if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    throw ApiError.badRequest('That verification link is invalid or has expired');
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
}

export async function resendVerification(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.emailVerified) {
    throw ApiError.badRequest('This email is already verified');
  }

  const { raw, hash } = generateVerificationToken();
  user.emailVerificationTokenHash = hash;
  user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await user.save();

  await sendVerificationEmail(user, raw);
}

// ── password reset ───────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Deliberately silent on a miss — the controller always returns the same
  // 200 response regardless, so this function doesn't need to (and must
  // not) signal existence back to the caller.
  if (!user) return;

  const { raw, hash } = generateVerificationToken();
  user.passwordResetTokenHash = hash;
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  await sendPasswordResetEmail(user, raw);
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  if (!rawToken) throw ApiError.badRequest('Reset token is required');
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await User.findOne({ passwordResetTokenHash: hash })
    .select('+passwordResetTokenHash +passwordResetExpires +refreshTokenVersion');
  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw ApiError.badRequest('That reset link is invalid or has expired');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  // Invalidate every existing session (refresh token) — a password reset
  // is exactly the moment an attacker who had the old password (and any
  // live session from it) must be logged out everywhere.
  user.refreshTokenVersion += 1;
  await user.save();
}

export { toSafeUser };
