import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/ApiError';
import { setAuthCookies, clearAuthCookies, setAccessCookie, setCsrfCookie, REFRESH_COOKIE_NAME } from '../utils/cookies';
import { verifyRefreshToken } from '../utils/jwt';
import * as authService from '../services/auth.service';

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  // vendorId intentionally excluded from public registration
  const { name, email, password, role } = req.body;
  const { user, tokens } = await authService.register({ name, email, password, role });
  // tokens are never put in the JSON body anymore -- both
  // live in httpOnly cookies the frontend can't read or leak via XSS.
  setAuthCookies(res, tokens);
  sendSuccess(res, { user }, 201);
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { user, tokens } = await authService.login(email, password);
  setAuthCookies(res, tokens);
  sendSuccess(res, { user });
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  sendSuccess(res, { user });
});

export const updateProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateProfile(req.user!.id, {
    name: req.body.name,
    phone: req.body.phone,
    avatar: req.body.avatar,
  });
  sendSuccess(res, { user });
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    throw ApiError.unauthorized('No refresh token provided');
  }
  const { accessToken, user } = await authService.refreshAccessToken(token);
  // re-issue the access + CSRF cookies (refresh cookie is
  // untouched -- its own expiry keeps counting down toward 7 days).
  setAccessCookie(res, accessToken);
  setCsrfCookie(res);
  sendSuccess(res, { user });
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await authService.logout(payload.sub);
    } catch {
      // Token was already invalid/expired -- nothing to invalidate, and
      // logout should still succeed from the client's point of view.
    }
  }
  clearAuthCookies(res);
  sendSuccess(res, { message: 'Logged out' });
});

export const verifyEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token: string };
  await authService.verifyEmail(token);
  sendSuccess(res, { message: 'Email verified' });
});

export const resendVerificationHandler = asyncHandler(async (req: Request, res: Response) => {
  await authService.resendVerification(req.user!.id);
  sendSuccess(res, { message: 'Verification email sent' });
});

export const forgotPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  await authService.requestPasswordReset(email);
  // Always 200, regardless of whether the email exists -- prevents
  // account enumeration via this endpoint.
  sendSuccess(res, { message: 'If that email is registered, a reset link has been sent.' });
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  await authService.resetPassword(token, newPassword);
  sendSuccess(res, { message: 'Password has been reset. Please log in again.' });
});
