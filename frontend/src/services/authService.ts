import api from './api';
import type { User } from '@/types';

// the backend response body no longer carries a token at all
// (see backend/src/controllers/auth.controller.ts) -- login/register/
// refresh set httpOnly cookies directly, and the body only ever contains
// `{ user }`. There is nothing here to store client-side.
type AuthResponse = { user?: User };

export async function login(
  email: string,
  password: string,
): Promise<{ user: User }> {
  const res = await api.post('/auth/login', { email, password });
  const data = res.data as AuthResponse;
  return { user: data.user as User };
}

// vendorId removed — the backend no longer accepts it on registration
export async function register(
  name: string,
  email: string,
  password: string,
  role: 'customer' | 'vendor',
) {
  const res = await api.post('/auth/register', { name, email, password, role });
  return res.data as AuthResponse;
}

export async function me(): Promise<User | null> {
  try {
    const res = await api.get('/auth/me');
    return (res.data as AuthResponse).user ?? null;
  } catch {
    return null;
  }
}

export async function updateProfile(updates: Partial<Pick<User, 'name' | 'phone' | 'avatar'>>) {
  const res = await api.patch('/auth/me', updates);
  return (res.data as AuthResponse).user as User;
}

export async function logout() {
  await api.post('/auth/logout');
}

// email verification
export async function verifyEmail(token: string) {
  await api.post('/auth/verify-email', { token });
}

export async function resendVerification() {
  await api.post('/auth/resend-verification');
}

// password reset
export async function forgotPassword(email: string) {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string) {
  await api.post('/auth/reset-password', { token, newPassword });
}

export default {
  login, register, me, updateProfile, logout,
  verifyEmail, resendVerification, forgotPassword, resetPassword,
};
