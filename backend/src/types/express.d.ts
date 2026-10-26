import 'express';

export interface AuthenticatedUser {
  id: string;
  role: 'customer' | 'vendor' | 'admin';
  vendorId?: string;
}

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `authenticate` middleware after verifying the access token. */
      user?: AuthenticatedUser;
    }
  }
}
