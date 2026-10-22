export type UserRole = 'STUDENT' | 'FAMILY' | 'DRIVER' | 'COORDINATOR';
export type SelfRegistrationRole = 'STUDENT' | 'FAMILY';

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Ajusta esta interfaz si el DTO del backend usa otro formato.
 * Este kit manda fullName, email, password y role al endpoint de registro.
 */
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: SelfRegistrationRole;
}

export interface AuthenticatedUser {
  id?: number | string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
