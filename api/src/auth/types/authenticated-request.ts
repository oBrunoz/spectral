import { AccessTokenPayload } from "../token.service.js";

export interface AuthenticatedRequest extends Request {
    user: AccessTokenPayload;
}