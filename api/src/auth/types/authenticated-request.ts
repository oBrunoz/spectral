import { AccessTokenPayload } from '../token.service.js';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
}
