import { computed, Injectable, signal } from '@angular/core';
import { Observable, delay, mergeMap, of, tap, throwError, timer } from 'rxjs';
import {
  AuthenticatedUser,
  AuthMockError,
  LoginRequest,
  MockUser,
  PasswordResetTicket,
  RegisterRequest,
  ResetPasswordRequest,
  UserRole,
} from '../models/auth.models';

const MOCK_DELAY_MS = 450;
const BLOCK_DURATION_MS = 5 * 60 * 1000;
const RESET_LINK_DURATION_MS = 15 * 60 * 1000;
const USERS_KEY = 'wayrapass.mockUsers';
const SESSION_KEY = 'wayrapass.mockSession';
const FAILURES_KEY = 'wayrapass.failedAttempts';
const BLOCKED_UNTIL_KEY = 'wayrapass.blockedUntil';
const RESET_TICKET_KEY = 'wayrapass.resetTicket';

export const DEMO_PASSWORD = 'WayraPass2026!';

export const DEMO_USERS: ReadonlyArray<MockUser> = [
  { id: 'demo-student', fullName: 'Andrea Estudiante', email: 'student@wayrapass.com', password: DEMO_PASSWORD, role: 'STUDENT' },
  { id: 'demo-family', fullName: 'Carlos Familiar', email: 'family@wayrapass.com', password: DEMO_PASSWORD, role: 'FAMILY' },
  { id: 'demo-driver', fullName: 'Luis Chofer', email: 'driver@wayrapass.com', password: DEMO_PASSWORD, role: 'DRIVER' },
  { id: 'demo-coordinator', fullName: 'Mariana Coordinadora', email: 'coordinator@wayrapass.com', password: DEMO_PASSWORD, role: 'COORDINATOR' },
];

