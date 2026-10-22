import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, switchMap, tap, throwError } from 'rxjs';
import {
  AuthenticatedUser,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UserRole,
} from '../models/auth.models';

const API = {
  login: '/api/auth/login',
  register: '/api/auth/register',
  me: '/api/users/me',
  requestPasswordReset: '/api/auth/forgot-password',
  resetPassword: '/api/auth/reset-password',
} as const;

const TOKEN_KEY = 'wayrapass.accessToken';
const USER_KEY = 'wayrapass.currentUser';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _token = signal<string | null>(this.readStoredToken());
  private readonly _user = signal<AuthenticatedUser | null>(this.readStoredUser());
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this._token()));

  /** Login -> guarda el JWT -> consulta la identidad real en /api/users/me. */
  login(credentials: LoginRequest): Observable<AuthenticatedUser> {
    return this.http.post<unknown>(API.login, {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    }).pipe(
      map((body) => this.extractToken(body)),
      tap((token) => this.storeToken(token)),
      switchMap(() => this.http.get<unknown>(API.me)),
      map((body) => this.normalizeUser(body)),
      tap((user) => this.storeUser(user)),
      catchError((error: unknown) => {
        // Si falla login o /me, no dejar un token parcial en la sesión.
        this.logout();
        return throwError(() => error);
      }),
    );
  }

  /**
   * El registro público está limitado a STUDENT y FAMILY según la US01.
   * El formato del DTO (fullName/email/password/role) debe contrastarse
   * con el Request DTO real del AuthController antes de la integración final.
   */
  register(request: RegisterRequest): Observable<unknown> {
    return this.http.post<unknown>(API.register, {
      fullName: request.fullName.trim(),
      email: request.email.trim().toLowerCase(),
      password: request.password,
      role: request.role,
    });
  }

  requestPasswordReset(email: string): Observable<unknown> {
    return this.http.post<unknown>(API.requestPasswordReset, {
      email: email.trim().toLowerCase(),
    });
  }

  resetPassword(request: ResetPasswordRequest): Observable<unknown> {
    return this.http.post<unknown>(API.resetPassword, request);
  }

  logout(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
    this._token.set(null);
    this._user.set(null);
  }

  private readStoredToken(): string | null {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(TOKEN_KEY);
  }

  private readToken(): string | null {
    return this._token();
  }

  private readStoredUser(): AuthenticatedUser | null {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthenticatedUser;
    } catch {
      sessionStorage.removeItem(USER_KEY);
      return null;
    }
  }

  private storeToken(token: string): void {
    this._token.set(token);
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(TOKEN_KEY, token);
  }

  private storeUser(user: AuthenticatedUser): void {
    this._user.set(user);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  private extractToken(body: unknown): string {
    const root = this.asRecord(body);
    const data = this.asRecord(root['data']);
    const nested = this.asRecord(root['result']);
    const candidates = [root, data, nested];

    for (const candidate of candidates) {
      const token = candidate['accessToken'] ?? candidate['access_token'] ?? candidate['token'] ?? candidate['jwt'];
      if (typeof token === 'string' && token.trim()) return token;
    }

    throw new Error(
      'La respuesta de login no contiene accessToken/token/jwt. Revisa el DTO de respuesta del backend y adapta extractToken().',
    );
  }

  private normalizeUser(body: unknown): AuthenticatedUser {
    const root = this.asRecord(body);
    const data = this.asRecord(root['data']);
    const nestedUser = this.asRecord(root['user']);
    const candidate = Object.keys(nestedUser).length
      ? nestedUser
      : Object.keys(data).length
        ? (Object.keys(this.asRecord(data['user'])).length ? this.asRecord(data['user']) : data)
        : root;

    const rawRole = candidate['role'] ?? candidate['userRole'] ??
      (Array.isArray(candidate['roles']) ? candidate['roles'][0] : undefined);
    const role = this.normalizeRole(rawRole);
    if (!role) {
      throw new Error('El perfil del backend no incluye un rol reconocido. Revisa GET /api/users/me.');
    }

    const email = String(candidate['email'] ?? '');
    if (!email) throw new Error('GET /api/users/me no devolvió el correo del usuario.');

    return {
      id: typeof candidate['id'] === 'number' || typeof candidate['id'] === 'string'
        ? candidate['id'] : undefined,
      email,
      fullName: String(candidate['fullName'] ?? candidate['name'] ?? candidate['firstName'] ?? email),
      role,
    };
  }

  private normalizeRole(value: unknown): UserRole | null {
    if (typeof value !== 'string') return null;
    const role = value.toUpperCase().replace(/^ROLE_/, '').trim();
    const aliases: Record<string, UserRole> = {
      STUDENT: 'STUDENT', ALUMNO: 'STUDENT', ESTUDIANTE: 'STUDENT',
      FAMILY: 'FAMILY', FAMILIAR: 'FAMILY', PARENT: 'FAMILY', APODERADO: 'FAMILY',
      DRIVER: 'DRIVER', CHOFER: 'DRIVER', CONDUCTOR: 'DRIVER',
      COORDINATOR: 'COORDINATOR', COORDINADOR: 'COORDINATOR',
    };
    return aliases[role] ?? null;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object'
      ? value as Record<string, unknown>
      : {};
  }
}

/** Extractor reutilizable para mostrar mensajes del backend sin filtrar detalles internos. */
export function authErrorMessage(error: unknown, action: 'login' | 'register' | 'recovery' | 'reset'): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: unknown; error?: unknown } | null;
    const serverMessage = typeof body?.message === 'string'
      ? body.message
      : typeof body?.error === 'string' ? body.error : '';

    if (serverMessage) return serverMessage;
    if (error.status === 0) return 'No se pudo conectar con WayraPass. Comprueba que el backend esté ejecutándose.';
    if (error.status === 401) return 'Correo o contraseña incorrectos.';
    if (error.status === 423 || error.status === 429) {
      return 'Se ha limitado temporalmente el acceso. Espera 5 minutos antes de volver a intentarlo.';
    }
    if (error.status === 409) return 'Ya existe una cuenta con ese correo electrónico.';
  }

  if (error instanceof Error && error.message) return error.message;
  const defaults = {
    login: 'No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo.',
    register: 'No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.',
    recovery: 'No se pudo solicitar la recuperación de contraseña.',
    reset: 'No se pudo actualizar la contraseña.',
  };
  return defaults[action];
}
