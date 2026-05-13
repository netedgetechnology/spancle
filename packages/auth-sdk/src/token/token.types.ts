import type { JwtPayload } from '@spancle/types';

export interface DecodedToken {
  payload:    JwtPayload;
  isExpired:  boolean;
  expiresAt:  Date;
  issuedAt:   Date;
}

export interface TokenValidationResult {
  valid:   boolean;
  payload: JwtPayload | null;
  error?:  'expired' | 'invalid' | 'malformed' | 'missing_claims';
}

export interface TokenClaims {
  sub:      string;
  userId:   string;
  tenantId: string;
  role:     string;
  iat:      number;
  exp:      number;
}
