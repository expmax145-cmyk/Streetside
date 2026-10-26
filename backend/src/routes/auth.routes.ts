import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter';
import {
  registerHandler,
  loginHandler,
  meHandler,
  updateProfileHandler,
  refreshHandler,
  logoutHandler,
  verifyEmailHandler,
  resendVerificationHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from '../controllers/auth.controller';

const router = Router();

const passwordRule = body('password')
  .isString()
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/\d/)
  .withMessage('Password must contain at least one number');

router.post(
  '/register',
  authLimiter,
  [
    body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    passwordRule,
    body('role').optional().isIn(['customer', 'vendor']).withMessage('Role must be customer or vendor'),
    // vendorId is NOT accepted on public registration.
    // Ownership is established only inside createVendor().
  ],
  validate,
  registerHandler,
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  validate,
  loginHandler,
);

router.get('/me', authenticate, meHandler);
router.patch(
  '/me',
  authenticate,
  [
    body('name').optional().isString().trim().isLength({ min: 2, max: 100 }),
    body('phone').optional().isString().trim().isLength({ max: 30 }),
    body('avatar')
      .optional()
      .isString()
      .isLength({ max: 900_000 })
      .withMessage('Avatar image is too large')
      .custom((value: string) =>
        /^https?:\/\/\S+$/i.test(value) ||
        /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value) ||
        /^\/api\/media\/[a-f0-9]{24}$/i.test(value),
      )
      .withMessage('Avatar must be a valid image URL or an uploaded image (PNG, JPEG, WebP, or GIF)'),
  ],
  validate,
  updateProfileHandler,
);

// /refresh is behind authLimiter but NOT the write limiter, and
// should NEVER trigger a retry loop from the frontend (api.ts skips
// refresh-and-retry for this path).
router.post('/refresh', authLimiter, refreshHandler);
router.post('/logout', logoutHandler);

// email verification
router.post(
  '/verify-email',
  authLimiter,
  body('token').isString().isLength({ min: 10, max: 200 }),
  validate,
  verifyEmailHandler,
);
router.post('/resend-verification', authenticate, authLimiter, resendVerificationHandler);

// password reset
router.post(
  '/forgot-password',
  authLimiter,
  body('email').isEmail().normalizeEmail(),
  validate,
  forgotPasswordHandler,
);
router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').isString().isLength({ min: 10, max: 200 }),
    body('newPassword')
      .isString()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
  ],
  validate,
  resetPasswordHandler,
);

export default router;
