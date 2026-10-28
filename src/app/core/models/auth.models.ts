export type UserRole = 'STUDENT' | 'FAMILY' | 'DRIVER' | 'COORDINATOR';
export type SelfRegistrationRole = Extract<UserRole, 'STUDENT' | 'FAMILY'>;

export interface LoginRequest {
  email: string;
  password: string;
  role: UserRole;
  rememberMe: boolean;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: SelfRegistrationRole;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface MockUser extends AuthenticatedUser {
  /** Solo para la simulación local de la US01. Nunca guardar contraseñas así en producción. */
  password: string;
}

export interface PasswordResetTicket {
  email: string;
  token: string;
  expiresAt: number;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export type AuthErrorCode =
  | 'BLOCKED'
  | 'INVALID_CREDENTIALS'
  | 'ROLE_MISMATCH'
  | 'EMAIL_EXISTS'
  | 'EMAIL_NOT_FOUND'
  | 'INVALID_RESET_LINK';

export class AuthMockError extends Error {
  constructor(readonly code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthMockError';
  }
}
