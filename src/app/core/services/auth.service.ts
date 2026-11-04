import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiErrorResponse,
  AuthenticatedUser,
  AuthResponse,
  LoginRequest,
  PasswordResetResponse,
  RegisterRequest,
  ResetPasswordRequest,
  UserRole,
} from '../models/auth.models';

const TOKEN_KEY = 'wayrapass.auth.token';
const USER_KEY = 'wayrapass.auth.user';
const STUDENT_INSTITUTION_PREFIX = 'wayrapass.student.institution.';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;
  private readonly _token = signal(this.readStoredValue(TOKEN_KEY));
  private readonly _user = signal(this.readStoredUser());
  private sessionValidated = false;

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this._token() && this._user()));

  login(request: LoginRequest): Observable<AuthenticatedUser> {
    const { rememberMe, ...credentials } = request;
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap((response) => this.storeSession(response, rememberMe)),
      map((response) => response.user),
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, request).pipe(
      tap(() => {
        if (request.role === 'STUDENT' && request.institutionId) {
          localStorageSafe()?.setItem(this.studentInstitutionKey(request.email), String(request.institutionId));
        }
      }),
    );
  }

  preferredStudentInstitutionId(): number | null {
    const user = this._user();
    if (user?.institutionId && user.institutionId > 0) return user.institutionId;
    const email = user?.email;
    if (!email) return null;
    const raw = localStorageSafe()?.getItem(this.studentInstitutionKey(email));
    const id = raw ? Number(raw) : Number.NaN;
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(`${this.baseUrl}/forgot-password`, { email: email.trim() });
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reset-password`, request);
  }

  currentUser(): Observable<AuthenticatedUser> {
    return this.http.get<AuthenticatedUser>(`${environment.apiUrl}/users/me`).pipe(
      tap((user) => this.updateStoredUser(user)),
    );
  }

  ensureSession(): Observable<boolean> {
    if (!this._token()) return of(false);
    if (this.sessionValidated && this._user()) return of(true);

    return this.currentUser().pipe(
      tap(() => { this.sessionValidated = true; }),
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      }),
    );
  }

  logout(): void {
    for (const storage of [localStorageSafe(), sessionStorageSafe()]) {
      storage?.removeItem(TOKEN_KEY);
      storage?.removeItem(USER_KEY);
    }
    this.sessionValidated = false;
    this._token.set(null);
    this._user.set(null);
  }

  dashboardPath(role: UserRole): string {
    const paths: Record<UserRole, string> = {
      STUDENT: '/student/dashboard',
      FAMILY: '/family/dashboard',
      DRIVER: '/driver/dashboard',
      COORDINATOR: '/coordinator/dashboard',
    };
    return paths[role];
  }

  private storeSession(response: AuthResponse, rememberMe: boolean): void {
    const destination = rememberMe ? localStorageSafe() : sessionStorageSafe();
    const other = rememberMe ? sessionStorageSafe() : localStorageSafe();
    other?.removeItem(TOKEN_KEY);
    other?.removeItem(USER_KEY);
    destination?.setItem(TOKEN_KEY, response.token);
    destination?.setItem(USER_KEY, JSON.stringify(response.user));
    this._token.set(response.token);
    this._user.set(response.user);
    this.sessionValidated = true;
  }

  private updateStoredUser(user: AuthenticatedUser): void {
    const storage = localStorageSafe()?.getItem(TOKEN_KEY) ? localStorageSafe() : sessionStorageSafe();
    storage?.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private readStoredValue(key: string): string | null {
    return localStorageSafe()?.getItem(key) ?? sessionStorageSafe()?.getItem(key) ?? null;
  }

  private readStoredUser(): AuthenticatedUser | null {
    const raw = this.readStoredValue(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthenticatedUser; } catch { return null; }
  }

  private studentInstitutionKey(email: string): string {
    return `${STUDENT_INSTITUTION_PREFIX}${email.trim().toLowerCase()}`;
  }
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con el backend de WayraPass. Verifica que esté ejecutándose en el puerto 8081.';
    const response = error.error as ApiErrorResponse | string | null;
    if (response && typeof response === 'object') {
      const firstFieldError = response.fieldErrors ? Object.values(response.fieldErrors)[0] : null;
      return firstFieldError ?? response.message ?? `La operación falló con código ${error.status}.`;
    }
    if (typeof response === 'string' && response.trim()) return response;
  }
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}

export function roleLabel(role: UserRole): string {
  return ({ STUDENT: 'Estudiante', FAMILY: 'Familiar', DRIVER: 'Chofer', COORDINATOR: 'Coordinador' } as const)[role];
}

function localStorageSafe(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function sessionStorageSafe(): Storage | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage;
}