/**
 * Servicio temporal para el Sprint de frontend de la US01.
 * No usa HTTP, backend, JWT real ni base de datos. Los datos se guardan
 * localmente solo para demostrar registro, sesión y recuperación.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _users = signal<MockUser[]>(this.loadUsers());
  private readonly _user = signal<AuthenticatedUser | null>(this.loadSession());
  private readonly _failedAttempts = signal(this.readNumber(sessionStorageSafe(), FAILURES_KEY));
  private readonly _blockedUntil = signal(this.readNumber(sessionStorageSafe(), BLOCKED_UNTIL_KEY));
  private readonly _now = signal(Date.now());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly failedAttempts = this._failedAttempts.asReadonly();
  readonly remainingAttempts = computed(() => Math.max(0, 3 - this._failedAttempts()));
  readonly blockedUntil = this._blockedUntil.asReadonly();
  readonly remainingBlockSeconds = computed(() => Math.max(0, Math.ceil((this._blockedUntil() - this._now()) / 1000)));
  readonly isBlocked = computed(() => this.remainingBlockSeconds() > 0);

  constructor() {
    if (typeof window !== 'undefined') {
      window.setInterval(() => this._now.set(Date.now()), 1000);
    }
  }

  login(request: LoginRequest): Observable<AuthenticatedUser> {
    this.clearExpiredBlock();
    if (this.isBlocked()) {
      return this.fail(new AuthMockError('BLOCKED', this.blockedMessage()));
    }

    const email = normalizeEmail(request.email);
    const user = this._users().find((candidate) => candidate.email === email);
    if (!user || user.password !== request.password) {
      return this.failedLogin('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
    }
    if (user.role !== request.role) {
      return this.failedLogin('ROLE_MISMATCH', `Esta cuenta corresponde al rol ${roleLabel(user.role)}, no al rol seleccionado.`);
    }

    const authenticatedUser = this.withoutPassword(user);
    return of(authenticatedUser).pipe(
      delay(MOCK_DELAY_MS),
      tap(() => {
        this.clearFailures();
        this.storeSession(authenticatedUser, request.rememberMe);
      }),
    );
  }

  register(request: RegisterRequest): Observable<AuthenticatedUser> {
    const email = normalizeEmail(request.email);
    if (this._users().some((user) => user.email === email)) {
      return this.fail(new AuthMockError('EMAIL_EXISTS', 'Ya existe una cuenta con ese correo electrónico.'));
    }

    const user: MockUser = {
      id: `local-${Date.now()}`,
      fullName: request.fullName.trim(),
      email,
      password: request.password,
      role: request.role,
    };

    return of(this.withoutPassword(user)).pipe(
      delay(MOCK_DELAY_MS),
      tap(() => this.saveUsers([...this._users(), user])),
    );
  }

  requestPasswordReset(emailValue: string): Observable<PasswordResetTicket> {
    const email = normalizeEmail(emailValue);
    if (!this._users().some((user) => user.email === email)) {
      return this.fail(new AuthMockError('EMAIL_NOT_FOUND', 'No existe una cuenta mock registrada con ese correo.'));
    }

    const ticket: PasswordResetTicket = {
      email,
      token: `mock-reset-${Date.now()}`,
      expiresAt: Date.now() + RESET_LINK_DURATION_MS,
    };
    return of(ticket).pipe(
      delay(MOCK_DELAY_MS),
      tap(() => sessionStorageSafe()?.setItem(RESET_TICKET_KEY, JSON.stringify(ticket))),
    );
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    const ticket = this.readResetTicket();
    const email = normalizeEmail(request.email);
    if (!ticket || ticket.token !== request.token || ticket.email !== email || ticket.expiresAt <= Date.now()) {
      return this.fail(new AuthMockError('INVALID_RESET_LINK', 'El enlace mock no es válido o ya venció. Solicita uno nuevo.'));
    }

    const userIndex = this._users().findIndex((user) => user.email === email);
    if (userIndex < 0) {
      return this.fail(new AuthMockError('EMAIL_NOT_FOUND', 'No existe una cuenta mock registrada con ese correo.'));
    }

    const updatedUsers = this._users().map((user, index) => index === userIndex
      ? { ...user, password: request.newPassword }
      : user);
    return of(void 0).pipe(
      delay(MOCK_DELAY_MS),
      tap(() => {
        this.saveUsers(updatedUsers);
        sessionStorageSafe()?.removeItem(RESET_TICKET_KEY);
      }),
    );
  }

  logout(): void {
    localStorageSafe()?.removeItem(SESSION_KEY);
    sessionStorageSafe()?.removeItem(SESSION_KEY);
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

  private failedLogin(code: 'INVALID_CREDENTIALS' | 'ROLE_MISMATCH', message: string): Observable<never> {
    const attempts = this._failedAttempts() + 1;
    if (attempts >= 3) {
      const blockedUntil = Date.now() + BLOCK_DURATION_MS;
      this._failedAttempts.set(0);
      this._blockedUntil.set(blockedUntil);
      sessionStorageSafe()?.setItem(FAILURES_KEY, '0');
      sessionStorageSafe()?.setItem(BLOCKED_UNTIL_KEY, String(blockedUntil));
      return this.fail(new AuthMockError('BLOCKED', 'Alcanzaste 3 intentos fallidos. El acceso queda bloqueado durante 5 minutos.'));
    }

    this._failedAttempts.set(attempts);
    sessionStorageSafe()?.setItem(FAILURES_KEY, String(attempts));
    return this.fail(new AuthMockError(code, `${message} Te quedan ${3 - attempts} intentos antes del bloqueo.`));
  }

  private storeSession(user: AuthenticatedUser, rememberMe: boolean): void {
    const destination = rememberMe ? localStorageSafe() : sessionStorageSafe();
    const other = rememberMe ? sessionStorageSafe() : localStorageSafe();
    other?.removeItem(SESSION_KEY);
    destination?.setItem(SESSION_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private loadSession(): AuthenticatedUser | null {
    const raw = localStorageSafe()?.getItem(SESSION_KEY) ?? sessionStorageSafe()?.getItem(SESSION_KEY) ?? null;
    return parseJson<AuthenticatedUser>(raw);
  }

  private loadUsers(): MockUser[] {
    const stored = parseJson<MockUser[]>(localStorageSafe()?.getItem(USERS_KEY) ?? null);
    if (Array.isArray(stored) && stored.length) return stored;
    return DEMO_USERS.map((user) => ({ ...user }));
  }

  private saveUsers(users: MockUser[]): void {
    this._users.set(users);
    localStorageSafe()?.setItem(USERS_KEY, JSON.stringify(users));
  }

  private readResetTicket(): PasswordResetTicket | null {
    return parseJson<PasswordResetTicket>(sessionStorageSafe()?.getItem(RESET_TICKET_KEY) ?? null);
  }

  private clearExpiredBlock(): void {
    if (this._blockedUntil() > 0 && this._blockedUntil() <= Date.now()) this.clearFailures();
  }

  private clearFailures(): void {
    this._failedAttempts.set(0);
    this._blockedUntil.set(0);
    sessionStorageSafe()?.removeItem(FAILURES_KEY);
    sessionStorageSafe()?.removeItem(BLOCKED_UNTIL_KEY);
  }

  private blockedMessage(): string {
    return `Acceso bloqueado temporalmente. Intenta de nuevo en ${formatDuration(this.remainingBlockSeconds())}.`;
  }

  private withoutPassword(user: MockUser): AuthenticatedUser {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  private readNumber(storage: Storage | null, key: string): number {
    const value = Number(storage?.getItem(key) ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  private fail<T>(error: AuthMockError): Observable<T> {
    return timer(MOCK_DELAY_MS).pipe(mergeMap(() => throwError(() => error)));
  }
}

export function authErrorMessage(error: unknown): string {
  return error instanceof AuthMockError ? error.message : 'No se pudo completar la simulación. Inténtalo de nuevo.';
}

export function roleLabel(role: UserRole): string {
  return ({ STUDENT: 'Estudiante', FAMILY: 'Familiar', DRIVER: 'Chofer', COORDINATOR: 'Coordinador' } as const)[role];
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.max(0, totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function localStorageSafe(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function sessionStorageSafe(): Storage | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage;
}
