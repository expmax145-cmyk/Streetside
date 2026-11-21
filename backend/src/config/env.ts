import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  clientUrl: string;
  bcryptSaltRounds: number;
  // number of reverse-proxy hops to trust for req.ip
  trustProxy: number;
  // IANA timezone for open-now and offer-expiry logic
  appTimezone: string;
  // SMTP config for email verification and password reset.
  // Optional — see utils/mailer.ts for the console-log fallback when unset.
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  // base URL the frontend is served from, used to build
  // verification/reset links embedded in emails.
  frontendUrl: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Tests run without a .env file; JWT signing needs a non-empty secret.
    if (process.env.NODE_ENV === 'test') return `test-${name.toLowerCase()}`;
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

export const env: EnvConfig = {
  nodeEnv: (process.env.NODE_ENV as EnvConfig['nodeEnv']) || 'development',
  port: Number(process.env.PORT) || 5001,
  // Postgres connection string (Supabase pooler URL in production). Optional
  // under test, where an in-memory Postgres is used.
  databaseUrl: process.env.DATABASE_URL || '',
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  appTimezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'StreetSide <no-reply@streetside.app>',
  },
  frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173',
};

export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
