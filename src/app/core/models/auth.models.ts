export type UserRole = 'STUDENT' | 'FAMILY' | 'DRIVER' | 'COORDINATOR';
export type SelfRegistrationRole = Extract<UserRole, 'STUDENT' | 'FAMILY'>;

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: SelfRegistrationRole;
  institutionId?: number;
  studentCode?: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  institutionId?: number | null;
  institution?: {
    id: number;
    displayName: string;
  } | null;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: 'Bearer' | string;
  user: AuthenticatedUser;
}

export interface PasswordResetResponse {
  message: string;
  developmentToken: string | null;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ApiErrorResponse {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  fieldErrors?: Record<string, string> | null;
}
