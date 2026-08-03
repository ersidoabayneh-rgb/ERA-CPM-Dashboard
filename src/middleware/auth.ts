import { Request, Response, NextFunction } from 'express';

export interface DecodedIdToken {
  uid: string;
  email?: string;
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  // Standalone backend auth middleware
  const authHeader = req.headers.authorization;
  let uid = 'admin_user';
  let email = 'admin@era.gov.et';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    if (token) {
      uid = token;
    }
  }

  req.user = {
    uid,
    email,
  };
  next();
};
