import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import { env, isProduction, isTest } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter, writeLimiter } from './middleware/rateLimiter';
import { csrfProtection } from './middleware/csrf.middleware';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import vendorRoutes from './routes/vendor.routes';
import reviewRoutes, { vendorReviewsRouter } from './routes/review.routes';
import favoriteRoutes from './routes/favorite.routes';
import menuRoutes, { vendorMenuRouter } from './routes/menu.routes';
import offerRoutes, { vendorOffersRouter } from './routes/offer.routes';
import eventRoutes from './routes/event.routes';
import adminRoutes from './routes/admin.routes';
import reportRoutes from './routes/report.routes';
import foodTrailRoutes from './routes/foodTrail.routes';
import rewardRoutes from './routes/reward.routes';
import mediaRoutes from './routes/media.routes';

export function createApp(): Express {
  const app = express();

  // Set trust proxy BEFORE any rate-limiter so req.ip is the
  // real client IP behind a load balancer / reverse proxy.
  // TRUST_PROXY=1 means "trust one proxy hop" (standard for most setups).
  const trustProxy = Number(process.env.TRUST_PROXY) || 0;
  if (trustProxy > 0) {
    app.set('trust proxy', trustProxy);
  }

  app.use(helmet());

  const allowedOrigins = new Set([
    env.clientUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  app.use(
    cors({
      origin: (origin, callback) => {
        const isLocalDevelopmentOrigin = !isProduction &&
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
        if (!origin || allowedOrigins.has(origin) || isLocalDevelopmentOrigin) {
          callback(null, true);
        } else {
          // passes an Error so errorHandler can return 403
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }),
  );

  // body-parser limits — errors bubble to errorHandler as SyntaxError
  // or 413 with a type property, both handled for correct status codes.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());

  // global CSRF check for all mutating requests, now that the
  // access token lives in an httpOnly cookie the browser attaches
  // automatically (see csrf.middleware.ts for the threat model).
  app.use(csrfProtection);

  if (!isTest) {
    app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
  }

  // apply the general API limiter globally (GET requests excluded)
  if (!isTest) {
    app.use(apiLimiter);
  }

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/vendors', vendorRoutes);
  app.use('/api/vendors/:vendorId/reviews', vendorReviewsRouter);
  app.use('/api/vendors/:vendorId/menu', vendorMenuRouter);
  app.use('/api/vendors/:vendorId/offers', vendorOffersRouter);

  // apply write limiter individually (TS overload requires one path per call)
  if (!isTest) {
    for (const route of ['/api/reviews', '/api/favorites', '/api/menu', '/api/offers', '/api/reports']) {
      app.use(route, writeLimiter);
    }
  }

  app.use('/api/reviews', reviewRoutes);
  app.use('/api/favorites', favoriteRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/offers', offerRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/food-trails', foodTrailRoutes);
  app.use('/api/rewards', rewardRoutes);
  // (Media collection): serves uploaded images by id instead of
  // storing base64 inline in Vendor/MenuItem/User documents.
  app.use('/api/media', mediaRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
